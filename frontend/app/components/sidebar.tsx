"use client";

import { useProxyChecker, type ViewName } from "./proxy-checker-context";

const NAV: { label: string; view: ViewName; iconPath: string }[] = [
    { label: "Overview", view: "overview", iconPath: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
    { label: "History", view: "history", iconPath: "M12 3a9 9 0 1 0 9 9M12 7v5l3 2" },
    { label: "Settings", view: "overview", iconPath: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" },
];

export function Sidebar() {
    const { currentView, setCurrentView, sessions } = useProxyChecker();

    const isActive = (view: ViewName, label: string) => {
        if (label === "History") return currentView === "history" || currentView === "session-detail";
        return currentView === view && label !== "Settings";
    };

    return (
        <aside
            style={{
                width: 232,
                background: "var(--bg-1)",
                borderRight: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                padding: "12px 8px",
                flexShrink: 0,
                userSelect: "none",
            }}
        >
            {/* Workspace */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    marginBottom: 16,
                }}
            >
                <div
                    style={{
                        width: 22,
                        height: 22,
                        borderRadius: 5,
                        background: "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>
                    Proxy Checker
                </span>
            </div>

            {/* Nav */}
            <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {NAV.map((item) => {
                    const active = isActive(item.view, item.label);
                    return (
                        <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                                if (item.label !== "Settings") {
                                    setCurrentView(item.view);
                                }
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "6px 10px",
                                fontSize: 13,
                                fontWeight: active ? 500 : 400,
                                color: active ? "var(--text-1)" : "var(--text-2)",
                                background: active ? "var(--bg-hover)" : "transparent",
                                border: "none",
                                borderRadius: "var(--radius)",
                                cursor: item.label === "Settings" ? "default" : "pointer",
                                width: "100%",
                                textAlign: "left",
                                transition: "background 80ms, color 80ms",
                                opacity: item.label === "Settings" ? 0.5 : 1,
                            }}
                        >
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ flexShrink: 0, opacity: active ? 1 : 0.5 }}
                            >
                                <path d={item.iconPath} />
                                {item.label === "Settings" && <circle cx="12" cy="12" r="3" />}
                            </svg>
                            {item.label}
                            {item.label === "History" && sessions.length > 0 && (
                                <span
                                    style={{
                                        marginLeft: "auto",
                                        fontSize: 11,
                                        fontWeight: 500,
                                        color: active ? "var(--accent)" : "var(--text-3)",
                                        background: active ? "var(--accent-muted)" : "var(--bg-3)",
                                        padding: "1px 6px",
                                        borderRadius: 10,
                                        fontVariantNumeric: "tabular-nums",
                                    }}
                                >
                                    {sessions.length}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            <div style={{ flex: 1 }} />

            <span style={{ padding: "6px 10px", fontSize: 11, color: "var(--text-3)" }}>
                v0.2.0
            </span>
        </aside>
    );
}
