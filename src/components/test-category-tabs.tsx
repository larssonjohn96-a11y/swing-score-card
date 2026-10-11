import { Link } from "@tanstack/react-router";

type TestCategory = "hcp" | "advanced";

const TABS = [
  { id: "hcp", label: "HCP-tester", to: "/spela-runda" },
  { id: "advanced", label: "Avancerade tester", to: "/standardiserade-tester" },
] as const;

/** Shared tabs across the two test hubs; each test keeps its original route and history. */
export function TestCategoryTabs({ selected }: { selected: TestCategory }) {
  return (
    <nav
      aria-label="Typ av tester"
      className="sticky top-[calc(58px+env(safe-area-inset-top))] z-40 border-b border-border/60 bg-background/95 px-5 py-3 backdrop-blur-xl"
    >
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-muted/50 p-1">
        {TABS.map((tab) => {
          const active = tab.id === selected;
          return (
            <Link
              key={tab.id}
              to={tab.to}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 min-w-0 items-center justify-center rounded-xl px-2 text-center text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                active ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground active:bg-card"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
