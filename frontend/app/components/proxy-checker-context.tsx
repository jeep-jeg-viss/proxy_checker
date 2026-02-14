"use client";

import { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";

// ── Types ───────────────────────────────────────────────────────────────────
export interface ProxyResult {
    id: string;
    proxyIp: string;
    proxyPort: string;
    user: string;
    password: string;
    status: "OK" | "FAIL";
    exitIp: string;
    responseTimeMs: number | null;
    error: string;
    country?: string;
    countryCode?: string;
    city?: string;
}

export interface Stats {
    total: number;
    alive: number;
    dead: number;
    avgLatency: number | null;
    countries?: Record<string, number>;
}

export interface Config {
    checkUrl: string;
    timeout: string;
    maxWorkers: string;
    proxyType: string;
    delimiter: string;
    fieldOrder: string;
}

export interface SessionSummary {
    id: string;
    name: string;
    tags: string[];
    created_at: string;
    stats: Stats;
}

export interface SessionDetail extends SessionSummary {
    config: Record<string, unknown>;
    results: ProxyResult[];
}

export type ViewName = "overview" | "history" | "session-detail";
type RunStatus = "idle" | "running" | "done";

export type ValidationSeverity = "error" | "warning" | "tip";

export interface ValidationIssue {
    severity: ValidationSeverity;
    message: string;
}

export type ValidationField = "proxyText" | "checkUrl" | "timeout" | "maxWorkers" | "fieldOrder" | "sessionName";
export type ValidationState = Record<ValidationField, ValidationIssue[]>;

interface ProxyCheckerState {
    // Proxy input
    proxyText: string;
    setProxyText: (t: string) => void;

    // Config
    config: Config;
    updateConfig: (key: keyof Config, value: string) => void;

    // Session metadata
    sessionName: string;
    setSessionName: (n: string) => void;
    sessionTags: string;
    setSessionTags: (t: string) => void;

    // Validation
    validation: ValidationState;
    touched: Record<string, boolean>;
    touch: (field: ValidationField) => void;
    touchAll: () => void;
    canRun: boolean;
    errorCount: number;
    warningCount: number;
    tipCount: number;

    // Run
    status: RunStatus;
    results: ProxyResult[];
    stats: Stats;
    progress: { completed: number; total: number };
    elapsedSeconds: number;
    startRun: () => void;
    stopRun: () => void;

    // Navigation
    currentView: ViewName;
    setCurrentView: (v: ViewName) => void;

    // Sessions history
    sessions: SessionSummary[];
    sessionsLoading: boolean;
    sessionsError: string | null;
    fetchSessions: () => Promise<void>;
    selectedSession: SessionDetail | null;
    loadSession: (id: string) => Promise<void>;
    deleteSession: (id: string) => Promise<void>;
}

const DEFAULT_CONFIG: Config = {
    checkUrl: "https://httpbin.org/ip",
    timeout: "10",
    maxWorkers: "20",
    proxyType: "http",
    delimiter: ":",
    fieldOrder: "ip:port:user:pass",
};

const DEFAULT_STATS: Stats = { total: 0, alive: 0, dead: 0, avgLatency: null };

// ── Context ─────────────────────────────────────────────────────────────────
const Ctx = createContext<ProxyCheckerState | null>(null);

export function useProxyChecker() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useProxyChecker must be inside ProxyCheckerProvider");
    return ctx;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function mapResult(parsed: Record<string, unknown>): ProxyResult {
    return {
        id: parsed.id as string,
        proxyIp: parsed.proxy_ip as string,
        proxyPort: parsed.proxy_port as string,
        user: parsed.user as string,
        password: (parsed.password as string) || (parsed.pass as string) || "",
        status: parsed.status as "OK" | "FAIL",
        exitIp: parsed.exit_ip as string,
        responseTimeMs: parsed.response_time_ms as number | null,
        error: parsed.error as string,
        country: (parsed.country as string) || "",
        countryCode: (parsed.country_code as string) || "",
        city: (parsed.city as string) || "",
    };
}

// ── Provider ────────────────────────────────────────────────────────────────
export function ProxyCheckerProvider({ children }: { children: ReactNode }) {
    const { getAccessTokenSilently } = useAuth0();
    const [proxyText, setProxyText] = useState("");
    const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
    const [status, setStatus] = useState<RunStatus>("idle");
    const [results, setResults] = useState<ProxyResult[]>([]);
    const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
    const [progress, setProgress] = useState({ completed: 0, total: 0 });
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Session metadata
    const [sessionName, setSessionName] = useState("");
    const [sessionTags, setSessionTags] = useState("");

    // Navigation
    const [currentView, setCurrentView] = useState<ViewName>("overview");

    // History
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [sessionsError, setSessionsError] = useState<string | null>(null);
    const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
    const sessionsFetchCountRef = useRef(0);

    const abortRef = useRef<AbortController | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const updateConfig = useCallback((key: keyof Config, value: string) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    }, []);

    const getAuthHeaders = useCallback(
        async (includeJson: boolean = false): Promise<Record<string, string>> => {
            const token = await getAccessTokenSilently({
                authorizationParams: {
                    audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
                    scope: process.env.NEXT_PUBLIC_AUTH0_SCOPE ?? "openid profile email",
                },
            });

            if (includeJson) {
                return {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                };
            }

            return { Authorization: `Bearer ${token}` };
        },
        [getAccessTokenSilently]
    );

    // ── Validation ──────────────────────────────────────────────────────
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const touch = useCallback((field: ValidationField) => {
        setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
    }, []);

    const touchAll = useCallback(() => {
        setTouched({ proxyText: true, checkUrl: true, timeout: true, maxWorkers: true, fieldOrder: true, sessionName: true });
    }, []);

    const validation: ValidationState = useMemo(() => {
        const v: ValidationState = { proxyText: [], checkUrl: [], timeout: [], maxWorkers: [], fieldOrder: [], sessionName: [] };

        const IP_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
        const HOSTNAME_RE = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;

        // ── Proxy text ────────────────────────────────────────────────
        const trimmed = proxyText.trim();
        if (!trimmed) {
            v.proxyText.push({ severity: "error", message: "At least one proxy is required" });
        } else {
            const allLines = proxyText.split("\n");
            const fieldOrder = config.fieldOrder.split(":");
            const ipIdx = fieldOrder.indexOf("ip");
            const portIdx = fieldOrder.indexOf("port");
            const userIdx = fieldOrder.indexOf("user");
            const passIdx = fieldOrder.indexOf("pass");
            const badLines: number[] = [];
            const seen = new Map<string, number>();
            const dupLines: number[] = [];
            let validCount = 0;

            allLines.forEach((raw, i) => {
                const line = raw.trim();
                if (!line || line.startsWith("#")) return;

                const parts = line.split(config.delimiter);
                const minParts = Math.max((ipIdx >= 0 ? ipIdx : 0), (portIdx >= 0 ? portIdx : 1)) + 1;

                if (parts.length < minParts) {
                    badLines.push(i + 1);
                    return;
                }

                const ipVal = ipIdx >= 0 && ipIdx < parts.length ? parts[ipIdx].trim() : "";
                const portVal = portIdx >= 0 && portIdx < parts.length ? parts[portIdx].trim() : "";
                const portNum = parseInt(portVal, 10);

                if ((!IP_RE.test(ipVal) && !HOSTNAME_RE.test(ipVal)) || !ipVal) {
                    badLines.push(i + 1);
                    return;
                }
                if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
                    badLines.push(i + 1);
                    return;
                }

                validCount++;
                const userVal = userIdx >= 0 && userIdx < parts.length ? parts[userIdx].trim() : "";
                const passVal = passIdx >= 0 && passIdx < parts.length ? parts[passIdx].trim() : "";
                // Include auth fields in the dedupe key when present in the chosen format.
                // This avoids treating ip:port:user:pass entries as duplicates by ip:port alone.
                const keyParts = [`${ipVal}`.toLowerCase(), portVal];
                if (userIdx >= 0 || passIdx >= 0) {
                    keyParts.push(userVal, passVal);
                }
                const key = keyParts.join("|");
                if (seen.has(key)) {
                    dupLines.push(i + 1);
                } else {
                    seen.set(key, i + 1);
                }
            });

            if (validCount === 0 && badLines.length > 0) {
                v.proxyText.push({ severity: "error", message: "No valid proxy lines found — check your format" });
            }

            if (badLines.length > 0 && validCount > 0) {
                if (badLines.length <= 5) {
                    v.proxyText.push({ severity: "warning", message: `Invalid format on line${badLines.length > 1 ? "s" : ""} ${badLines.join(", ")}` });
                } else {
                    v.proxyText.push({ severity: "warning", message: `Invalid format on ${badLines.length} lines (${badLines.slice(0, 3).join(", ")}…)` });
                }
            }

            if (dupLines.length > 0) {
                v.proxyText.push({
                    severity: "warning",
                    message: `${dupLines.length} duplicate prox${dupLines.length > 1 ? "ies" : "y"} found`,
                });
            }
        }

        // ── Check URL ─────────────────────────────────────────────────
        const url = config.checkUrl.trim();
        if (!url) {
            v.checkUrl.push({ severity: "error", message: "A valid test URL is required" });
        } else {
            try {
                const parsed = new URL(url);
                if (!parsed.protocol.startsWith("http")) {
                    v.checkUrl.push({ severity: "error", message: "A valid test URL is required (http:// or https://)" });
                }
            } catch {
                v.checkUrl.push({ severity: "error", message: "A valid test URL is required" });
            }
        }

        // ── Timeout ───────────────────────────────────────────────────
        const timeout = parseInt(config.timeout, 10);
        if (isNaN(timeout) || config.timeout.trim() === "") {
            v.timeout.push({ severity: "error", message: "Timeout must be a number between 1 and 60" });
        } else if (timeout < 1 || timeout > 60) {
            v.timeout.push({ severity: "error", message: "Timeout must be a number between 1 and 60" });
        }

        // ── Max workers ───────────────────────────────────────────────
        const workers = parseInt(config.maxWorkers, 10);
        if (isNaN(workers) || config.maxWorkers.trim() === "") {
            v.maxWorkers.push({ severity: "error", message: "Workers must be between 1 and 200" });
        } else if (workers < 1 || workers > 200) {
            v.maxWorkers.push({ severity: "error", message: "Workers must be between 1 and 200" });
        } else {
            // Count valid proxy lines for tip
            const proxyLines = proxyText.trim().split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).length;
            if (proxyLines > 0 && workers > proxyLines) {
                v.maxWorkers.push({ severity: "warning", message: `More workers (${workers}) than proxies (${proxyLines}) — some will idle` });
            }
            if (workers > 50) {
                v.maxWorkers.push({ severity: "tip", message: "Try reducing workers to ≤50 for better stability" });
            }
        }

        // ── Field order / delimiter mismatch ──────────────────────────
        if (trimmed) {
            const sampleLines = proxyText.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).slice(0, 10);
            const fieldCount = config.fieldOrder.split(":").length;
            const mismatchCount = sampleLines.filter((line) => {
                const parts = line.trim().split(config.delimiter);
                return parts.length < fieldCount;
            }).length;
            if (sampleLines.length > 0 && mismatchCount > sampleLines.length * 0.5) {
                v.fieldOrder.push({ severity: "warning", message: `Delimiter mismatch: most lines don't match '${config.fieldOrder}' with delimiter '${config.delimiter}'` });
            }
        }

        // ── Session name ──────────────────────────────────────────────
        if (sessionName.length > 60) {
            v.sessionName.push({ severity: "error", message: "Max 60 characters" });
        }

        return v;
    }, [proxyText, config.checkUrl, config.timeout, config.maxWorkers, config.delimiter, config.fieldOrder, sessionName]);

    // canRun = NO critical errors across all fields
    const hasErrors = (field: ValidationField) => validation[field].some((i) => i.severity === "error");
    const canRun = !Object.keys(validation).some((f) => hasErrors(f as ValidationField));

    const errorCount = Object.values(validation).flat().filter((i) => i.severity === "error").length;
    const warningCount = Object.values(validation).flat().filter((i) => i.severity === "warning").length;
    const tipCount = Object.values(validation).flat().filter((i) => i.severity === "tip").length;

    const stopRun = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setStatus("done");
    }, []);

    // ── Fetch sessions list ─────────────────────────────────────────────
    const fetchSessions = useCallback(async () => {
        sessionsFetchCountRef.current += 1;
        setSessionsLoading(true);
        setSessionsError(null);

        try {
            const headers = await getAuthHeaders();
            const res = await fetch("/api/sessions", { headers });
            if (res.ok) {
                const data = await res.json();
                setSessions(
                    data.map((s: Record<string, unknown>) => ({
                        id: s.id,
                        name: s.name,
                        tags: s.tags,
                        created_at: s.created_at,
                        stats: {
                            total: (s.stats as Record<string, unknown>).total,
                            alive: (s.stats as Record<string, unknown>).alive,
                            dead: (s.stats as Record<string, unknown>).dead,
                            avgLatency: (s.stats as Record<string, unknown>).avg_latency,
                            countries: (s.stats as Record<string, unknown>).countries as Record<string, number> | undefined,
                        },
                    }))
                );
            } else {
                setSessionsError(`Failed to fetch sessions (${res.status})`);
            }
        } catch (err) {
            console.error("Failed to fetch sessions:", err);
            setSessionsError("Failed to fetch sessions");
        } finally {
            sessionsFetchCountRef.current = Math.max(0, sessionsFetchCountRef.current - 1);
            if (sessionsFetchCountRef.current === 0) {
                setSessionsLoading(false);
            }
        }
    }, [getAuthHeaders]);

    // ── Load a single session detail ────────────────────────────────────
    const loadSession = useCallback(async (id: string) => {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`/api/sessions/${id}`, { headers });
            if (res.ok) {
                const s = await res.json();
                setSelectedSession({
                    id: s.id,
                    name: s.name,
                    tags: s.tags,
                    created_at: s.created_at,
                    config: s.config,
                    stats: {
                        total: s.stats.total,
                        alive: s.stats.alive,
                        dead: s.stats.dead,
                        avgLatency: s.stats.avg_latency,
                        countries: s.stats.countries,
                    },
                    results: s.results.map(mapResult),
                });
                setCurrentView("session-detail");
            }
        } catch (err) {
            console.error("Failed to load session:", err);
        }
    }, [getAuthHeaders]);

    // ── Delete session ──────────────────────────────────────────────────
    const deleteSession = useCallback(async (id: string) => {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`/api/sessions/${id}`, { method: "DELETE", headers });
            if (res.ok) {
                setSessions((prev) => prev.filter((s) => s.id !== id));
                if (selectedSession?.id === id) {
                    setSelectedSession(null);
                    setCurrentView("history");
                }
            }
        } catch (err) {
            console.error("Failed to delete session:", err);
        }
    }, [getAuthHeaders, selectedSession]);

    // ── Start check run ─────────────────────────────────────────────────
    const startRun = useCallback(async () => {
        setResults([]);
        setStats(DEFAULT_STATS);
        setProgress({ completed: 0, total: 0 });
        setElapsedSeconds(0);
        setStatus("running");

        const startTime = Date.now();
        timerRef.current = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        const abortController = new AbortController();
        abortRef.current = abortController;

        const tags = sessionTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);

        try {
            const headers = await getAuthHeaders(true);
            const res = await fetch("/api/check", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    proxies: proxyText,
                    session_name: sessionName,
                    tags,
                    check_url: config.checkUrl,
                    timeout: parseInt(config.timeout, 10) || 10,
                    max_workers: parseInt(config.maxWorkers, 10) || 20,
                    proxy_type: config.proxyType,
                    delimiter: config.delimiter,
                    field_order: config.fieldOrder,
                }),
                signal: abortController.signal,
            });

            if (!res.ok || !res.body) {
                throw new Error(`Server error: ${res.status}`);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                const parts = buffer.split("\n\n");
                buffer = parts.pop() || "";

                for (const part of parts) {
                    const lines = part.split("\n");
                    let eventType = "";
                    let eventData = "";

                    for (const line of lines) {
                        if (line.startsWith("event: ")) {
                            eventType = line.slice(7);
                        } else if (line.startsWith("data: ")) {
                            eventData = line.slice(6);
                        }
                    }

                    if (!eventType || !eventData) continue;
                    const parsed = JSON.parse(eventData);

                    if (eventType === "start") {
                        setProgress({ completed: 0, total: parsed.total });
                    } else if (eventType === "result") {
                        const result = mapResult(parsed);
                        setResults((prev) => [...prev, result]);
                        if (parsed._progress) {
                            setProgress({
                                completed: parsed._progress.completed,
                                total: parsed._progress.total,
                            });
                        }
                    } else if (eventType === "geo") {
                        // Update results with country info
                        const geoMap = parsed as Record<string, { country: string; countryCode: string; city: string }>;
                        setResults((prev) =>
                            prev.map((r) => {
                                const geo = geoMap[r.id];
                                if (geo) {
                                    return {
                                        ...r,
                                        country: geo.country,
                                        countryCode: geo.countryCode,
                                        city: geo.city,
                                    };
                                }
                                return r;
                            })
                        );
                    } else if (eventType === "done") {
                        setStats({
                            total: parsed.total,
                            alive: parsed.alive,
                            dead: parsed.dead,
                            avgLatency: parsed.avg_latency,
                            countries: parsed.countries,
                        });
                        // Refresh sessions list since a new one was just created
                        fetchSessions();
                    }
                }
            }
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "AbortError") {
                // User cancelled
            } else {
                console.error("Check failed:", err);
            }
        } finally {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            abortRef.current = null;
            setStatus((s) => (s === "running" ? "done" : s));
        }
    }, [proxyText, config, sessionName, sessionTags, fetchSessions, getAuthHeaders]);

    // Fetch sessions on mount
    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    return (
        <Ctx.Provider
            value={{
                proxyText,
                setProxyText,
                config,
                updateConfig,
                sessionName,
                setSessionName,
                sessionTags,
                setSessionTags,
                validation,
                touched,
                touch,
                touchAll,
                canRun,
                errorCount,
                warningCount,
                tipCount,
                status,
                results,
                stats,
                progress,
                elapsedSeconds,
                startRun,
                stopRun,
                currentView,
                setCurrentView,
                sessions,
                sessionsLoading,
                sessionsError,
                fetchSessions,
                selectedSession,
                loadSession,
                deleteSession,
            }}
        >
            {children}
        </Ctx.Provider>
    );
}
