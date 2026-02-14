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
    const { status, startRun, stopRun, progress, elapsedSeconds, canRun, touchAll, touched, validation } = useProxyChecker();
    const isRunning = status === "running";
    const progressPct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

    // Calculate visible counts based on touched fields
    const visibleIssues = Object.entries(validation).flatMap(([field, issues]) =>
        touched[field] ? issues : []
    );
    const visibleErrorCount = visibleIssues.filter(i => i.severity === "error").length;
    const visibleWarningCount = visibleIssues.filter(i => i.severity === "warning").length;
    const visibleTipCount = visibleIssues.filter(i => i.severity === "tip").length;

    // Button looks disabled only if there are VISIBLE blocking errors
    const isVisiblyBlocked = visibleErrorCount > 0;

    const handlePress = () => {
        if (isRunning) {
            stopRun();
        } else {
            // Touch all fields to reveal any hidden errors
            touchAll();
            if (!canRun) return;
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
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        padding: "6px 14px",
                        borderRadius: "var(--radius)",
                        background: isRunning
                            ? "var(--red-muted)"
                            : isVisiblyBlocked
                                ? "var(--bg-2)"
                                : "var(--accent)",
                        color: isRunning
                            ? "var(--red)"
                            : isVisiblyBlocked
                                ? "var(--text-2)"
                                : "#fff",
                        border: isRunning ? "1px solid rgba(217,83,79,0.25)" : "none",
                        cursor: "pointer",
                        transition: "background 80ms, color 80ms, border-color 80ms, opacity 80ms",
                        opacity: !isRunning && isVisiblyBlocked ? 0.7 : 1,
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

                {/* Validation summary badges when not running */}
                {!isRunning && (visibleErrorCount > 0 || visibleWarningCount > 0 || visibleTipCount > 0) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {visibleErrorCount > 0 && (
                            <span style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 500,
                                color: "var(--red)",
                                background: "var(--red-muted)",
                                padding: "2px 8px",
                                borderRadius: 10,
                            }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                                {visibleErrorCount} {visibleErrorCount === 1 ? "error" : "errors"}
                            </span>
                        )}
                        {visibleWarningCount > 0 && (
                            <span style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 500,
                                color: "var(--orange)",
                                background: "var(--orange-muted)",
                                padding: "2px 8px",
                                borderRadius: 10,
                            }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                {visibleWarningCount} {visibleWarningCount === 1 ? "warning" : "warnings"}
                            </span>
                        )}
                        {visibleTipCount > 0 && (
                            <span style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 500,
                                color: "var(--accent)",
                                background: "var(--accent-muted)",
                                padding: "2px 8px",
                                borderRadius: 10,
                            }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                                </svg>
                                {visibleTipCount} {visibleTipCount === 1 ? "tip" : "tips"}
                            </span>
                        )}
                    </div>
                )}

                {isRunning && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                            className="run-spinner"
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
