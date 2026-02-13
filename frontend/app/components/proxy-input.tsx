"use client";

import {
    Button,
    TextArea,
    TextField,
    Label,
    FileTrigger,
} from "react-aria-components";
import { useProxyChecker, type ValidationIssue } from "./proxy-checker-context";

const SEVERITY_COLORS: Record<string, { color: string; icon: string }> = {
    error: { color: "var(--red)", icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" },
    warning: { color: "#e5a50a", icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" },
    tip: { color: "var(--accent)", icon: "M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" },
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
                            alignItems: "flex-start",
                            gap: 4,
                        }}
                    >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                            <path d={sev.icon} />
                        </svg>
                        {issue.message}
                    </span>
                );
            })}
        </div>
    );
}

export function ProxyInput() {
    const { proxyText, setProxyText, validation, touched, touch } = useProxyChecker();
    const lineCount = proxyText ? proxyText.split("\n").filter((l) => l.trim()).length : 0;

    const issues = touched.proxyText ? validation.proxyText : [];
    const hasError = issues.some((i) => i.severity === "error");
    const hasWarning = issues.some((i) => i.severity === "warning");

    const handleFileSelect = (e: FileList | null) => {
        if (!e || e.length === 0) return;
        const file = e[0];
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") {
                setProxyText(reader.result);
                touch("proxyText");
            }
        };
        reader.readAsText(file);
    };

    const borderColor = hasError ? "var(--red)" : hasWarning ? "#e5a50a" : "var(--border)";
    const counterColor = hasError ? "var(--red)" : hasWarning ? "#e5a50a" : "var(--text-3)";

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
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>Proxy list</span>
                <span style={{ fontSize: 11, color: counterColor, fontVariantNumeric: "tabular-nums" }}>
                    {lineCount} {lineCount === 1 ? "proxy" : "proxies"}
                </span>
            </div>

            {/* Input */}
            <TextField
                aria-label="Proxy list"
                value={proxyText}
                onChange={(v) => {
                    setProxyText(v);
                    if (!touched.proxyText && v.trim()) touch("proxyText");
                }}
                isInvalid={hasError}
                style={{ flex: 1, display: "flex", flexDirection: "column" }}
            >
                <Label className="sr-only">Proxy list</Label>
                <TextArea
                    id="proxy-input-textarea"
                    placeholder={`ip:port\nip:port:user:pass`}
                    rows={9}
                    style={{
                        flex: 1,
                        width: "100%",
                        background: "var(--bg-2)",
                        border: `1px solid ${borderColor}`,
                        borderRadius: "var(--radius-lg)",
                        padding: "10px 12px",
                        color: "var(--text-1)",
                        fontSize: 12,
                        fontFamily: "var(--font-mono), monospace",
                        lineHeight: 1.65,
                        resize: "vertical",
                        outline: "none",
                        transition: "border-color 80ms",
                    }}
                    onBlur={() => touch("proxyText")}
                />
            </TextField>

            {/* Validation issues */}
            <IssueList issues={issues} />

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
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
                            background: "var(--bg-2)",
                            border: "1px solid var(--border)",
                            color: "var(--text-2)",
                            cursor: "pointer",
                            transition: "border-color 80ms, color 80ms, background 80ms",
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Upload
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
                            transition: "border-color 80ms, background 80ms",
                        }}
                    >
                        Clear
                    </Button>
                )}
            </div>
        </div>
    );
}
