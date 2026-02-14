"use client";

import React, { useRef, useMemo } from "react";
import { extractProxies } from "../lib/proxy-parser";
import { useProxyChecker } from "./proxy-checker-context";

interface LiveProxyEditorProps {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    className?: string; // wrapper style
}

export function LiveProxyEditor({ value, onChange, onBlur, className }: LiveProxyEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLDivElement>(null);
    const { touch } = useProxyChecker();

    // Sync scroll
    const handleScroll = () => {
        if (textareaRef.current && highlightRef.current) {
            highlightRef.current.scrollTop = textareaRef.current.scrollTop;
            highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    // Calculate highlights
    const highlights = useMemo(() => {
        if (!value) return [];
        return extractProxies(value);
    }, [value]);

    // Construct the renderable HTML for background layer
    const renderHighlights = () => {
        if (!value) return null;

        const elements: React.ReactNode[] = [];
        let currentIndex = 0;

        const sorted = [...highlights].sort((a, b) => a.index - b.index);

        sorted.forEach((match, i) => {
            // Text before match
            if (match.index > currentIndex) {
                const chunk = value.slice(currentIndex, match.index);
                elements.push(<span key={`text-${i}`} style={{ color: "var(--text-3)", opacity: 0.5 }}>{chunk}</span>);
            }

            // The match itself
            const chunk = value.slice(match.index, match.index + match.length);

            let color = "var(--text-3)";
            if (match.confidence === "confirmed") {
                color = "var(--green)";
            } else if (match.confidence === "ambiguous") {
                color = "var(--orange)";
            }

            elements.push(
                <span key={`match-${i}`} style={{ color, fontWeight: 600 }}>
                    {chunk}
                </span>
            );

            currentIndex = match.index + match.length;
        });

        // Remaining text
        if (currentIndex < value.length) {
            elements.push(<span key="text-end" style={{ color: "var(--text-3)", opacity: 0.5 }}>{value.slice(currentIndex)}</span>);
        }

        return elements;
    };

    return (
        <div
            className={className}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex", // ensures proper sizing
                flexDirection: "column",
                overflow: "hidden",
                backgroundColor: "var(--bg-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)"
            }}
        >
            {/* Highlight Layer */}
            <div
                ref={highlightRef}
                aria-hidden="true"
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: "10px 12px",
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 12,
                    lineHeight: 1.65,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    pointerEvents: "none",
                    overflow: "auto",
                    scrollbarWidth: "none",
                    color: "transparent",
                    zIndex: 0,
                }}
            >
                {renderHighlights()}
            </div>

            {/* Input Layer */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onScroll={handleScroll}
                onBlur={onBlur}
                spellCheck={false}
                style={{
                    position: "relative", // Ensures it stacks correctly
                    width: "100%",
                    height: "100%", // Fill parent
                    padding: "10px 12px",
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 12,
                    lineHeight: 1.65,
                    background: "transparent",
                    color: "transparent", // Text transparent
                    caretColor: "var(--text-1)",
                    border: "none",
                    outline: "none",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    resize: "none",
                    overflow: "auto",
                    zIndex: 1, // On top
                    display: "block",
                }}
            />
        </div>
    );
}
