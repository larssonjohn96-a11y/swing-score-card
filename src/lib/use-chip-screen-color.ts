import { useEffect } from "react";

/** Extend the reveal into mobile safe areas and restore page chrome on exit. */
export function useChipScreenColor(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const meta = theme ?? document.createElement("meta");
    const oldTheme = meta.getAttribute("content");
    if (!theme) {
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = "#2563eb";
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const oldViewport = viewport?.content;
    if (viewport)
      viewport.content =
        (oldViewport ?? "width=device-width, initial-scale=1").replace(
          /,?\s*viewport-fit=[^,]+/g,
          "",
        ) + ", viewport-fit=cover";
    const backgrounds = [document.documentElement, document.body].map((element) => ({
      element,
      value: element.style.getPropertyValue("background-color"),
      priority: element.style.getPropertyPriority("background-color"),
    }));
    backgrounds.forEach(({ element }) =>
      element.style.setProperty("background-color", "#2563eb", "important"),
    );
    return () => {
      backgrounds.forEach(({ element, value, priority }) =>
        value
          ? element.style.setProperty("background-color", value, priority)
          : element.style.removeProperty("background-color"),
      );
      if (theme) {
        if (oldTheme === null) meta.removeAttribute("content");
        else meta.content = oldTheme;
      } else meta.remove();
      if (viewport && oldViewport !== undefined) viewport.content = oldViewport;
    };
  }, [active]);
}
