"use client";

import { AlertTriangle, ChevronDown, Info } from "lucide-react";
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
import { UiIcon } from "./ui-icon";

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

const SEVERITY_COLORS: Record<string, { color: string; icon: typeof AlertTriangle }> = {
    error: { color: "var(--red)", icon: AlertTriangle },
    warning: { color: "var(--orange)", icon: AlertTriangle },
    tip: { color: "var(--accent)", icon: Info },
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
                        <UiIcon icon={sev.icon} size={11} strokeWidth={1.8} style={{ marginTop: 1 }} />
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
                        <UiIcon icon={ChevronDown} size={12} strokeWidth={2} color="var(--text-3)" />
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
                            <UiIcon icon={ChevronDown} size={12} strokeWidth={2} color="var(--text-3)" />
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
                        <UiIcon icon={ChevronDown} size={12} strokeWidth={2} color="var(--text-3)" />
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
