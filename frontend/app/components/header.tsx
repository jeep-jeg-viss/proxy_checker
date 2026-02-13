"use client";

import { useProxyChecker } from "./proxy-checker-context";

export function Header() {
    const { currentView, selectedSession, setCurrentView } = useProxyChecker();

    const viewLabel = currentView === "overview"
        ? "Overview"
        : currentView === "history"
            ? "History"
            : selectedSession?.name || "Session";

    return (
        <header
            style={{
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 20px",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                    style={{
                        fontSize: 13,
                        color: "var(--text-2)",
                        cursor: "pointer",
                    }}
                    onClick={() => setCurrentView("overview")}
                >
                    Proxy Checker
                </span>
                <span style={{ fontSize: 13, color: "var(--text-3)" }}>/</span>
                {currentView === "session-detail" ? (
                    <>
                        <span
                            style={{ fontSize: 13, color: "var(--text-2)", cursor: "pointer" }}
                            onClick={() => setCurrentView("history")}
                        >
                            History
                        </span>
                        <span style={{ fontSize: 13, color: "var(--text-3)" }}>/</span>
                        <span style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 500 }}>
                            {viewLabel}
                        </span>
                    </>
                ) : (
                    <span style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 500 }}>
                        {viewLabel}
                    </span>
                )}
            </div>
        </header>
    );
}
