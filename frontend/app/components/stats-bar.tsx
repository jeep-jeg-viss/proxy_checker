"use client";

import { useProxyChecker } from "./proxy-checker-context";

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "14px 0",
                flex: 1,
            }}
        >
            {/* Label row with dot */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                    style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: color,
                        flexShrink: 0,
                    }}
                />
                <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 400 }}>
                    {label}
                </span>
            </div>

            {/* Value */}
            <span
                style={{
                    fontSize: 22,
                    fontWeight: 500,
                    color: "var(--text-1)",
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                }}
            >
                {value}
            </span>
        </div>
    );
}

export function StatsBar() {
    const { stats, results, status } = useProxyChecker();

    // During a run, compute live stats from accumulated results
    const isLive = status === "running";
    const total = isLive ? results.length : stats.total;
    const alive = isLive ? results.filter((r) => r.status === "OK").length : stats.alive;
    const dead = isLive ? results.filter((r) => r.status === "FAIL").length : stats.dead;

    let avgLatency: string;
    if (isLive) {
        const latencies = results.filter((r) => r.responseTimeMs != null).map((r) => r.responseTimeMs!);
        avgLatency = latencies.length > 0 ? `${Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)}ms` : "—";
    } else {
        avgLatency = stats.avgLatency != null ? `${stats.avgLatency}ms` : "—";
    }

    return (
        <div
            style={{
                display: "flex",
                gap: 0,
                borderBottom: "1px solid var(--border)",
            }}
        >
            <Stat label="Total" value={String(total)} color="var(--accent)" />
            <Stat label="Alive" value={String(alive)} color="var(--green)" />
            <Stat label="Dead" value={String(dead)} color="var(--red)" />
            <Stat label="Avg latency" value={avgLatency} color="var(--orange)" />
        </div>
    );
}
