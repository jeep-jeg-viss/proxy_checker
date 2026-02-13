"use client";

import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from "react";

// ── Types ───────────────────────────────────────────────────────────────────
export interface ProxyResult {
    id: string;
    proxyIp: string;
    proxyPort: string;
    user: string;
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
    const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);

    const abortRef = useRef<AbortController | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const updateConfig = useCallback((key: keyof Config, value: string) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    }, []);

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
        try {
            const res = await fetch("/api/sessions");
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
            }
        } catch (err) {
            console.error("Failed to fetch sessions:", err);
        }
    }, []);

    // ── Load a single session detail ────────────────────────────────────
    const loadSession = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/api/sessions/${id}`);
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
    }, []);

    // ── Delete session ──────────────────────────────────────────────────
    const deleteSession = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
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
    }, [selectedSession]);

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
            const res = await fetch("/api/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
    }, [proxyText, config, sessionName, sessionTags, fetchSessions]);

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
