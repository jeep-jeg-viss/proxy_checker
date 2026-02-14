"use client";

import { useState, useMemo } from "react";
import { TextField, Label, Input, Button } from "react-aria-components";
import { useProxyChecker, type SessionSummary } from "./proxy-checker-context";

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function Tag({ label }: { label: string }) {
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 7px",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--accent)",
                background: "var(--accent-muted)",
                borderRadius: 3,
                whiteSpace: "nowrap",
            }}
        >
            {label}
        </span>
    );
}

function CountryPill({ name, count }: { name: string; count: number }) {
    return (
        <span
            title={`${name}: ${count}`}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 6px",
                fontSize: 11,
                color: "var(--text-2)",
                background: "var(--bg-3)",
                borderRadius: 3,
                whiteSpace: "nowrap",
            }}
        >
            <span style={{ color: "var(--text-3)" }}>{name}</span>
            {count}
        </span>
    );
}

function SessionCard({ session, onOpen, onDelete }: {
    session: SessionSummary;
    onOpen: () => void;
    onDelete: () => void;
}) {
    const aliveRate = session.stats.total > 0
        ? Math.round((session.stats.alive / session.stats.total) * 100)
        : 0;

    const countries = session.stats.countries || {};
    const topCountries = Object.entries(countries)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    return (
        <div
            style={{
                padding: "14px 16px",
                background: "var(--bg-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                transition: "border-color 100ms",
            }}
        >
            {/* Top row: name + time */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)" }}>{session.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }} title={formatDate(session.created_at)}>
                        {relativeTime(session.created_at)}
                    </span>
                    <Button
                        className="ra-btn"
                        onPress={onOpen}
                        style={{
                            fontSize: 11,
                            fontWeight: 500,
                            padding: "3px 8px",
                            borderRadius: "var(--radius)",
                            background: "var(--bg-2)",
                            border: "1px solid var(--border)",
                            color: "var(--text-2)",
                            cursor: "pointer",
                        }}
                    >
                        Open
                    </Button>
                    <Button
                        className="ra-btn"
                        aria-label={`Delete ${session.name}`}
                        onPress={onDelete}
                        style={{
                            background: "var(--red-muted)",
                            border: "1px solid rgba(217,83,79,0.25)",
                            cursor: "pointer",
                            color: "var(--red)",
                            padding: "3px 8px",
                            borderRadius: "var(--radius)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 500,
                        }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Delete
                    </Button>
                </div>
            </div>

            {/* Tags */}
            {session.tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                    {session.tags.map((t) => (
                        <Tag key={t} label={t} />
                    ))}
                </div>
            )}

            {/* Stats row */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, marginBottom: topCountries.length > 0 ? 10 : 0 }}>
                <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                    <span style={{ fontWeight: 500, color: "var(--text-1)" }}>{session.stats.total}</span> total
                </span>
                <span style={{ fontSize: 12, color: "var(--green)" }}>
                    <span style={{ fontWeight: 500 }}>{session.stats.alive}</span> alive
                </span>
                <span style={{ fontSize: 12, color: "var(--red)" }}>
                    <span style={{ fontWeight: 500 }}>{session.stats.dead}</span> dead
                </span>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                    {aliveRate}% success
                </span>
                {session.stats.avgLatency != null && (
                    <span style={{ fontSize: 12, color: "var(--orange)", fontFamily: "var(--font-mono), monospace" }}>
                        {session.stats.avgLatency}ms
                    </span>
                )}
            </div>

            {/* Countries */}
            {topCountries.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {topCountries.map(([name, count]) => <CountryPill key={name} name={name} count={count} />)}
                    {Object.keys(countries).length > 5 && (
                        <span style={{ fontSize: 11, color: "var(--text-3)", padding: "2px 4px" }}>
                            +{Object.keys(countries).length - 5} more
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

export function History() {
    const { sessions, loadSession, deleteSession, fetchSessions } = useProxyChecker();
    const [search, setSearch] = useState("");
    const [tagFilter, setTagFilter] = useState("");

    // Collect all unique tags
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        sessions.forEach((s) => s.tags.forEach((t) => tagSet.add(t)));
        return Array.from(tagSet).sort();
    }, [sessions]);

    // Filter sessions
    const filtered = useMemo(() => {
        let result = sessions;

        if (search) {
            const q = search.toLowerCase();
            result = result.filter(
                (s) =>
                    s.name.toLowerCase().includes(q) ||
                    s.tags.some((t) => t.toLowerCase().includes(q))
            );
        }

        if (tagFilter) {
            result = result.filter((s) => s.tags.includes(tagFilter));
        }

        return result;
    }, [sessions, search, tagFilter]);

    return (
        <div style={{ maxWidth: 960, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Header */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-1)" }}>Session History</span>
                    <span style={{ fontSize: 12, color: "var(--text-3)" }}>{sessions.length} sessions</span>
                </div>
                <Button
                    className="ra-btn"
                    onPress={() => fetchSessions()}
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
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                        <path d="M21 21v-5h-5" />
                    </svg>
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <TextField aria-label="Search sessions" value={search} onChange={setSearch} style={{ flex: 1 }}>
                    <Label className="sr-only">Search</Label>
                    <Input
                        id="history-search"
                        placeholder="Search by name or tag…"
                        style={{
                            width: "100%",
                            background: "var(--bg-2)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius)",
                            padding: "7px 10px",
                            color: "var(--text-1)",
                            fontSize: 12,
                            outline: "none",
                        }}
                    />
                </TextField>

                {allTags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
                        <Button
                            onPress={() => setTagFilter("")}
                            aria-pressed={!tagFilter}
                            style={{
                                padding: "5px 8px",
                                fontSize: 11,
                                fontWeight: 500,
                                borderRadius: "var(--radius)",
                                border: "1px solid var(--border)",
                                background: !tagFilter ? "var(--accent-muted)" : "var(--bg-2)",
                                color: !tagFilter ? "var(--accent)" : "var(--text-3)",
                                cursor: "pointer",
                                transition: "all 80ms",
                            }}
                        >
                            All
                        </Button>
                        {allTags.map((tag) => (
                            <Button
                                key={tag}
                                onPress={() => setTagFilter(tagFilter === tag ? "" : tag)}
                                aria-pressed={tagFilter === tag}
                                style={{
                                    padding: "5px 8px",
                                    fontSize: 11,
                                    fontWeight: 500,
                                    borderRadius: "var(--radius)",
                                    border: "1px solid var(--border)",
                                    background: tagFilter === tag ? "var(--accent-muted)" : "var(--bg-2)",
                                    color: tagFilter === tag ? "var(--accent)" : "var(--text-3)",
                                    cursor: "pointer",
                                    transition: "all 80ms",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {tag}
                            </Button>
                        ))}
                    </div>
                )}
            </div>

            {/* Session list */}
            {filtered.length === 0 ? (
                <div
                    style={{
                        padding: "48px 24px",
                        textAlign: "center",
                        color: "var(--text-3)",
                        fontSize: 13,
                        background: "var(--bg-1)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-lg)",
                    }}
                >
                    {sessions.length === 0
                        ? "No sessions yet — run a proxy check to create one"
                        : "No sessions match your filters"}
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {filtered.map((s) => (
                        <SessionCard
                            key={s.id}
                            session={s}
                            onOpen={() => loadSession(s.id)}
                            onDelete={() => deleteSession(s.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
