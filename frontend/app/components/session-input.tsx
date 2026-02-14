"use client";

import { AlertTriangle } from "lucide-react";
import { TextField, Label, Input } from "react-aria-components";
import { useProxyChecker } from "./proxy-checker-context";
import { UiIcon } from "./ui-icon";

const lbl: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 550,
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

export function SessionInput() {
    const { sessionName, setSessionName, sessionTags, setSessionTags, validation, touched, touch } = useProxyChecker();
    const nameIssues = touched.sessionName ? validation.sessionName : [];
    const hasError = nameIssues.some((i) => i.severity === "error");

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                padding: "12px 14px",
                background: "var(--bg-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
            }}
        >
            <div>
                <TextField
                    aria-label="Session name"
                    value={sessionName}
                    onChange={setSessionName}
                    isInvalid={hasError}
                >
                    <Label style={lbl}>
                        Session name
                        <span style={{ color: "var(--text-3)", fontWeight: 400, marginLeft: 4 }}>(optional)</span>
                    </Label>
                    <Input
                        id="session-name-input"
                        placeholder="e.g. US residential batch"
                        maxLength={60}
                        style={{
                            ...inp,
                            borderColor: hasError ? "var(--red)" : undefined,
                        }}
                        onBlur={() => touch("sessionName")}
                    />
                </TextField>
                {hasError && nameIssues.map((issue, i) => (
                    <span key={i} style={{
                        fontSize: 11,
                        color: "var(--red)",
                        marginTop: 3,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                    }}>
                        <UiIcon icon={AlertTriangle} size={11} strokeWidth={1.8} />
                        {issue.message}
                    </span>
                ))}
                {sessionName.length > 0 && !hasError && (
                    <span style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3, display: "block", textAlign: "right" }}>
                        {sessionName.length}/60
                    </span>
                )}
            </div>

            <TextField aria-label="Tags" value={sessionTags} onChange={setSessionTags}>
                <Label style={lbl}>Tags <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(comma-separated)</span></Label>
                <Input
                    id="session-tags-input"
                    placeholder="e.g. production, us-east, residential"
                    style={inp}
                />
            </TextField>
        </div>
    );
}
