import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchBunkerLeaderboard,
  fetchDrillLeaderboard,
  type BunkerRow,
  type DrillRow,
} from "@/lib/cloud";
import { formatScore } from "@/lib/drill";

export const Route = createFileRoute("/topplista")({
  head: () => ({
    meta: [
      { title: "Topplista – jämför dina golftester med andra" },
      {
        name: "description",
        content:
          "Se vem som har bäst score i 18-bollarsdrillen och lägst snitt i bunkertestet, och jämför dig med andra spelare.",
      },
      { property: "og:title", content: "Topplista – jämför dina golftester med andra" },
      {
        property: "og:description",
        content: "Bästa score i 18 bollar och lägst snitt i fot i bunkertestet.",
      },
    ],
  }),
  component: LeaderboardPage,
});

type Tab = "drill" | "bunker";

function LeaderboardPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("drill");
  const [drill, setDrill] = useState<DrillRow[]>([]);
  const [bunker, setBunker] = useState<BunkerRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([fetchDrillLeaderboard(), fetchBunkerLeaderboard()])
      .then(([d, b]) => {
        if (!active) return;
        setDrill(d);
        setBunker(b);
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : "Kunde inte hämta topplistan"));
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Jämför</p>
          <h1 className="text-4xl leading-none">Topplista</h1>
        </div>
        <Link
          to="/"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Tester
        </Link>
      </header>

      {loading ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Laddar …</p>
      ) : !user ? (
        <section className="mt-8 rounded-3xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Logga in för att se topplistan och jämföra dig med andra spelare.
          </p>
          <Link
            to="/konto"
            className="mt-4 block rounded-2xl bg-primary py-3 font-medium text-primary-foreground"
          >
            Logga in eller skapa konto
          </Link>
        </section>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1">
            {(
              [
                ["drill", "18 bollar"],
                ["bunker", "Bunkerslag"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-xl py-2 text-sm font-medium transition-colors ${
                  tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {error ? <p className="mt-4 text-center text-sm text-flag">{error}</p> : null}

          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {tab === "drill" ? "Högst score vinner" : "Lägst snitt i fot vinner"}
          </p>

          <section className="mt-2 space-y-2">
            {(tab === "drill" ? drill : bunker).length === 0 ? (
              <p className="rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                Inga resultat ännu. Kör ett test så hamnar du på listan.
              </p>
            ) : tab === "drill" ? (
              drill.map((r, i) => (
                <RowItem
                  key={r.user_id}
                  rank={i + 1}
                  name={r.display_name}
                  me={r.user_id === user.id}
                  big={formatScore(Number(r.best_score))}
                  info={`Snitt ${formatScore(Number(r.avg_score))} · ${r.sessions} pass`}
                />
              ))
            ) : (
              bunker.map((r, i) => (
                <RowItem
                  key={r.user_id}
                  rank={i + 1}
                  name={r.display_name}
                  me={r.user_id === user.id}
                  big={`${Number(r.best_avg_feet).toFixed(1)}`}
                  info={`Snitt ${Number(r.avg_feet).toFixed(1)} fot · ${r.sessions} test`}
                />
              ))
            )}
          </section>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Resultaten sparas under ditt konto och uppdateras när du kör ett nytt test.
          </p>
        </>
      )}
    </main>
  );
}

function RowItem({
  rank,
  name,
  big,
  info,
  me,
}: {
  rank: number;
  name: string;
  big: string;
  info: string;
  me: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border bg-card px-4 py-3 ${
        me ? "border-primary" : "border-border"
      }`}
    >
      <span className="w-6 font-[family-name:var(--font-display)] text-2xl text-flag">{rank}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg leading-tight">
          {name}
          {me ? <span className="ml-2 text-xs text-muted-foreground">(du)</span> : null}
        </p>
        <p className="text-xs text-muted-foreground">{info}</p>
      </div>
      <span className="font-[family-name:var(--font-display)] text-3xl leading-none text-primary">
        {big}
      </span>
    </div>
  );
}
