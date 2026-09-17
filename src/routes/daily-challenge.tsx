import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Crosshair, Flame, Heart, RotateCcw, Target, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  buildChallenge,
  challengeStreaks,
  ensureTodayRecord,
  loadDailyChallengeState,
  recordDailyAttempt,
  recentChallengeHistory,
  selectDailyChallenge,
  todayKey,
  type DailyChallengeCategory,
  type DailyChallengeRecord,
} from "@/lib/daily-challenge";

export const Route = createFileRoute("/daily-challenge")({
  head: () => ({ meta: [{ title: "Daily Challenge – SG4" }] }),
  component: DailyChallengePage,
});

const CATEGORY_STYLE: Record<DailyChallengeCategory, { icon: typeof Target; tone: string; iconTone: string }> = {
  putting: { icon: Target, tone: "border-violet-200 bg-violet-50/70", iconTone: "bg-violet-100 text-violet-700" },
  chipping: { icon: Crosshair, tone: "border-emerald-200 bg-emerald-50/70", iconTone: "bg-emerald-100 text-emerald-700" },
  driver: { icon: RotateCcw, tone: "border-blue-200 bg-blue-50/70", iconTone: "bg-blue-100 text-blue-700" },
  bunker: { icon: Trophy, tone: "border-amber-200 bg-amber-50/70", iconTone: "bg-amber-100 text-amber-700" },
  approach: { icon: Crosshair, tone: "border-rose-200 bg-rose-50/70", iconTone: "bg-rose-100 text-rose-700" },
};

function HeartRow({ misses }: { misses: number }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`${Math.max(0, 3 - misses)} liv kvar`}>
      {[0, 1, 2].map((index) => (
        <Heart key={index} className={`h-8 w-8 ${index < 3 - misses ? "fill-emerald-500 text-emerald-500" : "fill-slate-200 text-slate-300"}`} strokeWidth={1.8} />
      ))}
    </div>
  );
}

