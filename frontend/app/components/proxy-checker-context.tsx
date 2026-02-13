"use client";

import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from "react";

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
}

export interface Stats {
    total: number;
    alive: number;
    dead: number;
    avgLatency: number | null;
}

export interface Config {
    checkUrl: string;
    timeout: string;
    maxWorkers: string;
    proxyType: string;
    delimiter: string;
    fieldOrder: string;
}

type RunStatus = "idle" | "running" | "done";

interface ProxyCheckerState {
    // Proxy input
    proxyText: string;
    setProxyText: (t: string) => void;

    // Config
    config: Config;
    updateConfig: (key: keyof Config, value: string) => void;

    // Run
    status: RunStatus;
    results: ProxyResult[];
    stats: Stats;
    progress: { completed: number; total: number };
    elapsedSeconds: number;
    startRun: () => void;
    stopRun: () => void;
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

// ── Provider ────────────────────────────────────────────────────────────────
export function ProxyCheckerProvider({ children }: { children: ReactNode }) {
    const [proxyText, setProxyText] = useState("");
    const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
    const [status, setStatus] = useState<RunStatus>("idle");
    const [results, setResults] = useState<ProxyResult[]>([]);
    const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
    const [progress, setProgress] = useState({ completed: 0, total: 0 });
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

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

    const startRun = useCallback(async () => {
        // Reset
        setResults([]);
        setStats(DEFAULT_STATS);
        setProgress({ completed: 0, total: 0 });
        setElapsedSeconds(0);
        setStatus("running");

        // Elapsed-time timer
        const startTime = Date.now();
        timerRef.current = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        const abortController = new AbortController();
        abortRef.current = abortController;

        try {
            const res = await fetch("/api/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    proxies: proxyText,
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

                // Parse SSE events from buffer
                const parts = buffer.split("\n\n");
                // Keep partial last part in buffer
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
                        const result: ProxyResult = {
                            id: parsed.id,
                            proxyIp: parsed.proxy_ip,
                            proxyPort: parsed.proxy_port,
                            user: parsed.user,
                            status: parsed.status,
                            exitIp: parsed.exit_ip,
                            responseTimeMs: parsed.response_time_ms,
                            error: parsed.error,
                        };
                        setResults((prev) => [...prev, result]);
                        if (parsed._progress) {
                            setProgress({
                                completed: parsed._progress.completed,
                                total: parsed._progress.total,
                            });
                        }
                    } else if (eventType === "done") {
                        setStats({
                            total: parsed.total,
                            alive: parsed.alive,
                            dead: parsed.dead,
                            avgLatency: parsed.avg_latency,
                        });
                    }
                }
            }
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "AbortError") {
                // User cancelled — that's fine
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
    }, [proxyText, config]);

    return (
        <Ctx.Provider
            value={{
                proxyText,
                setProxyText,
                config,
                updateConfig,
                status,
                results,
                stats,
                progress,
                elapsedSeconds,
                startRun,
                stopRun,
            }}
        >
            {children}
        </Ctx.Provider>
    );
}
