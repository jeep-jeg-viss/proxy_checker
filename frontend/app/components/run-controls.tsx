"use client";

import { Button } from "react-aria-components";
import { useProxyChecker } from "./proxy-checker-context";

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

export function RunControls() {
    const { status, startRun, stopRun, progress, elapsedSeconds, proxyText } = useProxyChecker();
    const isRunning = status === "running";
    const hasProxies = proxyText.trim().length > 0;
    const progressPct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

    const handlePress = () => {
        if (isRunning) {
            stopRun();
        } else {
            startRun();
        }
    };

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 0",
                borderTop: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Button
                    id="run-check-btn"
                    aria-label={isRunning ? "Stop" : "Run Check"}
                    onPress={handlePress}
                    isDisabled={!isRunning && !hasProxies}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        padding: "6px 14px",
                        borderRadius: "var(--radius)",
                        background: isRunning ? "var(--red-muted)" : !hasProxies ? "var(--bg-3)" : "var(--accent)",
                        color: isRunning ? "var(--red)" : !hasProxies ? "var(--text-3)" : "#fff",
                        border: isRunning ? "1px solid rgba(217,83,79,0.25)" : "none",
                        cursor: !isRunning && !hasProxies ? "not-allowed" : "pointer",
                        transition: "all 80ms",
                        opacity: !isRunning && !hasProxies ? 0.6 : 1,
                    }}
                >
                    {isRunning ? (
                        <>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                            Stop
                        </>
                    ) : (
                        <>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                            Run Check
                        </>
                    )}
                </Button>

                {isRunning && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                            style={{
                                width: 14,
                                height: 14,
                                border: "1.5px solid var(--bg-3)",
                                borderTopColor: "var(--accent)",
                                borderRadius: "50%",
                                animation: "spin 0.6s linear infinite",
                            }}
                        />
                        <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                            Checking… {progress.completed}/{progress.total}
                        </span>
                    </div>
                )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {isRunning && progress.total > 0 && (
                    <div style={{ width: 80, height: 3, background: "var(--bg-3)", borderRadius: 2, overflow: "hidden", position: "relative" }}>
                        <div
                            style={{
                                position: "absolute",
                                width: `${progressPct}%`,
                                height: "100%",
                                background: "var(--accent)",
                                borderRadius: 2,
                                transition: "width 200ms ease-out",
                            }}
                        />
                    </div>
                )}
                <span style={{ fontSize: 12, fontFamily: "var(--font-mono), monospace", fontVariantNumeric: "tabular-nums", color: "var(--text-2)" }}>
                    {formatTime(elapsedSeconds)}
                </span>
            </div>
        </div>
    );
}
