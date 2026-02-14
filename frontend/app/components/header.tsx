"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { LogOut } from "lucide-react";
import { useProxyChecker } from "./proxy-checker-context";
import { Button } from "react-aria-components";
import { UiIcon } from "./ui-icon";

export function Header() {
    const { currentView, selectedSession, setCurrentView } = useProxyChecker();
    const { user, logout } = useAuth0();

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
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "var(--text-1)", fontWeight: 500 }}>
                    {user?.email || user?.name || "Authenticated"}
                </span>
                <Button
                    aria-label="Log out"
                    className="ra-btn logout-btn"
                    onPress={() =>
                        logout({
                            logoutParams: {
                                returnTo:
                                    typeof window !== "undefined"
                                        ? window.location.origin
                                        : "http://localhost:3000",
                            },
                        })
                    }
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--red)",
                        background: "var(--red-muted)",
                        border: "1px solid rgba(217,83,79,0.38)",
                        borderRadius: 999,
                        cursor: "pointer",
                        height: 30,
                        padding: "0 12px",
                    }}
                >
                    <UiIcon icon={LogOut} size={13} strokeWidth={2} />
                    Logout
                </Button>
            </div>
        </header>
    );
}
