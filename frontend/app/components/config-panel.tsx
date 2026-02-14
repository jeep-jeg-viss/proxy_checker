"use client";

import {
    Button,
    Label,
    ListBox,
    ListBoxItem,
    Popover,
    Select,
    SelectValue,
    TextField,
    Input,
} from "react-aria-components";
import { useProxyChecker, type ValidationIssue } from "./proxy-checker-context";

const PROXY_TYPES = [
    { id: "http", label: "HTTP" },
    { id: "socks5", label: "SOCKS5" },
];

const DELIMITERS = [
    { id: ":", label: ": colon" },
    { id: "|", label: "| pipe" },
    { id: ",", label: ", comma" },
];

const FIELD_ORDERS = [
    { id: "ip:port", label: "ip:port" },
    { id: "ip:port:user:pass", label: "ip:port:user:pass" },
    { id: "user:pass:ip:port", label: "user:pass:ip:port" },
    { id: "ip:port:pass:user", label: "ip:port:pass:user" },
];

const lbl: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 400,
    color: "var(--text-2)",
    marginBottom: 4,
};

const inp: React.CSSProperties = {
    width: "100%",
    background: "var(--bg-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "6px 10px",
    color: "var(--text-1)",
    fontSize: 12,
    outline: "none",
    transition: "border-color 80ms, box-shadow 80ms",
};

const SEVERITY_COLORS: Record<string, { color: string; icon: string }> = {
    error: { color: "var(--red)", icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" },
    warning: { color: "var(--orange)", icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" },
    tip: { color: "var(--accent)", icon: "M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" },
};

function IssueList({ issues }: { issues: ValidationIssue[] }) {
    if (issues.length === 0) return null;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 3 }}>
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

function borderColor(issues: ValidationIssue[]): string | undefined {
    if (issues.some((i) => i.severity === "error")) return "var(--red)";
    if (issues.some((i) => i.severity === "warning")) return "var(--orange)";
    return undefined;
}

export function ConfigPanel() {
    const { config, updateConfig, validation, touched, touch } = useProxyChecker();

    const urlIssues = touched.checkUrl ? validation.checkUrl : [];
    const timeoutIssues = touched.timeout ? validation.timeout : [];
    const workersIssues = touched.maxWorkers ? validation.maxWorkers : [];
    const fieldOrderIssues = touched.fieldOrder ? validation.fieldOrder : [];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>Configuration</span>

            {/* Check URL */}
            <div>
                <TextField
                    aria-label="Check URL"
                    value={config.checkUrl}
                    onChange={(v) => updateConfig("checkUrl", v)}
                    isInvalid={urlIssues.some((i) => i.severity === "error")}
                >
                    <Label style={lbl}>Check URL</Label>
                    <Input
                        id="config-check-url"
                        style={{ ...inp, borderColor: borderColor(urlIssues) }}
                        onBlur={() => touch("checkUrl")}
                    />
                </TextField>
                <IssueList issues={urlIssues} />
            </div>

            {/* Timeout + Workers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                <div>
                    <TextField
                        aria-label="Timeout"
                        value={config.timeout}
                        onChange={(v) => updateConfig("timeout", v)}
                        isInvalid={timeoutIssues.some((i) => i.severity === "error")}
                    >
                        <Label style={lbl}>Timeout (s)</Label>
                        <Input
                            id="config-timeout"
                            type="number"
                            min={1}
                            max={60}
                            style={{ ...inp, borderColor: borderColor(timeoutIssues) }}
                            onBlur={() => touch("timeout")}
                        />
                    </TextField>
                    <IssueList issues={timeoutIssues} />
                </div>
                <div>
                    <TextField
                        aria-label="Workers"
                        value={config.maxWorkers}
                        onChange={(v) => updateConfig("maxWorkers", v)}
                        isInvalid={workersIssues.some((i) => i.severity === "error")}
                    >
                        <Label style={lbl}>Workers</Label>
                        <Input
                            id="config-concurrency"
                            type="number"
                            min={1}
                            max={200}
                            style={{ ...inp, borderColor: borderColor(workersIssues) }}
                            onBlur={() => touch("maxWorkers")}
                        />
                    </TextField>
                    <IssueList issues={workersIssues} />
                </div>
            </div>

            {/* Proxy type + Delimiter */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                <Select aria-label="Proxy type" selectedKey={config.proxyType} onSelectionChange={(k) => updateConfig("proxyType", String(k))}>
                    <Label style={lbl}>Type</Label>
                    <Button id="config-proxy-type" className="ra-btn" style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                        <SelectValue />
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                    </Button>
                    <Popover style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 3, minWidth: "var(--trigger-width)", zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
                        <ListBox>
                            {PROXY_TYPES.map((t) => (
                                <ListBoxItem key={t.id} id={t.id} style={{ padding: "6px 10px", borderRadius: "var(--radius)", fontSize: 12, color: "var(--text-1)", cursor: "pointer", outline: "none", transition: "background 60ms" }}>{t.label}</ListBoxItem>
                            ))}
                        </ListBox>
                    </Popover>
                </Select>

                <div>
                    <Select
                        aria-label="Delimiter"
                        selectedKey={config.delimiter}
                        onSelectionChange={(k) => {
                            updateConfig("delimiter", String(k));
                            touch("fieldOrder");
                        }}
                    >
                        <Label style={lbl}>Delimiter</Label>
                        <Button id="config-delimiter" className="ra-btn" style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", borderColor: borderColor(fieldOrderIssues) }}>
                            <SelectValue />
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                        </Button>
                        <Popover style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 3, minWidth: "var(--trigger-width)", zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
                            <ListBox>
                                {DELIMITERS.map((d) => (
                                    <ListBoxItem key={d.id} id={d.id} style={{ padding: "6px 10px", borderRadius: "var(--radius)", fontSize: 12, color: "var(--text-1)", cursor: "pointer", outline: "none", transition: "background 60ms" }}>{d.label}</ListBoxItem>
                                ))}
                            </ListBox>
                        </Popover>
                    </Select>
                </div>
            </div>

            {/* Field order */}
            <div>
                <Select
                    aria-label="Field order"
                    selectedKey={config.fieldOrder}
                    onSelectionChange={(k) => {
                        updateConfig("fieldOrder", String(k));
                        touch("fieldOrder");
                    }}
                >
                    <Label style={lbl}>Field order</Label>
                    <Button id="config-field-order" className="ra-btn" style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "var(--font-mono), monospace", borderColor: borderColor(fieldOrderIssues) }}>
                        <SelectValue />
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                    </Button>
                    <Popover style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 3, minWidth: "var(--trigger-width)", zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
                        <ListBox>
                            {FIELD_ORDERS.map((f) => (
                                <ListBoxItem key={f.id} id={f.id} style={{ padding: "6px 10px", borderRadius: "var(--radius)", fontSize: 12, fontFamily: "var(--font-mono), monospace", color: "var(--text-1)", cursor: "pointer", outline: "none", transition: "background 60ms" }}>{f.label}</ListBoxItem>
                            ))}
                        </ListBox>
                    </Popover>
                </Select>
                <IssueList issues={fieldOrderIssues} />
            </div>
        </div>
    );
}
