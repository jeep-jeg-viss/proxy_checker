"use client";

import { useState, useMemo } from "react";
import {
    Button,
    Label,
    ListBox,
    ListBoxItem,
    Popover,
    Select,
    TextField,
    Input,
} from "react-aria-components";
import { useProxyChecker, type ProxyResult } from "./proxy-checker-context";

function getFlagEmoji(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) return "\u{1F30D}";
    const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((c) => 127397 + c.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

type ExportFilter = "all" | "working" | "dead";

const EXPORT_OPTIONS: { id: ExportFilter; label: string; color: string }[] = [
    { id: "working", label: "Working only", color: "var(--green)" },
    { id: "dead", label: "Dead only", color: "var(--red)" },
    { id: "all", label: "All results", color: "var(--text-2)" },
];

function Status({ value }: { value: "OK" | "FAIL" }) {
    const ok = value === "OK";
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: ok ? "var(--green)" : "var(--red)" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
            {ok ? "Alive" : "Failed"}
        </span>
    );
}

function Latency({ ms }: { ms: number | null }) {
    if (ms == null) return <span style={{ color: "var(--text-3)" }}>—</span>;
    let c = "var(--green)";
    if (ms > 400) c = "var(--orange)";
    if (ms > 800) c = "var(--red)";
    return <span style={{ fontVariantNumeric: "tabular-nums", color: c }}>{ms}<span style={{ color: "var(--text-3)", marginLeft: 1 }}>ms</span></span>;
}

function downloadCSV(rows: ProxyResult[], filename: string) {
    const headers = ["proxy_ip", "proxy_port", "user", "status", "exit_ip", "response_time_ms", "error"];
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

export function ResultsTable() {
    const { results } = useProxyChecker();
    const [filter, setFilter] = useState("");
    const [exportFilter, setExportFilter] = useState<ExportFilter>("working");

    const rows = useMemo(() => {
        let filtered = results;
        if (filter) {
            const q = filter.toLowerCase();
            filtered = filtered.filter((r) =>
                [r.proxyIp, r.proxyPort, r.user, r.status, r.exitIp, r.error].join(" ").toLowerCase().includes(q)
            );
        }
        return filtered;
    }, [results, filter]);

    const handleExport = () => {
        let exportRows = results;
        if (exportFilter === "working") exportRows = results.filter((r) => r.status === "OK");
        else if (exportFilter === "dead") exportRows = results.filter((r) => r.status === "FAIL");

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        downloadCSV(exportRows, `proxy_results_${exportFilter}_${timestamp}.csv`);
    };

    const th: React.CSSProperties = {
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

    const td: React.CSSProperties = {
        padding: "7px 12px",
        fontSize: 12,
        color: "var(--text-2)",
        borderBottom: "1px solid var(--border)",
        whiteSpace: "nowrap",
    };

    const mono: React.CSSProperties = { fontFamily: "var(--font-mono), monospace" };

    return (
        <div>
            {/* Header row */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2 style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", lineHeight: 1.3 }}>
                        Results
                    </h2>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{rows.length}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                    <TextField aria-label="Filter" value={filter} onChange={setFilter}>
                        <Label className="sr-only">Filter</Label>
                        <Input
                            id="results-search"
                            placeholder="Filter…"
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
                    <Select
                        aria-label="Export filter"
                        selectedKey={exportFilter}
                        onSelectionChange={(k) => setExportFilter(k as ExportFilter)}
                    >
                        <Button
                            id="export-filter-btn"
                            className="ra-btn"
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
                            {(() => {
                                const opt = EXPORT_OPTIONS.find((o) => o.id === exportFilter);
                                return (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: opt?.color || "var(--text-2)", display: "inline-block", flexShrink: 0 }} />
                                        {opt?.label || "All results"}
                                    </span>
                                );
                            })()}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                        </Button>
                        <Popover style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 3, minWidth: "var(--trigger-width)", zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
                            <ListBox>
                                {EXPORT_OPTIONS.map((opt) => (
                                    <ListBoxItem
                                        key={opt.id}
                                        id={opt.id}
                                        style={{
                                            padding: "6px 10px",
                                            borderRadius: "var(--radius)",
                                            fontSize: 12,
                                            color: opt.color,
                                            cursor: "pointer",
                                            outline: "none",
                                            transition: "background 60ms",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                        }}
                                    >
                                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: opt.color, display: "inline-block", flexShrink: 0 }} />
                                        {opt.label}
                                    </ListBoxItem>
                                ))}
                            </ListBox>
                        </Popover>
                    </Select>
                    <Button
                        id="export-csv-btn"
                        className="ra-btn"
                        onPress={handleExport}
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
                        Export
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflowX: "auto", overflowY: "hidden" }}>
                <table style={{ width: "100%", minWidth: 920, borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            <th style={th}>#</th>
                            <th style={th}>Proxy</th>
                            <th style={th}>Port</th>
                            <th style={th}>Auth</th>
                            <th style={th}>Status</th>
                            <th style={th}>Exit IP</th>
                            <th style={th}>Country</th>
                            <th style={th}>Latency</th>
                            <th style={th}>Error</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={9} style={{ padding: "32px 12px", textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>
                                    No results — paste proxies and run a check
                                </td>
                            </tr>
                        ) : (
                            rows.map((r, i) => (
                                <tr
                                    key={r.id}
                                    style={{ transition: "background 60ms" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                    <td style={{ ...td, color: "var(--text-3)", fontSize: 11 }}>{i + 1}</td>
                                    <td style={{ ...td, ...mono, color: "var(--text-1)", fontWeight: 500 }}>{r.proxyIp}</td>
                                    <td style={{ ...td, ...mono }}>{r.proxyPort}</td>
                                    <td style={td}>{r.user || <span style={{ color: "var(--text-3)" }}>—</span>}</td>
                                    <td style={td}><Status value={r.status} /></td>
                                    <td style={{ ...td, ...mono }}>{r.exitIp || <span style={{ color: "var(--text-3)" }}>—</span>}</td>
                                    <td style={td}>
                                        {r.country ? (
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                                                <span style={{ fontSize: 14 }}>{getFlagEmoji(r.countryCode || "")}</span>
                                                {r.country}
                                            </span>
                                        ) : (
                                            <span style={{ color: "var(--text-3)" }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ ...td, ...mono }}><Latency ms={r.responseTimeMs} /></td>
                                    <td style={{ ...td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", color: r.error ? "var(--red)" : "var(--text-3)", fontSize: 11 }} title={r.error}>
                                        {r.error || "—"}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
