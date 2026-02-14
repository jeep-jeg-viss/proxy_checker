"use client";

import { useProxyChecker } from "./proxy-checker-context";
import { Button } from "react-aria-components";

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
                    style={{ display: "inline-flex", alignItems: "center" }}
                >
                    <Button
                        onPress={() => setCurrentView("overview")}
                        style={{
                            fontSize: 13,
                            color: "var(--text-2)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                        }}
                    >
                        Proxy Checker
                    </Button>
                </span>
                <span style={{ fontSize: 13, color: "var(--text-3)" }}>/</span>
                {currentView === "session-detail" ? (
                    <>
                        <Button
                            onPress={() => setCurrentView("history")}
                            style={{
                                fontSize: 13,
                                color: "var(--text-2)",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                            }}
                        >
                            History
                        </Button>
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
