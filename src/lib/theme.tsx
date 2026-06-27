import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "claro" | "escuro";
type Ctx = { theme: Theme; toggle: () => void };

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("claro");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("vozia-theme")) as Theme | null;
    const initial: Theme = saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro");
    setTheme(initial);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "escuro") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("vozia-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme((t) => (t === "claro" ? "escuro" : "claro")) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  return ctx;
}
