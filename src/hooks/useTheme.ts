import { useState, useEffect } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "sai-comm-theme";

export function useTheme() {
  // Always starts "light" on both the server and the client's first paint —
  // reading localStorage/matchMedia here (even guarded by `typeof window`)
  // made the client's very first render disagree with the server-rendered
  // HTML, which React flags as a hydration mismatch. The real stored/system
  // preference is applied after mount instead, below.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // First-ever visit (nothing in storage yet) always starts light,
    // regardless of the OS/browser's prefers-color-scheme — dark mode is
    // opt-in via the toggle, not something sprung on a first-time visitor.
    // Once they've picked a theme (light or dark), that choice is what
    // gets restored on every later visit.
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial = stored === "dark" || stored === "light" ? stored : "light";
    setTheme(initial);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return { theme, toggleTheme, isDark: theme === "dark" };
}
