"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "react-aria-components";
import { UiIcon } from "./ui-icon";

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const hydrated = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );

    if (!hydrated) {
        return <div aria-hidden style={{ width: 24, height: 24 }} />; // Placeholder to avoid layout shift
    }

    const toggleTheme = () => {
        if (theme === "system") {
            setTheme(resolvedTheme === "dark" ? "light" : "dark");
        } else {
            setTheme(theme === "dark" ? "light" : "dark");
        }
    };

    return (
        <Button
            onPress={toggleTheme}
            className="theme-toggle"
            aria-label="Toggle theme"
            style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 4,
                minWidth: 24,
                minHeight: 24,
                borderRadius: "var(--radius)",
                color: "var(--text-3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 150ms",
            }}
        >
            {resolvedTheme === "dark" ? (
                <UiIcon icon={Moon} size={15} strokeWidth={1.9} />
            ) : (
                <UiIcon icon={Sun} size={15} strokeWidth={1.9} />
            )}
        </Button>
    );
}
