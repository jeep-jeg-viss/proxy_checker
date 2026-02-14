"use client";

import { useState, useMemo, memo, useCallback } from "react";
import { Button, TextField, Label, Input } from "react-aria-components";
import { useProxyChecker, type ProxyResult } from "./proxy-checker-context";

function getFlagEmoji(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) return "\u{1F30D}";
    const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((c) => 127397 + c.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

const Status = memo(function Status({ value }: { value: "OK" | "FAIL" }) {
    const ok = value === "OK";
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: ok ? "var(--green)" : "var(--red)" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
            {ok ? "Alive" : "Failed"}
        </span>
    );
});

const Latency = memo(function Latency({ ms }: { ms: number | null }) {
    if (ms == null) return <span style={{ color: "var(--text-3)" }}>{"\u2014"}</span>;
    let c = "var(--green)";
    if (ms > 400) c = "var(--orange)";
    if (ms > 800) c = "var(--red)";
    return <span style={{ fontVariantNumeric: "tabular-nums", color: c }}>{ms}<span style={{ color: "var(--text-3)", marginLeft: 1 }}>ms</span></span>;
});

const Stat = memo(function Stat({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "14px 0", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 400 }}>{label}</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 500, color: "var(--text-1)", letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {value}
            </span>
        </div>
    );
});

function downloadCSV(rows: ProxyResult[], filename: string) {
    const headers = ["proxy_ip", "proxy_port", "user", "status", "exit_ip", "response_time_ms", "country", "city", "error"];
    const csvRows = [
        headers.join(","),
        ...rows.map((r) =>
            [
                r.proxyIp,
                r.proxyPort,
                r.user,
                r.status,
                r.exitIp,
                r.responseTimeMs ?? "",
                r.country || "",
                r.city || "",
                `"${(r.error || "").replace(/"/g, '""')}"`,
            ].join(",")
        ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Hoisted stable style objects
const thStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: 11,
    fontWeight: 500,
    color: "var(--text-3)",
    textAlign: "left",
    whiteSpace: "nowrap",
    borderBottom: "1px solid var(--border)",
    position: "sticky",
    top: 0,
    background: "var(--bg-0)",
};

const tdStyle: React.CSSProperties = {
    padding: "7px 12px",
    fontSize: 12,
    color: "var(--text-2)",
    borderBottom: "1px solid var(--border)",
    whiteSpace: "nowrap",
};

const monoStyle: React.CSSProperties = { fontFamily: "var(--font-mono), monospace" };

const DetailRow = memo(function DetailRow({ r, index }: { r: ProxyResult; index: number }) {
    const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLTableRowElement>) => {
        e.currentTarget.style.background = "var(--bg-hover)";
    }, []);
    const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLTableRowElement>) => {
        e.currentTarget.style.background = "transparent";
    }, []);

    return (
        <tr
            style={{ transition: "background 60ms" }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <td style={{ ...tdStyle, color: "var(--text-3)", fontSize: 11 }}>{index + 1}</td>
            <td style={{ ...tdStyle, ...monoStyle, color: "var(--text-1)", fontWeight: 500 }}>{r.proxyIp}</td>
            <td style={{ ...tdStyle, ...monoStyle }}>{r.proxyPort}</td>
            <td style={tdStyle}>{r.user || <span style={{ color: "var(--text-3)" }}>{"\u2014"}</span>}</td>
            <td style={tdStyle}><Status value={r.status} /></td>
            <td style={{ ...tdStyle, ...monoStyle }}>{r.exitIp || <span style={{ color: "var(--text-3)" }}>{"\u2014"}</span>}</td>
            <td style={tdStyle}>
                {r.country ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                        <span style={{ fontSize: 14 }}>{getFlagEmoji(r.countryCode || "")}</span>
                        {r.country}
                        {r.city && <span style={{ color: "var(--text-3)", fontSize: 11 }}>{"\u00B7"} {r.city}</span>}
                    </span>
                ) : (
                    <span style={{ color: "var(--text-3)" }}>{"\u2014"}</span>
                )}
            </td>
            <td style={{ ...tdStyle, ...monoStyle }}><Latency ms={r.responseTimeMs} /></td>
            <td style={{ ...tdStyle, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", color: r.error ? "var(--red)" : "var(--text-3)", fontSize: 11 }} title={r.error}>
                {r.error || "\u2014"}
            </td>
        </tr>
    );
});

