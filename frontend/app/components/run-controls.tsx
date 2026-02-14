"use client";

import { AlertTriangle, CircleX, Info, Play, Square } from "lucide-react";
import { Button } from "react-aria-components";
import { useProxyChecker } from "./proxy-checker-context";
import { UiIcon } from "./ui-icon";

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
                                ? "var(--btn-surface)"
                                : "var(--accent)",
                        color: isRunning
                            ? "var(--red)"
                            : isVisiblyBlocked
                                ? "var(--btn-text)"
                                : "#fff",
                        border: isRunning ? "1px solid rgba(217,83,79,0.25)" : "none",
                        cursor: "pointer",
                        transition: "background 80ms, color 80ms, border-color 80ms, opacity 80ms",
                        opacity: !isRunning && isVisiblyBlocked ? 0.7 : 1,
                    }}
                >
                    {isRunning ? (
                        <>
                            <UiIcon icon={Square} size={11} strokeWidth={2.2} />
                            Stop
                        </>
                    ) : (
                        <>
                            <UiIcon icon={Play} size={11} strokeWidth={2.2} />
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
                                <UiIcon icon={CircleX} size={10} strokeWidth={2} />
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
                                <UiIcon icon={AlertTriangle} size={10} strokeWidth={2} />
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
                                <UiIcon icon={Info} size={10} strokeWidth={2} />
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
