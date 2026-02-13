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
    const { sessionName, setSessionName, sessionTags, setSessionTags, validation, touched, touch } = useProxyChecker();
    const nameIssues = touched.sessionName ? validation.sessionName : [];
    const hasError = nameIssues.some((i) => i.severity === "error");

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
            <div>
                <TextField
                    aria-label="Session name"
                    value={sessionName}
                    onChange={setSessionName}
                    isInvalid={hasError}
                >
                    <Label style={lbl}>
                        Session name
                        <span style={{ color: "var(--text-3)", fontWeight: 300, marginLeft: 4 }}>(optional)</span>
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
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
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
