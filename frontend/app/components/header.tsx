"use client";

export function Header() {
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
                <span style={{ fontSize: 13, color: "var(--text-2)" }}>Proxy Checker</span>
                <span style={{ fontSize: 13, color: "var(--text-3)" }}>/</span>
                <span style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 500 }}>Overview</span>
            </div>
        </header>
    );
}
