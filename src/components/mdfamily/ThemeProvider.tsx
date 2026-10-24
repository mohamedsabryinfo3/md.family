"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** Applies the theme class to <html> based on the persisted store. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useStore((s) => s.theme);
  const lang = useStore((s) => s.lang);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.setAttribute("lang", lang);
    root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  }, [theme, lang]);

  return <>{children}</>;
}
