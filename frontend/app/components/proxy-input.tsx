"use client";

import { useRef, useState, useMemo } from "react";
import {
    AlertTriangle,
    CircleX,
    Clipboard,
    Info,
    type LucideIcon,
    Upload,
    Wand2,
    Copy,
    Network
} from "lucide-react";
import {
    Button,
    TextField,
    Label,
    FileTrigger,
    Input
} from "react-aria-components";
import { useProxyChecker, type ValidationIssue } from "./proxy-checker-context";
import { UiIcon } from "./ui-icon";
import { LiveProxyEditor } from "./live-proxy-editor";
import { extractProxies, normalizeProxies, detectFormat } from "../lib/proxy-parser";

const SEVERITY_COLORS: Record<string, { color: string; icon: LucideIcon }> = {
    error: { color: "var(--red)", icon: CircleX },
    warning: { color: "var(--orange)", icon: AlertTriangle },
    tip: { color: "var(--accent)", icon: Info },
};

function IssueList({ issues }: { issues: ValidationIssue[] }) {
    if (issues.length === 0) return null;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
            {issues.map((issue, i) => {
                const sev = SEVERITY_COLORS[issue.severity];
                return (
                    <span
                        key={i}
                        style={{
                            fontSize: 11,
                            color: sev.color,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                        }}
                    >
                        <UiIcon icon={sev.icon} size={11} strokeWidth={1.8} />
                        {issue.message}
                    </span>
                );
            })}
        </div>
    );
}

