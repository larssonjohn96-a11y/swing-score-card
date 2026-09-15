import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

export const THEME_KEY = "golf-theme";

/**
 * Dark mode is temporarily paused. This runs before hydration so the app is
 * forced into light mode before the first visible render, regardless of a
 * previously saved preference.
 */
export const THEME_SCRIPT = `(function(){try{document.documentElement.classList.remove('dark','light');document.documentElement.classList.add('light');document.documentElement.style.colorScheme='light';localStorage.setItem('${THEME_KEY}','light');}catch(e){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');document.documentElement.style.colorScheme='light';}})();`;

function applyLight() {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add("light");
  root.style.colorScheme = "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    applyLight();
    setTheme("light");
    try {
      window.localStorage.setItem(THEME_KEY, "light");
    } catch {
      /* ignore */
    }
  }, []);

  function changeTheme(_next: Theme) {
    // Dark mode is intentionally disabled for now.
    setTheme("light");
    applyLight();
    try {
      window.localStorage.setItem(THEME_KEY, "light");
    } catch {
      /* ignore */
    }
  }

  return { theme, setTheme: changeTheme, toggle: () => changeTheme("light") };
}
