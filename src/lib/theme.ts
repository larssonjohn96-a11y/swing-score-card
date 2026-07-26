import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

export const THEME_KEY = "golf-theme";

/** Körs före hydrering i <head> så temat sätts utan blink. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t!=='light'){t='dark'}document.documentElement.classList.remove('dark','light');document.documentElement.classList.add(t);}catch(e){document.documentElement.classList.add('dark');}})();`;

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    const initial: Theme = stored === "light" ? "light" : "dark";
    setTheme(initial);
    apply(initial);
  }, []);

  function changeTheme(next: Theme) {
    setTheme(next);
    apply(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
  }

  return { theme, setTheme: changeTheme, toggle: () => changeTheme(theme === "dark" ? "light" : "dark") };
}