export function ProxyInput() {
    const { proxyText, setProxyText, validation, touched, touch } = useProxyChecker();
    const [pasteHelp, setPasteHelp] = useState("");
    const [showBulkPort, setShowBulkPort] = useState(false);
    const [bulkPortValue, setBulkPortValue] = useState("8080");

    // Stats based on tokenizer
    const { validCount, missingPortCount } = useMemo(() => {
        const matches = extractProxies(proxyText);
        const valid = matches.filter(m => m.confidence === "confirmed" || m.confidence === "ambiguous");
        const missingPort = matches.filter(m => m.format === "unknown" && m.confidence === "ambiguous").length; // Heuristic: ambiguous often means missing port
        return { validCount: valid.length, missingPortCount: missingPort };
    }, [proxyText]);

    const issues = touched.proxyText ? validation.proxyText : [];
    const hasError = issues.some((i) => i.severity === "error");

    const handleFileSelect = (e: FileList | null) => {
        if (!e || e.length === 0) return;
        const file = e[0];
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") {
                const text = reader.result;
                const fmt = detectFormat(text);

                setProxyText(text);
                touch("proxyText");
                if (fmt !== "unknown" && fmt !== "ip:port") {
                    setPasteHelp(`Detected format: ${fmt}. Click 'Clean & Format' to standardize.`);
                } else {
                    setPasteHelp(`Loaded ${file.name}`);
                }
            }
        };
        reader.readAsText(file);
    };

    const handleClean = () => {
        const matches = extractProxies(proxyText);
        const cleaned = normalizeProxies(matches);
        const diff = matches.length - cleaned.split('\n').filter(l => l).length;

        setProxyText(cleaned);
        touch("proxyText");

        if (diff > 0) {
            setPasteHelp(`Cleaned & optimized. Removed ${diff} duplicates/invalid entries.`);
        } else {
            setPasteHelp("Formatted to standard IP:Port:User:Pass.");
        }
    };

    const handleCopyNormalized = () => {
        const matches = extractProxies(proxyText);
        const cleaned = normalizeProxies(matches);
        navigator.clipboard.writeText(cleaned);
        setPasteHelp("Copied normalized list to clipboard.");
    };

    const handleBulkAddPort = () => {
        if (!bulkPortValue) return;
        const matches = extractProxies(proxyText);
        const fixed = matches.map(m => {
            if (m.format === "unknown" && m.confidence === "ambiguous") {
                return `${m.ip}:${bulkPortValue}`;
            }
            return m.original;
        }).join("\n");

        setProxyText(fixed);
        touch("proxyText");
        setShowBulkPort(false);
        setPasteHelp(`Added port ${bulkPortValue} to standalone IPs.`);
    };

    const borderColor = hasError ? "var(--red)" : "var(--border)";

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Section header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>Proxy editor</span>
                    {validCount > 0 && (
                        <span style={{ fontSize: 11, color: "var(--green)", background: "var(--green-muted)", padding: "2px 6px", borderRadius: 4 }}>
                            {validCount} recognized
                        </span>
                    )}
                </div>

                {missingPortCount > 0 && !showBulkPort && (
                    <button
                        onClick={() => setShowBulkPort(true)}
                        style={{ fontSize: 11, color: "var(--accent)", border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}
                    >
                        <UiIcon icon={Network} size={11} />
                        Fix missing ports ({missingPortCount})
                    </button>
                )}
            </div>

            {/* Bulk Port Input */}
            {showBulkPort && (
                <div style={{
                    marginBottom: 8, padding: 8, background: "var(--bg-1)",
                    border: "1px solid var(--border)", borderRadius: "var(--radius)",
                    display: "flex", alignItems: "center", gap: 8
                }}>
                    <Label style={{ fontSize: 12 }}>Default Port:</Label>
                    <Input
                        value={bulkPortValue}
                        onChange={(e) => setBulkPortValue(e.target.value)}
                        style={{
                            width: 60, padding: "4px", borderRadius: 4,
                            border: "1px solid var(--border)", fontSize: 12
                        }}
                    />
                    <Button onPress={handleBulkAddPort} style={{ fontSize: 12, padding: "4px 8px", background: "var(--accent)", color: "#fff", border: 0, borderRadius: 4, cursor: "pointer" }}>
                        Apply
                    </Button>
                    <Button onPress={() => setShowBulkPort(false)} style={{ fontSize: 12, padding: "4px 8px", background: "transparent", color: "var(--text-2)", border: 0, cursor: "pointer" }}>
                        Cancel
                    </Button>
                </div>
            )}

            {/* Editor */}
            <TextField
                aria-label="Proxy list"
                value={proxyText}
                onChange={(v) => {
                    setProxyText(v);
                    if (!touched.proxyText && v.trim()) touch("proxyText");
                }}
                isInvalid={hasError}
                style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
            >
                <Label className="sr-only">Proxy list</Label>
                <div style={{
                    flex: 1,
                    position: "relative",
                    border: `1px solid ${borderColor}`,
                    borderRadius: "var(--radius-lg)",
                    transition: "border-color 80ms",
                }}>
                    <LiveProxyEditor
                        value={proxyText}
                        onChange={(v) => {
                            setProxyText(v);
                            if (!touched.proxyText && v.trim()) touch("proxyText");
                        }}
                        onBlur={() => touch("proxyText")}
                    />
                </div>
            </TextField>

            {/* Validation issues */}
            <IssueList issues={issues} />

            {/* Actions Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <Button
                    id="clean-format-btn"
                    className="ra-btn"
                    onPress={handleClean}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 500,
                        padding: "5px 10px",
                        borderRadius: "var(--radius)",
                        background: "var(--accent-muted)",
                        border: "1px solid var(--accent-muted)",
                        color: "var(--accent)",
                        cursor: "pointer",
                    }}
                >
                    <UiIcon icon={Wand2} size={12} strokeWidth={2} />
                    Clean & Format
                </Button>

                <Button
                    id="copy-normalized-btn"
                    className="ra-btn"
                    onPress={handleCopyNormalized}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 500,
                        padding: "5px 10px",
                        borderRadius: "var(--radius)",
                        background: "var(--bg-1)",
                        border: "1px solid var(--border)",
                        color: "var(--text-2)",
                        cursor: "pointer",
                    }}
                >
                    <UiIcon icon={Copy} size={12} strokeWidth={2} />
                    Copy
                </Button>

                <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />

                <FileTrigger acceptedFileTypes={[".txt", ".csv"]} onSelect={handleFileSelect}>
                    <Button
                        id="upload-file-btn"
                        className="ra-btn"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 12,
                            fontWeight: 500,
                            padding: "5px 10px",
                            borderRadius: "var(--radius)",
                            background: "var(--bg-1)",
                            border: "1px solid var(--border)",
                            color: "var(--text-2)",
                            cursor: "pointer",
                        }}
                    >
                        <UiIcon icon={Upload} size={12} strokeWidth={2} />
                        Import
                    </Button>
                </FileTrigger>

                {proxyText && (
                    <Button
                        id="clear-proxies-btn"
                        className="ra-btn"
                        onPress={() => setProxyText("")}
                        style={{
                            fontSize: 12,
                            fontWeight: 500,
                            padding: "5px 10px",
                            borderRadius: "var(--radius)",
                            background: "transparent",
                            border: "1px solid var(--border)",
                            color: "var(--red)",
                            cursor: "pointer",
                        }}
                    >
                        Clear
                    </Button>
                )}
            </div>

            {/* Helper Message/Toast */}
            {pasteHelp && (
                <div style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: "var(--text-2)",
                    background: "var(--bg-1)",
                    padding: "4px 8px",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    animation: "fadeIn 0.2s"
                }}>
                    <UiIcon icon={Info} size={12} />
                    {pasteHelp}
                </div>
            )}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-2px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
