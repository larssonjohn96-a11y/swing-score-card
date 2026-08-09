import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Award, Check, Flag, Lock, Target, Trophy } from "lucide-react";
import {
  computeAchievements,
  computeMilestones,
  computePersonalRecords,
  countUncollected,
  markCollected,
  type PersonalRecord,
  type ProgressItem,
} from "@/lib/trophy-room";
import { hcpLabel } from "@/lib/sg-handicap";
import { HighScoreCard } from "@/components/home-dashboard";
import { topScores, type Highlight } from "@/lib/highlights";

export const Route = createFileRoute("/trophy")({
  head: () => ({
    meta: [
      { title: "Trophy Room – SG4" },
      {
        name: "description",
        content: "Dina rekord, milstolpar och prestationer i SG4.",
      },
    ],
  }),
  component: TrophyRoomPage,
});

function TrophyRoomPage() {
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [milestones, setMilestones] = useState<ProgressItem[]>([]);
  const [achievements, setAchievements] = useState<ProgressItem[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  const refresh = () => {
    setRecords(computePersonalRecords());
    setMilestones(computeMilestones());
    setAchievements(computeAchievements());
    setHighlights(topScores());
  };

  useEffect(refresh, []);

  function handleCollect(id: string) {
    markCollected(id);
    refresh();
  }

  const prCount = records.filter((r) => r.hcp !== undefined).length;
  const newItems = useMemo(
    () => [...milestones, ...achievements].filter((i) => i.status === "unlocked"),
    [milestones, achievements],
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-24 pt-8">
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-flag" strokeWidth={1.75} />
        <h1 className="text-4xl leading-none">TROPHY ROOM</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Dina rekord, milstolpar och prestationer.
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {prCount} PR · {milestones.length} Milestones · {achievements.length} Achievements
      </p>

      {newItems.length > 0 && (
        <section className="mt-6">
          <p className="text-xs uppercase tracking-[0.25em] text-flag">New</p>
          <div className="mt-2 space-y-2">
            {newItems.map((item) => (
              <NewItemRow key={item.id} item={item} onCollect={() => handleCollect(item.id)} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Personal Records
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {records.map((r) => (
            <PRCard key={r.testId} record={r} />
          ))}
        </div>
      </section>

      <HighScoreCard highlights={highlights} />

      <section className="mt-8">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Milestones</p>
        <div className="mt-3 space-y-2">
          {milestones.map((m) => (
            <ProgressCard key={m.id} item={m} icon={Flag} onCollect={() => handleCollect(m.id)} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Achievements</p>
        <div className="mt-3 space-y-2">
          {achievements.map((a) => (
            <ProgressCard key={a.id} item={a} icon={Award} onCollect={() => handleCollect(a.id)} />
          ))}
        </div>
      </section>
    </main>
  );
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso)
    .toLocaleDateString("sv-SE", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase()
    .replace(".", "");
}

function PRCard({ record }: { record: PersonalRecord }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        {record.title}
      </p>
      {record.hcp !== undefined ? (
        <>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none text-primary">
            HCP {hcpLabel(record.hcp)}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">{fmtDate(record.date)}</p>
        </>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">Inget test än</p>
      )}
    </div>
  );
}

function NewItemRow({ item, onCollect }: { item: ProgressItem; onCollect: () => void }) {
  const [collecting, setCollecting] = useState(false);

  function handleClick() {
    setCollecting(true);
    window.setTimeout(onCollect, 700);
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-flag/40 bg-flag/5 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-[family-name:var(--font-display)] text-lg leading-none">
          {item.title.toUpperCase()}
        </p>
        {item.achievedDetail && (
          <p className="mt-1 text-xs text-muted-foreground">{item.achievedDetail}</p>
        )}
      </div>
      <button
        onClick={handleClick}
        disabled={collecting}
        className="shrink-0 rounded-full bg-flag px-4 py-2 text-xs font-bold uppercase tracking-wide text-background transition-opacity disabled:opacity-60"
      >
        {collecting ? (
          <span className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5" /> Tillagd
          </span>
        ) : (
          "Collect"
        )}
      </button>
    </div>
  );
}

function ProgressCard({
  item,
  icon: Icon,
  onCollect,
}: {
  item: ProgressItem;
  icon: typeof Award;
  onCollect: () => void;
}) {
  const [collecting, setCollecting] = useState(false);

  function handleCollect() {
    setCollecting(true);
    window.setTimeout(onCollect, 700);
  }

  const locked = item.status === "locked";

  return (
    <div
      className={`rounded-2xl border p-4 ${
        locked ? "border-border/60 bg-card/50 opacity-70" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            item.status === "collected"
              ? "bg-primary/15 text-primary"
              : item.status === "unlocked"
                ? "bg-flag/15 text-flag"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {locked ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" strokeWidth={1.75} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-[family-name:var(--font-display)] text-lg leading-none">
              {item.title.toUpperCase()}
            </p>
            {item.status === "collected" && <Check className="h-4 w-4 shrink-0 text-primary" />}
          </div>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">{item.description}</p>

          {item.status !== "locked" && item.achievedDetail && (
            <p className="mt-1.5 text-xs font-medium text-foreground">
              {item.status === "collected" && item.achievedDate
                ? `${fmtDate(item.achievedDate)} · `
                : ""}
              {item.achievedDetail}
            </p>
          )}

          {item.status === "locked" && item.remainingLabel && (
            <p className="mt-1.5 text-xs text-muted-foreground">{item.remainingLabel}</p>
          )}

          {item.breakdown && (
            <div className="mt-2 space-y-1">
              {item.breakdown.map((b) => (
                <div key={b.label} className="flex items-center justify-between text-xs">
                  <span className={b.done ? "text-foreground" : "text-muted-foreground"}>
                    {b.label}
                  </span>
                  <span className={b.done ? "text-primary" : "text-muted-foreground"}>
                    {b.done ? <Check className="h-3.5 w-3.5" /> : b.detail}
                  </span>
                </div>
              ))}
            </div>
          )}

          {(item.status === "locked" || item.status === "unlocked") &&
            item.progressLabel &&
            !item.breakdown && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{item.progressLabel}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.round(item.progress * 100)}%` }}
                  />
                </div>
              </div>
            )}

          {item.status === "unlocked" && (
            <button
              onClick={handleCollect}
              disabled={collecting}
              className="mt-3 flex items-center gap-1.5 rounded-full bg-flag px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-background disabled:opacity-60"
            >
              {collecting ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Tillagd
                </>
              ) : (
                <>
                  <Target className="h-3.5 w-3.5" /> Collect
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
