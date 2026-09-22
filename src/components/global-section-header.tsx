import { Link, useLocation } from "@tanstack/react-router";

const items = [
  { to: "/", label: "Hem", paths: ["/"] },
  { to: "/spela-runda", label: "Spel", paths: ["/spela-runda"] },
  { to: "/spela", label: "Match", paths: ["/spela", "/match", "/match-bot"] },
  { to: "/utveckling", label: "Jämför", paths: ["/utveckling", "/jamfor"] },
  { to: "/vanner", label: "Vänner", paths: ["/vanner"] },
] as const;

export function GlobalSectionHeader() {
  const { pathname } = useLocation();
  const active = (paths: readonly string[]) => paths.some(path => path === "/" ? pathname === "/" : pathname.startsWith(path));
  return <header className="sticky top-0 z-[60] border-b border-border/70 bg-background/88 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-2xl">
    <nav className="mx-auto flex w-full max-w-md gap-2 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Huvudnavigation">
      {items.map(item => <Link key={item.label} to={item.to} className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black transition ${active(item.paths) ? "border-blue-400 bg-blue-50 text-blue-700" : "border-border bg-card/85 text-foreground"}`}>{item.label}</Link>)}
    </nav>
  </header>;
}
