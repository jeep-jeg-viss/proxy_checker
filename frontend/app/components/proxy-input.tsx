"use client";

import {
    Button,
    TextArea,
    TextField,
    Label,
    FileTrigger,
} from "react-aria-components";
import { useProxyChecker } from "./proxy-checker-context";

export function ProxyInput() {
    const { proxyText, setProxyText } = useProxyChecker();
    const lineCount = proxyText ? proxyText.split("\n").filter((l) => l.trim()).length : 0;

    const handleFileSelect = (e: FileList | null) => {
        if (!e || e.length === 0) return;
        const file = e[0];
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") {
                setProxyText(reader.result);
            }
        };
        reader.readAsText(file);
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
                <span style={{ fontSize: 11, color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
                    {lineCount} {lineCount === 1 ? "proxy" : "proxies"}
                </span>
            </div>

            {/* Input */}
            <TextField aria-label="Proxy list" value={proxyText} onChange={setProxyText} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <Label className="sr-only">Proxy list</Label>
                <TextArea
                    id="proxy-input-textarea"
                    placeholder={`ip:port\nip:port:user:pass`}
                    rows={9}
                    style={{
                        flex: 1,
                        width: "100%",
                        background: "var(--bg-2)",
                        border: "1px solid var(--border)",
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
                />
            </TextField>

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
