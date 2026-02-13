"use client";

import { TextField, Label, Input } from "react-aria-components";
import { useProxyChecker } from "./proxy-checker-context";

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

export function SessionInput() {
    const { sessionName, setSessionName, sessionTags, setSessionTags } = useProxyChecker();

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                padding: "12px 14px",
                background: "var(--bg-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
            }}
        >
            <TextField aria-label="Session name" value={sessionName} onChange={setSessionName}>
                <Label style={lbl}>Session name</Label>
                <Input
                    id="session-name-input"
                    placeholder="e.g. US residential batch"
                    style={inp}
                />
            </TextField>

            <TextField aria-label="Tags" value={sessionTags} onChange={setSessionTags}>
                <Label style={lbl}>Tags <span style={{ color: "var(--text-3)", fontWeight: 300 }}>(comma-separated)</span></Label>
                <Input
                    id="session-tags-input"
                    placeholder="e.g. production, us-east, residential"
                    style={inp}
                />
            </TextField>
        </div>
    );
}
