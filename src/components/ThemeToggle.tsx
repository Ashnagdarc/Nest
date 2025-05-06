"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-2 rounded border focus:outline-none focus:ring"
            aria-label="Toggle Dark Mode"
            title="Toggle light/dark mode"
        >
            {resolvedTheme === "dark" ? "🌙" : "☀️"}
        </button>
    );
} 