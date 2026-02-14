"use client";

import { memo, useMemo } from "react";
import { useProxyChecker } from "./proxy-checker-context";

const Stat = memo(function Stat({ label, value, color }: { label: string; value: string; color: string }) {
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
});

export function StatsBar() {
    const { stats, results, status } = useProxyChecker();

    const isLive = status === "running";

    // Memoize live stats to avoid recomputing on every render
    const { total, alive, dead, avgLatency } = useMemo(() => {
        if (!isLive) {
            return {
                total: stats.total,
                alive: stats.alive,
                dead: stats.dead,
                avgLatency: stats.avgLatency != null ? `${stats.avgLatency}ms` : "\u2014",
            };
        }
        let aliveCount = 0;
        let deadCount = 0;
        let latencySum = 0;
        let latencyCount = 0;
        for (let i = 0; i < results.length; i++) {
            const r = results[i];
            if (r.status === "OK") aliveCount++;
            else deadCount++;
            if (r.responseTimeMs != null) {
                latencySum += r.responseTimeMs;
                latencyCount++;
            }
        }
        return {
            total: results.length,
            alive: aliveCount,
            dead: deadCount,
            avgLatency: latencyCount > 0 ? `${Math.round(latencySum / latencyCount)}ms` : "\u2014",
        };
    }, [isLive, results, stats]);

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
            <Stat label="Avg latency" value={String(avgLatency)} color="var(--orange)" />
        </div>
    );
}
