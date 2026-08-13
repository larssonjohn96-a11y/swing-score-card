import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Award, Check, ChevronRight, Lock, Medal, Sparkles, Star, Trophy, X } from "lucide-react";
import {
  computeAllTrophies,
  computePersonalRecords,
  groupTrophies,
  markCollected,
  TROPHY_GROUP_LABELS,
  type PersonalRecord,
  type Trophy as TrophyItem,
  type TrophyGroup,
  type TrophyTier,
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

type Tab = "trophies" | "records" | "milestones";

const TIER_STYLES: Record<
  TrophyTier,
  { text: string; bg: string; border: string; icon: typeof Medal; label: string }
> = {
  bronze: {
    text: "text-tier-bronze",
    bg: "bg-tier-bronze/15",
    border: "border-tier-bronze/40",
    icon: Medal,
    label: "Bronze",
  },
  silver: {
    text: "text-tier-silver",
    bg: "bg-tier-silver/15",
    border: "border-tier-silver/40",
    icon: Award,
    label: "Silver",
  },
  gold: {
    text: "text-tier-gold",
    bg: "bg-tier-gold/15",
    border: "border-tier-gold/40",
    icon: Trophy,
    label: "Gold",
  },
  platinum: {
    text: "text-tier-elite",
    bg: "bg-tier-elite/15",
    border: "border-tier-elite/40",
    icon: Star,
    label: "Platinum",
  },
};

function fmtDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso)
    .toLocaleDateString("sv-SE", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase()
    .replace(".", "");
}

