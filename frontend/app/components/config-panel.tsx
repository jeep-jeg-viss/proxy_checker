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
import { useProxyChecker } from "./proxy-checker-context";

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
    color: "var(--text-3)",
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

export function ConfigPanel() {
    const { config, updateConfig } = useProxyChecker();

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>Configuration</span>

            <TextField aria-label="Check URL" value={config.checkUrl} onChange={(v) => updateConfig("checkUrl", v)}>
                <Label style={lbl}>Check URL</Label>
                <Input id="config-check-url" style={inp} />
            </TextField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <TextField aria-label="Timeout" value={config.timeout} onChange={(v) => updateConfig("timeout", v)}>
                    <Label style={lbl}>Timeout (s)</Label>
                    <Input id="config-timeout" type="number" min={1} max={120} style={inp} />
                </TextField>
                <TextField aria-label="Workers" value={config.maxWorkers} onChange={(v) => updateConfig("maxWorkers", v)}>
                    <Label style={lbl}>Workers</Label>
                    <Input id="config-concurrency" type="number" min={1} max={100} style={inp} />
                </TextField>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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

                <Select aria-label="Delimiter" selectedKey={config.delimiter} onSelectionChange={(k) => updateConfig("delimiter", String(k))}>
                    <Label style={lbl}>Delimiter</Label>
                    <Button id="config-delimiter" className="ra-btn" style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
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

            <Select aria-label="Field order" selectedKey={config.fieldOrder} onSelectionChange={(k) => updateConfig("fieldOrder", String(k))}>
                <Label style={lbl}>Field order</Label>
                <Button id="config-field-order" className="ra-btn" style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "var(--font-mono), monospace" }}>
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
        </div>
    );
}
