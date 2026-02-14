"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CircleX, Clipboard, Info, type LucideIcon, Upload } from "lucide-react";
import {
    Button,
    TextArea,
    TextField,
    Label,
    FileTrigger,
} from "react-aria-components";
import { useProxyChecker, type ValidationIssue } from "./proxy-checker-context";
import { UiIcon } from "./ui-icon";

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
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
    const [pasteHelp, setPasteHelp] = useState("");
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

    const borderColor = hasError ? "var(--red)" : hasWarning ? "var(--orange)" : "var(--border)";
    const counterColor = hasError ? "var(--red)" : hasWarning ? "var(--orange)" : "var(--text-3)";
    const normalizeClipboardText = (text: string) => text.replace(/\r\n?/g, "\n");

    const handlePasteFromClipboard = async () => {
        setPasteHelp("");
        const clipboard = navigator.clipboard;

        if (!clipboard?.readText) {
            setPasteHelp("Clipboard read is unavailable here. Use Ctrl+V in the input box.");
            textAreaRef.current?.focus();
            return;
        }

        try {
            const text = normalizeClipboardText(await clipboard.readText());
            if (!text.trim()) {
                setPasteHelp("Clipboard is empty.");
                textAreaRef.current?.focus();
                return;
            }

            setProxyText(text);
            touch("proxyText");
            textAreaRef.current?.focus();
            const endPos = text.length;
            textAreaRef.current?.setSelectionRange(endPos, endPos);
        } catch {
            setPasteHelp("Clipboard access blocked. Click input and press Ctrl+V.");
            textAreaRef.current?.focus();
        }
    };

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
                    ref={textAreaRef}
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
                <Button
                    id="paste-clipboard-btn"
                    className="ra-btn"
                    onPress={handlePasteFromClipboard}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 500,
                        padding: "5px 10px",
                        borderRadius: "var(--radius)",
                        background: "var(--accent-muted)",
                        border: "1px solid var(--accent)",
                        color: "var(--accent)",
                        cursor: "pointer",
                        transition: "border-color 80ms, color 80ms, background 80ms",
                    }}
                >
                    <UiIcon icon={Clipboard} size={12} strokeWidth={2} />
                    Paste
                </Button>
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
                            background: "var(--btn-surface)",
                            border: "1px solid var(--btn-border)",
                            color: "var(--btn-text)",
                            cursor: "pointer",
                            transition: "border-color 80ms, color 80ms, background 80ms",
                        }}
                    >
                        <UiIcon icon={Upload} size={12} strokeWidth={2} />
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
            {pasteHelp && (
                <span style={{ marginTop: 4, fontSize: 11, color: "var(--text-3)" }}>
                    {pasteHelp}
                </span>
            )}
        </div>
    );
}