function TrophyRoomPage() {
  const [trophies, setTrophies] = useState<TrophyItem[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [tab, setTab] = useState<Tab>("trophies");
  const [detail, setDetail] = useState<TrophyItem | null>(null);
  const [revealQueue, setRevealQueue] = useState<TrophyItem[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);

  const refresh = () => {
    const t = computeAllTrophies();
    setTrophies(t);
    setRecords(computePersonalRecords());
    setHighlights(topScores());
    return t;
  };

  useEffect(() => {
    refresh();
  }, []);

  const totalCount = trophies.length;
  const collectedCount = trophies.filter((t) => t.status === "collected").length;
  const uncollected = useMemo(() => trophies.filter((t) => t.status === "unlocked"), [trophies]);
  const grouped = groupTrophies(trophies);
  const nextUp = useMemo(
    () =>
      trophies
        .filter((t) => t.status !== "collected")
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 3),
    [trophies],
  );

  function collectOne(id: string) {
    markCollected(id);
    refresh();
  }

  function startCollectAll() {
    if (!uncollected.length) return;
    setRevealQueue(uncollected);
    setRevealIndex(0);
  }

  function advanceReveal() {
    const current = revealQueue[revealIndex];
    if (current) markCollected(current.id);
    if (revealIndex + 1 >= revealQueue.length) {
      setRevealQueue([]);
      setRevealIndex(0);
      refresh();
    } else {
      setRevealIndex((i) => i + 1);
    }
  }

  const reveal = revealQueue[revealIndex];

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-24 pt-8">
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-flag" strokeWidth={1.75} />
        <h1 className="text-4xl leading-none">TROPHY ROOM</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Dina rekord, milstolpar och prestationer.
      </p>

      <div className="mt-4">
        <p className="text-sm font-semibold">
          {collectedCount} / {totalCount} troféer upplåsta
        </p>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${totalCount ? (collectedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {uncollected.length > 0 && (
        <button
          type="button"
          onClick={startCollectAll}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-flag py-3.5 font-[family-name:var(--font-display)] text-lg text-background transition-transform active:scale-[0.98]"
        >
          <Sparkles className="h-4 w-4" />
          Collect All ({uncollected.length})
        </button>
      )}

      <div className="mt-6 flex gap-1 rounded-2xl bg-muted p-1">
        {(
          [
            { key: "trophies", label: "Trophies" },
            { key: "records", label: "Records" },
            { key: "milestones", label: "Milestones" },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-xl py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
              tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "trophies" && (
        <div className="mt-6">
          {nextUp.length > 0 && (
            <section>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Next up</p>
              <div className="mt-2 space-y-2">
                {nextUp.map((t) => (
                  <NextUpCard key={t.id} trophy={t} onOpen={() => setDetail(t)} />
                ))}
              </div>
            </section>
          )}

          {(["progress", "handicap", "skill"] as TrophyGroup[]).map((g) =>
            grouped[g].length > 0 ? (
              <section key={g} className="mt-6">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  {TROPHY_GROUP_LABELS[g]}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {grouped[g].map((t) => (
                    <TrophyCard
                      key={t.id}
                      trophy={t}
                      onOpen={() => setDetail(t)}
                      onCollect={() => collectOne(t.id)}
                    />
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </div>
      )}

      {tab === "records" && (
        <div className="mt-6">
          <div className="grid grid-cols-2 gap-2">
            {records.map((r) => (
              <PRCard key={r.testId} record={r} />
            ))}
          </div>
          <HighScoreCard highlights={highlights} />
        </div>
      )}

      {tab === "milestones" && (
        <div className="mt-6">
          <MilestonesTimeline trophies={trophies} />
        </div>
      )}

      {detail && (
        <TrophyDetailModal
          trophy={detail}
          onClose={() => setDetail(null)}
          onCollect={() => {
            collectOne(detail.id);
            setDetail(null);
          }}
        />
      )}

      {reveal && (
        <CollectRevealOverlay
          trophy={reveal}
          isLast={revealIndex + 1 >= revealQueue.length}
          onNext={advanceReveal}
        />
      )}
    </main>
  );
}

/* ------------------------------------------------------------ Next up */

function NextUpCard({ trophy, onOpen }: { trophy: TrophyItem; onOpen: () => void }) {
  const style = TIER_STYLES[trophy.tier];
  const Icon = style.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors active:bg-muted"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.bg} ${style.text}`}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-[family-name:var(--font-display)] text-base leading-none">
          {trophy.title.toUpperCase()}
        </p>
        {trophy.progressLabel ? (
          <>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.round(trophy.progress * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {trophy.remainingLabel ?? trophy.progressLabel}
            </p>
          </>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">{trophy.remainingLabel}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

/* --------------------------------------------------------- Trophy card */

function TrophyCard({
  trophy,
  onOpen,
  onCollect,
}: {
  trophy: TrophyItem;
  onOpen: () => void;
  onCollect: () => void;
}) {
  const style = TIER_STYLES[trophy.tier];
  const Icon = style.icon;
  const locked = trophy.status === "locked";
  const unlocked = trophy.status === "unlocked";
  const collected = trophy.status === "collected";

  return (
    <div
      className={`rounded-2xl border p-3 transition-colors ${
        unlocked ? `${style.border} bg-card` : "border-border bg-card"
      } ${locked ? "opacity-60" : ""}`}
      style={unlocked ? { boxShadow: `0 0 16px -4px var(--tier-${trophy.tier})` } : undefined}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <span
          className={`relative flex h-11 w-11 items-center justify-center rounded-full ${
            locked ? "bg-muted text-muted-foreground" : `${style.bg} ${style.text}`
          }`}
        >
          {locked ? <Lock className="h-4 w-4" /> : <Icon className="h-5 w-5" strokeWidth={1.75} />}
          {collected && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-2.5 w-2.5" />
            </span>
          )}
        </span>

        <p className="mt-2 font-[family-name:var(--font-display)] text-sm leading-tight">
          {trophy.title.toUpperCase()}
        </p>

        {locked && trophy.progressLabel && (
          <>
            <p className="mt-1 text-[10px] text-muted-foreground">{trophy.progressLabel}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/60 transition-all duration-500"
                style={{ width: `${Math.round(trophy.progress * 100)}%` }}
              />
            </div>
            {trophy.remainingLabel && (
              <p className="mt-1 text-[10px] text-muted-foreground">{trophy.remainingLabel}</p>
            )}
          </>
        )}

        {collected && trophy.achievedDate && (
          <p className="mt-1 text-[10px] text-muted-foreground">{fmtDate(trophy.achievedDate)}</p>
        )}
      </button>

      {unlocked && (
        <button
          type="button"
          onClick={onCollect}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-full bg-flag py-1.5 text-[11px] font-bold uppercase tracking-wide text-background"
        >
          Collect
        </button>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- PR card */

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
          <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Personal best
          </p>
          <p className="text-[10px] text-muted-foreground">{fmtDate(record.date)}</p>
        </>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">Inget test än</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------ Milestones tab */

function MilestonesTimeline({ trophies }: { trophies: TrophyItem[] }) {
  const timeline = useMemo(
    () =>
      trophies
        .filter((t) => t.status === "collected" && t.achievedDate)
        .sort((a, b) => (a.achievedDate! < b.achievedDate! ? 1 : -1)),
    [trophies],
  );

  if (!timeline.length) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Din golfresa börjar här. Samla din första trofé för att starta din tidslinje.
      </p>
    );
  }

  return (
    <div className="relative space-y-4 pl-6">
      <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border" />
      {timeline.map((t) => {
        const style = TIER_STYLES[t.tier];
        const Icon = style.icon;
        return (
          <div key={t.id} className="relative">
            <span
              className={`absolute -left-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full ${style.bg} ${style.text} ring-4 ring-background`}
            >
              <Icon className="h-2.5 w-2.5" strokeWidth={2} />
            </span>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {fmtDate(t.achievedDate)}
            </p>
            <p className="font-[family-name:var(--font-display)] text-lg leading-tight">
              {t.title.toUpperCase()}
            </p>
            {t.achievedDetail && (
              <p className="text-xs text-muted-foreground">{t.achievedDetail}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------- Detail modal */

function TrophyDetailModal({
  trophy,
  onClose,
  onCollect,
}: {
  trophy: TrophyItem;
  onClose: () => void;
  onCollect: () => void;
}) {
  const style = TIER_STYLES[trophy.tier];
  const Icon = style.icon;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-in slide-in-from-bottom-4 w-full max-w-md rounded-t-3xl bg-card p-6 pb-8 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border p-1.5 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          <span
            className={`flex h-20 w-20 items-center justify-center rounded-full ${
              trophy.status === "locked"
                ? "bg-muted text-muted-foreground"
                : `${style.bg} ${style.text}`
            }`}
          >
            {trophy.status === "locked" ? (
              <Lock className="h-8 w-8" />
            ) : (
              <Icon className="h-9 w-9" strokeWidth={1.5} />
            )}
          </span>
          {trophy.status !== "locked" && (
            <p className={`mt-2 text-[10px] font-bold uppercase tracking-[0.2em] ${style.text}`}>
              {style.label}
            </p>
          )}
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl leading-none">
            {trophy.title.toUpperCase()}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{trophy.description}</p>

          {trophy.status === "collected" && trophy.achievedDate && (
            <p className="mt-3 text-xs font-semibold text-primary">
              ✓ Upplåst {fmtDate(trophy.achievedDate)}
            </p>
          )}
          {trophy.achievedDetail && (
            <p className="mt-1 text-xs text-muted-foreground">{trophy.achievedDetail}</p>
          )}

          {trophy.breakdown && (
            <div className="mt-4 w-full space-y-1.5">
              {trophy.breakdown.map((b) => (
                <div
                  key={b.label}
                  className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-xs"
                >
                  <span
                    className={b.done ? "font-medium text-foreground" : "text-muted-foreground"}
                  >
                    {b.label}
                  </span>
                  <span className={b.done ? "text-primary" : "text-muted-foreground"}>
                    {b.done ? <Check className="h-3.5 w-3.5" /> : b.detail}
                  </span>
                </div>
              ))}
            </div>
          )}

          {trophy.status === "locked" && trophy.progressLabel && !trophy.breakdown && (
            <div className="mt-4 w-full">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.round(trophy.progress * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {trophy.progressLabel}
                {trophy.remainingLabel ? ` · ${trophy.remainingLabel}` : ""}
              </p>
            </div>
          )}

          {trophy.status === "unlocked" && (
            <button
              type="button"
              onClick={onCollect}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-flag py-3.5 font-[family-name:var(--font-display)] text-lg text-background"
            >
              <Sparkles className="h-4 w-4" />
              Collect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------ Collect reveal */

function CollectRevealOverlay({
  trophy,
  isLast,
  onNext,
}: {
  trophy: TrophyItem;
  isLast: boolean;
  onNext: () => void;
}) {
  const style = TIER_STYLES[trophy.tier];
  const Icon = style.icon;

  return (
    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-[#0b1710] px-8 text-center text-white">
      <p className="animate-in fade-in text-xs font-semibold uppercase tracking-[0.35em] text-white/40 duration-500">
        Trophy Unlocked
      </p>

      <div
        key={trophy.id}
        className="animate-in fade-in zoom-in-90 relative mt-6 flex h-28 w-28 items-center justify-center rounded-full duration-500"
        style={
          {
            background: `radial-gradient(circle, var(--tier-${trophy.tier}) 0%, transparent 70%)`,
          } as React.CSSProperties
        }
      >
        <span
          className={`flex h-20 w-20 items-center justify-center rounded-full ${style.bg} ${style.text}`}
        >
          <Icon className="h-9 w-9" strokeWidth={1.5} />
        </span>
      </div>

      <h2
        className="animate-in fade-in slide-in-from-bottom-2 mt-6 font-[family-name:var(--font-display)] text-3xl leading-none duration-500"
        style={{ animationDelay: "150ms", animationFillMode: "both" }}
      >
        {trophy.title.toUpperCase()}
      </h2>
      <p
        className="animate-in fade-in slide-in-from-bottom-2 mt-2 max-w-xs text-sm text-white/60 duration-500"
        style={{ animationDelay: "250ms", animationFillMode: "both" }}
      >
        {trophy.description}
      </p>

      <button
        type="button"
        onClick={onNext}
        className="animate-in fade-in mt-10 flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 font-[family-name:var(--font-display)] text-lg text-primary-foreground duration-500"
        style={{ animationDelay: "450ms", animationFillMode: "both" }}
      >
        {isLast ? "Klar" : "Nästa"}
      </button>
    </div>
  );
}