function DailyChallengePage() {
  const [record, setRecord] = useState<DailyChallengeRecord | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    setRecord(ensureTodayRecord().record);
  }, []);

  const state = useMemo(() => loadDailyChallengeState(), [version, record]);
  const streaks = useMemo(() => challengeStreaks(state), [state]);
  const history = useMemo(() => recentChallengeHistory(state, 21), [state]);
  const selected = record?.selected ? buildChallenge(record.selected, state) : null;

  const choose = (category: DailyChallengeCategory) => {
    const next = selectDailyChallenge(category);
    setRecord(next);
    setVersion((value) => value + 1);
  };

  const attempt = (hit: boolean) => {
    const next = recordDailyAttempt(hit);
    if (next) setRecord(next);
    setVersion((value) => value + 1);
  };

  if (!record) {
    return <main className="mx-auto min-h-screen w-full max-w-md bg-[#f7f8f4] px-5 py-8"><div className="h-32 animate-pulse rounded-[28px] bg-white" /></main>;
  }

  const complete = record.status === "won" || record.status === "lost";
  const attempts = record.successes + record.misses;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-[#f7f8f4] pb-28 text-[#071b15]">
      <header className="flex items-center justify-between px-5 pb-4 pt-6">
        <Link to="/" aria-label="Tillbaka" className="flex h-11 w-11 items-center justify-center rounded-full border border-black/[.06] bg-white shadow-sm">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-700/65">SG4</p>
          <p className="font-display text-[21px] leading-none">Daily Challenge</p>
        </div>
        <div className="flex h-11 min-w-11 items-center justify-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 text-orange-600">
          <Flame className="h-4 w-4 fill-orange-500" />
          <span className="text-sm font-black">{streaks.daily}</span>
        </div>
      </header>

      {!record.selected ? (
        <section className="px-5">
          <div className="rounded-[30px] bg-[#082d23] p-5 text-white shadow-[0_22px_48px_-30px_rgba(4,47,36,.75)]">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              Challenge Point
              <span className="h-2 w-2 rounded-full bg-red-400" />
            </div>
            <h1 className="mt-3 font-display text-[42px] leading-[.92]">Välj dagens challenge</h1>
            <p className="mt-3 max-w-[30ch] text-sm leading-relaxed text-white/72">Du får tre val. När du startar låses dagens challenge. En ny kommer imorgon.</p>
          </div>

          <div className="mt-5 grid gap-3">
            {record.offered.map((category) => {
              const challenge = buildChallenge(category, state);
              const style = CATEGORY_STYLE[category];
              const Icon = style.icon;
              return (
                <button key={category} type="button" onClick={() => choose(category)} className={`flex items-center gap-4 rounded-[26px] border p-4 text-left shadow-[0_12px_30px_-26px_rgba(15,23,42,.4)] transition active:scale-[.985] ${style.tone}`}>
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${style.iconTone}`}><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-black uppercase tracking-[.16em] text-muted-foreground">{challenge.eyebrow}</span>
                    <span className="mt-1 block font-display text-[23px] leading-none">{challenge.label}</span>
                    <span className="mt-2 block text-[13px] leading-snug text-muted-foreground">{challenge.shortTask}</span>
                    <span className="mt-1.5 block text-[11px] font-semibold text-emerald-700">Din nivå: {Math.round(challenge.baseline * 100)}%</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">Varje uppgift kalibreras runt din Challenge Point – ungefär där utmaningen är möjlig men inte självklar.</p>
        </section>
      ) : (
        <section className="px-5">
          <div className="rounded-[32px] border border-white bg-white p-5 shadow-[0_18px_50px_-34px_rgba(15,23,42,.45)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-700">{selected?.label} · Challenge Point</p>
                <h1 className="mt-2 font-display text-[34px] leading-[.95]">{selected?.task}</h1>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-center">
                <div className="text-xl font-black text-emerald-700">{record.successes}/{record.target}</div>
                <div className="text-[9px] font-bold uppercase tracking-wide text-emerald-700/60">Klara</div>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] bg-[#f4f7f3] p-5">
              <HeartRow misses={record.misses} />
              <div className="mt-3 text-center text-xs text-muted-foreground">{3 - record.misses} liv kvar · {attempts}/{record.maxAttempts} försök</div>
            </div>

            {!complete ? (
              <div className="mt-5">
                <p className="mb-3 text-center text-sm font-semibold">Registrera nästa försök</p>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => attempt(false)} className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-4 text-sm font-black text-red-600 active:scale-[.98]">Miss</button>
                  <button type="button" onClick={() => attempt(true)} className="rounded-[22px] bg-emerald-600 px-4 py-4 text-sm font-black text-white shadow-[0_12px_25px_-16px_rgba(5,150,105,.8)] active:scale-[.98]">Klar</button>
                </div>
              </div>
            ) : (
              <div className={`mt-5 rounded-[26px] p-5 text-center ${record.status === "won" ? "bg-emerald-600 text-white" : "bg-slate-900 text-white"}`}>
                <div className="text-[10px] font-black uppercase tracking-[.18em] opacity-70">Dagens challenge</div>
                <div className="mt-2 font-display text-[38px] leading-none">{record.status === "won" ? "Klarad!" : "Nästan."}</div>
                <p className="mx-auto mt-3 max-w-[27ch] text-sm leading-relaxed opacity-80">{record.status === "won" ? "Du slog dagens Challenge Point. Din nivå uppdateras till nästa gång." : "Dagens challenge är avslutad. Streaken för genomförande lever vidare – ny chans imorgon."}</p>
              </div>
            )}
          </div>

          {complete && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[24px] bg-white p-4 text-center shadow-sm"><div className="text-3xl font-black">{streaks.daily}</div><div className="mt-1 text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">Daily streak</div></div>
              <div className="rounded-[24px] bg-white p-4 text-center shadow-sm"><div className="text-3xl font-black">{streaks.wins}</div><div className="mt-1 text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">Win streak</div></div>
            </div>
          )}
        </section>
      )}

      <section className="mt-8 px-5">
        <div className="flex items-end justify-between">
          <div><h2 className="text-xl font-black">Historik</h2><p className="mt-1 text-xs text-muted-foreground">Senaste 21 challenges</p></div>
          <span className="text-[10px] font-black uppercase tracking-[.16em] text-muted-foreground">{todayKey()}</span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {Array.from({ length: 21 }, (_, index) => {
            const item = history[index];
            return <div key={index} className={`aspect-square rounded-[12px] border ${!item ? "border-black/[.04] bg-white/55" : item.status === "won" ? "border-emerald-300 bg-emerald-500" : "border-slate-300 bg-slate-300"}`} title={item?.date ?? ""} />;
          })}
        </div>
      </section>
    </main>
  );
}