export function SessionDetailView() {
    const { selectedSession, setCurrentView, deleteSession } = useProxyChecker();
    const [filter, setFilter] = useState("");
    const [countryFilter, setCountryFilter] = useState("");

    const s = selectedSession;
    const countryList = useMemo(() => {
        const countries = s?.stats.countries || {};
        return Object.entries(countries).sort((a, b) => b[1] - a[1]);
    }, [s?.stats.countries]);

    const rows = useMemo(() => {
        if (!s) return [];
        let result = s.results;
        if (filter) {
            const q = filter.toLowerCase();
            result = result.filter((r) =>
                [r.proxyIp, r.proxyPort, r.user, r.status, r.exitIp, r.error, r.country || "", r.city || ""]
                    .join(" ")
                    .toLowerCase()
                    .includes(q)
            );
        }
        if (countryFilter) {
            result = result.filter((r) => r.country === countryFilter);
        }
        return result;
    }, [s, filter, countryFilter]);

    if (!s) return null;

    return (
        <div style={{ maxWidth: 960, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Back + Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Button
                    className="ra-btn"
                    onPress={() => setCurrentView("history")}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 500,
                        padding: "5px 10px",
                        borderRadius: "var(--radius)",
                        background: "var(--bg-2)",
                        border: "1px solid var(--border)",
                        color: "var(--text-2)",
                        cursor: "pointer",
                    }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
                    </svg>
                    Back
                </Button>
                <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-1)" }}>{s.name}</span>
                    <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: 10 }}>{formatDate(s.created_at)}</span>
                </div>
                <Button
                    className="ra-btn"
                    onPress={() => {
                        deleteSession(s.id);
                    }}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 500,
                        padding: "5px 10px",
                        borderRadius: "var(--radius)",
                        background: "var(--red-muted)",
                        border: "1px solid rgba(217,83,79,0.25)",
                        color: "var(--red)",
                        cursor: "pointer",
                    }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete
                </Button>
            </div>

            {/* Tags */}
            {s.tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {s.tags.map((t) => (
                        <span
                            key={t}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "2px 7px",
                                fontSize: 11,
                                fontWeight: 500,
                                color: "var(--accent)",
                                background: "var(--accent-muted)",
                                borderRadius: 3,
                            }}
                        >
                            {t}
                        </span>
                    ))}
                </div>
            )}

            {/* Stats bar */}
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)" }}>
                <Stat label="Total" value={String(s.stats.total)} color="var(--accent)" />
                <Stat label="Alive" value={String(s.stats.alive)} color="var(--green)" />
                <Stat label="Dead" value={String(s.stats.dead)} color="var(--red)" />
                <Stat label="Avg latency" value={s.stats.avgLatency != null ? `${s.stats.avgLatency}ms` : "\u2014"} color="var(--orange)" />
            </div>

            {/* Countries */}
            {countryList.length > 0 && (
                <div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", marginBottom: 8, display: "block" }}>
                        Countries ({countryList.length})
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <Button
                            onPress={() => setCountryFilter("")}
                            aria-pressed={!countryFilter}
                            style={{
                                padding: "4px 10px",
                                fontSize: 12,
                                fontWeight: 500,
                                borderRadius: "var(--radius)",
                                border: "1px solid var(--border)",
                                background: !countryFilter ? "var(--accent-muted)" : "var(--bg-2)",
                                color: !countryFilter ? "var(--accent)" : "var(--text-2)",
                                cursor: "pointer",
                                transition: "background 80ms, color 80ms, border-color 80ms",
                            }}
                        >
                            All
                        </Button>
                        {countryList.map(([name, count]) => (
                            <Button
                                key={name}
                                onPress={() => setCountryFilter(countryFilter === name ? "" : name)}
                                aria-pressed={countryFilter === name}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    padding: "4px 10px",
                                    fontSize: 12,
                                    fontWeight: 500,
                                    borderRadius: "var(--radius)",
                                    border: "1px solid var(--border)",
                                    background: countryFilter === name ? "var(--accent-muted)" : "var(--bg-2)",
                                    color: countryFilter === name ? "var(--accent)" : "var(--text-2)",
                                    cursor: "pointer",
                                    transition: "background 80ms, color 80ms, border-color 80ms",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {name}
                                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{count}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Filter + Export */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>Results</span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{rows.length}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                    <TextField aria-label="Filter" value={filter} onChange={setFilter}>
                        <Label className="sr-only">Filter</Label>
                        <Input
                            id="session-detail-search"
                            placeholder="Filter\u2026"
                            style={{
                                background: "var(--bg-2)",
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius)",
                                padding: "5px 10px",
                                color: "var(--text-1)",
                                fontSize: 12,
                                width: 160,
                                outline: "none",
                            }}
                        />
                    </TextField>
                    <Button
                        id="session-export-csv-btn"
                        className="ra-btn"
                        onPress={() => {
                            const timestamp = new Date(s.created_at).toISOString().replace(/[:.]/g, "-").slice(0, 19);
                            downloadCSV(rows, `${s.name.replace(/\s+/g, "_")}_${timestamp}.csv`);
                        }}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 12,
                            fontWeight: 500,
                            padding: "5px 10px",
                            borderRadius: "var(--radius)",
                            background: "var(--bg-2)",
                            border: "1px solid var(--border)",
                            color: "var(--text-2)",
                            cursor: "pointer",
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflowX: "auto", overflowY: "hidden" }}>
                <table style={{ width: "100%", minWidth: 920, borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            <th style={thStyle}>#</th>
                            <th style={thStyle}>Proxy</th>
                            <th style={thStyle}>Port</th>
                            <th style={thStyle}>Auth</th>
                            <th style={thStyle}>Status</th>
                            <th style={thStyle}>Exit IP</th>
                            <th style={thStyle}>Country</th>
                            <th style={thStyle}>Latency</th>
                            <th style={thStyle}>Error</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={9} style={{ padding: "32px 12px", textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>
                                    No results match the filter
                                </td>
                            </tr>
                        ) : (
                            rows.map((r, i) => (
                                <DetailRow key={r.id} r={r} index={i} />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
