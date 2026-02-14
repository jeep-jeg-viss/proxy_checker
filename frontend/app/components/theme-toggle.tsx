"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div style={{ width: 15, height: 15 }} />; // Placeholder to avoid layout shift
    }

    const toggleTheme = () => {
        if (theme === "system") {
            setTheme(resolvedTheme === "dark" ? "light" : "dark");
        } else {
            setTheme(theme === "dark" ? "light" : "dark");
        }
    };

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label="Toggle theme"
            title={`Current: ${theme === 'system' ? `System (${resolvedTheme})` : theme}`}
            style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 4,
                borderRadius: "var(--radius)",
                color: "var(--text-3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 150ms",
            }}
        >
            {resolvedTheme === "dark" ? (
                <Moon size={15} />
            ) : (
                <Sun size={15} />
            )}
        </button>
    );
}
