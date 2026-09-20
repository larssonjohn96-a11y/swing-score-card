import { useEffect, useState } from "react";
import { parseCourse as parseDriver, courseStorageKey as driverKey } from "@/lib/driver-course";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Flag,
  Sun,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { useWarmUp } from "@/lib/use-warm-up";
import {
  STATIONS,
  defaults,
  startWarm,
  plan,
  allocation,
  remaining,
  switchStation,
  finishStation,
  snooze,
  followupDue,
  type Station,
  type Feeling,
  type Prefs,
  type WarmSession,
} from "@/lib/warm-up";
import {
  parseCourse as parsePutt,
  courseStorageKey as puttKey,
  COURSE_DISTANCES,
} from "@/lib/putt-course";
const button =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-40";
const secondary =
  "min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600";
const feelings: [Feeling, string][] = [
  ["good", "Bra"],
  ["medium", "Okej"],
  ["notyet", "Inte riktigt"],
];
const mins = (n: number) => (n > 0 && n < 1 ? "<1" : Math.max(0, Math.round(n)));
function useClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return now;
}
export function WarmUpPage() {
  const { user, loading } = useAuth();
  useHideBottomNav(true);
  return <WarmUpExperience key={user?.id ?? "guest"} userId={user?.id ?? null} loading={loading} />;
}
function WarmUpExperience({ userId, loading }: { userId: string | null; loading: boolean }) {
  const { state, ready, error, save, update } = useWarmUp(userId, loading),
    clock = useClock(),
    now = Math.max(clock, state.active?.stationAt ?? 0);
  const [prefs, setPrefs] = useState<Prefs>(defaults),
    [initialized, setInitialized] = useState(false),
    [feedback, setFeedback] = useState(false),
    [summary, setSummary] = useState<WarmSession | null>(null),
    [rationale, setRationale] = useState(false),
    [notice, setNotice] = useState(false),
    [profilePutt, setProfilePutt] = useState(false),
    [profileRange, setProfileRange] = useState(false),
    [useProfile, setUseProfile] = useState(true),
    [extra, setExtra] = useState<Station | null>(null);
  useEffect(() => {
    if (ready && !initialized) {
      setPrefs(state.prefs);
      setInitialized(true);
      try {
        const rounds = parsePutt(localStorage.getItem(puttKey(userId)))
          .history.filter((r) => r.finishedAt > Date.now() - 90 * 86400000)
          .slice(-10);
        const long = rounds.flatMap((r) =>
          r.holes.flatMap((h, i) => (COURSE_DISTANCES[i] >= 8 && h.length ? [h[0]] : [])),
        );
        const drives = parseDriver(localStorage.getItem(driverKey(userId)))
          .history.filter((r) => r.finishedAt > Date.now() - 90 * 86400000)
          .slice(-5)
          .flatMap((r) => r.holes.flat());
        setProfileRange(
          drives.length >= 18 && drives.filter((s) => s.lateral > 20).length / drives.length >= 0.3,
        );
        setProfilePutt(long.length >= 9 && long.filter((n) => n >= 3).length / long.length >= 0.25);
      } catch {}
    }
  }, [ready, initialized, state.prefs, userId]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.active?.id, state.active?.current, feedback, summary?.id]);
  const active = state.active,
    atTee = !!active && now >= active.teeAt - active.reserve * 60000,
    due = !!active && !active.manual && now >= active.dueAt;
  const lastMore = [...state.history].reverse().find((s) => s.followup === "done")?.more;
  const effective: Prefs = { ...prefs, weights: { ...prefs.weights } };
  if (prefs.mode === "guided" && profilePutt && useProfile && prefs.order.includes("putt"))
    effective.weights.putt += 3;
  if (prefs.mode === "guided" && profileRange && useProfile && prefs.order.includes("range"))
    effective.weights.range += 3;
  if (extra && prefs.order.includes(extra)) effective.weights[extra] += 4;
  const reserve = Math.min(3, Math.max(1, Math.floor(prefs.minutes / 10))),
    preview = allocation(prefs.order, effective.weights, prefs.minutes - reserve);
  useEffect(() => {
    if (!active || active.manual || !due || document.visibilityState !== "visible") return;
    const key = `warm-reminded:${active.id}:${active.dueAt}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "yes");
    } catch {}
    if (notice && typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("Redo för första tee", {
          body: atTee
            ? "Dags att ta dig till första tee."
            : `Redo att gå vidare från ${STATIONS[active.current].short.toLowerCase()}?`,
          tag: "sg4-warm-up",
        });
      } catch {}
    }
  }, [active?.id, active?.dueAt, active?.manual, due, atTee, notice]);
  function persist(s: WarmSession) {
    const ok = update((prev) =>
      s.finishedAt
        ? {
            ...prev,
            active: null,
            history: [...prev.history.filter((r) => r.id !== s.id), s].slice(-100),
          }
        : { ...prev, active: s },
    );
    if (ok && s.finishedAt) setSummary(s);
    return ok;
  }
  function next(feeling?: Feeling, skip = false) {
    if (!active) return;
    if (persist(finishStation(active, Date.now(), feeling, skip))) setFeedback(false);
  }
  function toggle(k: Station) {
    setPrefs((p) => ({
      ...p,
      order: p.order.includes(k) ? p.order.filter((s) => s !== k) : [...p.order, k],
    }));
  }
  function move(i: number, delta: number) {
    setPrefs((p) => {
      const order = [...p.order];
      [order[i], order[i + delta]] = [order[i + delta], order[i]];
      return { ...p, order, mode: "custom" };
    });
  }
  if (!ready) return <main className="p-8 text-center">Förbereder din uppvärmning…</main>;
  return (
    <main className="mx-auto min-h-[100dvh] max-w-md bg-slate-50 px-5 pb-8 pt-[max(16px,env(safe-area-inset-top))] text-slate-950">
      <div className="mb-5 flex items-center justify-between">
        <Link
          to="/"
          data-local-navigation
          aria-label="Tillbaka till startsidan"
          className="flex h-11 w-11 items-center justify-center rounded-full border bg-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
          My Warm Up
        </span>
      </div>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm">
          Kunde inte spara på enheten. Försök igen innan du lämnar sidan.
        </p>
      )}
      {summary ? (
        <section className="space-y-5 rounded-3xl border bg-white p-6 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check size={30} />
          </span>
          <h1 className="text-3xl font-black">Ta med känslan till första tee</h1>
          <p className="text-slate-500">
            Din uppvärmning är klar. Behåll din vanliga rutin och ta ett slag i taget.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {summary.done.map((k) => (
              <span key={k} className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                ✓ {STATIONS[k].short}
              </span>
            ))}
          </div>
          <p className="text-sm text-slate-500">
            Nästa gång du öppnar startsidan efter rundan kan du berätta vad som fungerade.
          </p>
          <Link to="/" data-local-navigation className={button}>
            Klart – till startsidan
          </Link>
          <button className={secondary} onClick={() => setSummary(null)}>
            Se min rutin
          </button>
        </section>
      ) : active ? (
        <div className="space-y-4">
          <div className="rounded-3xl bg-blue-600 p-5 text-white">
            <p className="flex items-center gap-2 text-sm">
              <Clock size={16} />{" "}
              {now >= active.teeAt
                ? "Din planerade starttid har passerat"
                : `${Math.ceil((active.teeAt - now) / 60000)} min till första tee`}
            </p>
            <h1 className="mt-2 text-3xl font-black">{STATIONS[active.current].title}</h1>
            <p className="mt-2 text-blue-100">{STATIONS[active.current].focus}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {active.order.map((k) => (
              <button
                disabled={
                  active.done.includes(k) || active.skipped.includes(k) || k === active.current
                }
                key={k}
                onClick={() => {
                  persist(switchStation(active, k, Date.now()));
                  setFeedback(false);
                }}
                className={`min-h-10 rounded-full px-3 text-sm font-bold ${k === active.current ? "bg-blue-100 text-blue-700" : "bg-white text-slate-500"}`}
              >
                {active.done.includes(k) ? "✓ " : active.skipped.includes(k) ? "– " : ""}
                {STATIONS[k].short}
              </button>
            ))}
          </div>
          {atTee ? (
            <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-bold">Dags att ta dig till första tee</p>
              <p className="mt-1 text-sm text-amber-900">
                Ta med känslan du har. Du behöver inte hinna alla stationer.
              </p>
              <button
                className={`${button} mt-3`}
                onClick={() =>
                  persist({
                    ...active,
                    done: [...active.done, active.current],
                    finishedAt: Date.now(),
                  })
                }
              >
                Avsluta uppvärmningen
              </button>
            </div>
          ) : due && !feedback ? (
            <div
              role="status"
              className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4"
            >
              <p className="font-bold">
                {remaining(active).length > 1
                  ? `Dags för ${STATIONS[remaining(active).find((k) => k !== active.current)!].title.toLowerCase()}?`
                  : "Känner du dig redo?"}
              </p>
              <p className="text-sm text-slate-600">
                {Math.ceil((active.teeAt - now) / 60000)} minuter kvar till start. Du bestämmer när
                du går vidare.
              </p>
              <button className={button} onClick={() => setFeedback(true)}>
                Gå vidare
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button className={secondary} onClick={() => persist(snooze(active, Date.now()))}>
                  {active.teeAt - active.reserve * 60000 - now >= 180000
                    ? "3 minuter till"
                    : "Lite mer tid"}
                </button>
                <button className={secondary} onClick={() => persist({ ...active, manual: true })}>
                  Jag styr själv
                </button>
              </div>
              {remaining(active).length > 2 &&
                active.teeAt - now < 10 * 60000 &&
                remaining(active).includes("putt") &&
                active.current !== "putt" && (
                  <button
                    className="text-sm font-bold text-blue-700"
                    onClick={() => {
                      const rest = remaining(active).filter(
                        (k) => k !== "putt" && k !== active.current,
                      );
                      persist(
                        switchStation(
                          {
                            ...active,
                            done: [...active.done, active.current],
                            skipped: [...active.skipped, ...rest],
                          },
                          "putt",
                          Date.now(),
                        ),
                      );
                    }}
                  >
                    Ont om tid? Gå direkt till puttinggreen →
                  </button>
                )}
            </div>
          ) : null}
          <section className="rounded-3xl border bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Ditt fokus</p>
            <p className="mt-3 text-lg leading-relaxed">{STATIONS[active.current].text}</p>
            {active.current === "range" && (
              <div className="mt-5 flex justify-between rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-500">
                <span>Wedgar</span>
                <span>→</span>
                <span>Järn</span>
                <span>→</span>
                <span>Driver</span>
              </div>
            )}
            <p className="mt-4 text-sm text-slate-400">
              {active.manual
                ? "I din takt"
                : `Cirka ${Math.max(0, Math.ceil((active.dueAt - now) / 60000))} min kvar på stationen`}{" "}
              · ingen slagregistrering
            </p>
          </section>
          {feedback ? (
            <section className="space-y-3 rounded-3xl border bg-white p-5">
              <h2 className="text-lg font-bold">{STATIONS[active.current].question}</h2>
              <div className="grid grid-cols-3 gap-2">
                {feelings.map(([v, t]) => (
                  <button key={v} className={secondary} onClick={() => next(v)}>
                    {t}
                  </button>
                ))}
              </div>
              <button className="min-h-11 w-full text-sm text-slate-500" onClick={() => next()}>
                Hoppa över frågan och gå vidare
              </button>
              <button
                className="min-h-11 w-full text-sm font-bold text-blue-600"
                onClick={() => {
                  persist(snooze(active, Date.now()));
                  setFeedback(false);
                }}
              >
                Jag vill stanna lite till
              </button>
            </section>
          ) : (
            <button className={button} onClick={() => setFeedback(true)}>
              Klar med {STATIONS[active.current].short.toLowerCase()} <ArrowRight size={18} />
            </button>
          )}
          <div className="flex justify-between">
            <button
              className="min-h-11 text-sm text-slate-500"
              onClick={() => next(undefined, true)}
            >
              Hoppa över stationen
            </button>
            <button
              className="min-h-11 text-sm text-slate-500"
              onClick={() =>
                persist({
                  ...active,
                  done: [...active.done, active.current],
                  finishedAt: Date.now(),
                })
              }
            >
              Avsluta
            </button>
          </div>
          <p className="text-center text-xs text-slate-400">
            {active.reserve} min är avsatta för vägen till första tee. Förflyttning mellan stationer
            ingår i stationstiden.
          </p>
          <button
            className="min-h-11 w-full text-sm text-blue-600"
            onClick={() => persist({ ...active, manual: !active.manual })}
          >
            {active.manual ? "Slå på mjuka påminnelser" : "Stäng av stationernas påminnelser"}
          </button>
          {!notice && typeof Notification !== "undefined" && (
            <button
              className="min-h-11 w-full text-sm text-blue-600"
              onClick={async () => {
                try {
                  setNotice((await Notification.requestPermission()) === "granted");
                } catch {}
              }}
            >
              Tillåt även webbläsaraviseringar
            </button>
          )}
          <p className="text-center text-xs text-slate-400">
            Påminnelser fungerar medan uppvärmningen är öppen. På låst skärm kan de utebli. Tiden
            stäms av när du återvänder.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
              <Sun />
            </div>
            <h1 className="text-3xl font-black">Redo för första tee</h1>
            <p className="mt-3 text-lg text-slate-600">
              Hitta känslan. Bygg självförtroendet. Ta med det till första slaget.
            </p>
            <p className="mt-2 text-sm text-slate-500">Din tid, ditt spel och din egen rutin.</p>
          </div>
          <section className="rounded-3xl border bg-white p-4">
            <h2 className="font-bold">Tid till första tee</h2>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[10, 20, 30, 45].map((n) => (
                <button
                  key={n}
                  onClick={() => setPrefs((p) => ({ ...p, minutes: n }))}
                  className={`min-h-12 rounded-xl font-bold ${prefs.minutes === n ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700"}`}
                >
                  {n} min
                </button>
              ))}
            </div>
            <label className="mt-3 flex items-center justify-between text-sm text-slate-500">
              Annan tid (5–60 min)
              <input
                aria-label="Minuter till första tee"
                type="number"
                min={5}
                max={60}
                value={prefs.minutes}
                onChange={(e) => setPrefs((p) => ({ ...p, minutes: Number(e.target.value) }))}
                className="w-20 rounded-xl border p-2 text-center text-slate-900"
              />
            </label>
          </section>
          <section className="rounded-3xl border bg-white p-4">
            <h2 className="font-bold">Vad vill du hinna med?</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(Object.keys(STATIONS) as Station[]).map((k) => (
                <button
                  key={k}
                  aria-pressed={prefs.order.includes(k)}
                  onClick={() => toggle(k)}
                  className={`min-h-12 rounded-xl border px-3 text-left font-bold ${prefs.order.includes(k) ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-400"}`}
                >
                  {prefs.order.includes(k) ? "✓ " : ""}
                  {STATIONS[k].short}
                </button>
              ))}
            </div>
          </section>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={prefs.mode === "guided" ? button : secondary}
              onClick={() =>
                setPrefs((p) => ({ ...p, mode: "guided", weights: defaults().weights }))
              }
            >
              Guida mig
            </button>
            <button
              className={prefs.mode === "custom" ? button : secondary}
              onClick={() => setPrefs((p) => ({ ...p, mode: "custom" }))}
            >
              Min egen rutin
            </button>
          </div>
          {prefs.mode === "guided" &&
            ((profilePutt && prefs.order.includes("putt")) ||
              (profileRange && prefs.order.includes("range"))) && (
              <label className="flex gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
                <input
                  type="checkbox"
                  checked={useProfile}
                  onChange={(e) => setUseProfile(e.target.checked)}
                />
                <span>
                  Utifrån dina senaste rundor ger vi lite extra tid åt{" "}
                  {[
                    profileRange && prefs.order.includes("range")
                      ? "en trygg rytm på rangen"
                      : null,
                    profilePutt && prefs.order.includes("putt")
                      ? "dagens längdkänsla på green"
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" och ")}
                  .
                </span>
              </label>
            )}
          {lastMore && prefs.order.includes(lastMore) && (
            <button
              aria-pressed={extra === lastMore}
              className="w-full rounded-2xl bg-emerald-50 p-4 text-left text-sm text-emerald-800"
              onClick={() => setExtra(extra ? null : lastMore)}
            >
              {extra ? "✓ " : ""}Senast önskade du mer tid för{" "}
              {STATIONS[lastMore].short.toLowerCase()}.{" "}
              {extra ? "Med i dagens upplägg." : "Lägg till extra tid idag?"}
            </button>
          )}
          <section className="rounded-3xl border bg-white p-4">
            <h2 className="font-bold">Förberett för dig</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ungefärliga tider. Du väljer när du är klar.
            </p>
            <ol className="mt-3 space-y-3">
              {prefs.order.map((k, i) => (
                <li key={k} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-600">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold">{STATIONS[k].title}</p>
                    <p className="text-sm text-slate-500">Cirka {mins(preview[k] ?? 0)} min</p>
                  </div>
                  {prefs.mode === "custom" && (
                    <div className="flex items-center gap-1">
                      <input
                        aria-label={`Önskad tid för ${STATIONS[k].short}`}
                        type="number"
                        min={1}
                        max={30}
                        value={prefs.weights[k]}
                        onChange={(e) =>
                          setPrefs((p) => ({
                            ...p,
                            weights: {
                              ...p.weights,
                              [k]: Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                            },
                          }))
                        }
                        className="w-12 rounded-lg border p-2"
                      />
                      <div>
                        <button
                          aria-label={`Flytta ${STATIONS[k].short} upp`}
                          disabled={i === 0}
                          className="flex min-h-11 min-w-11 items-center justify-center disabled:opacity-20"
                          onClick={() => move(i, -1)}
                        >
                          <ChevronUp size={18} />
                        </button>
                        <button
                          aria-label={`Flytta ${STATIONS[k].short} ned`}
                          disabled={i === prefs.order.length - 1}
                          className="flex min-h-11 min-w-11 items-center justify-center disabled:opacity-20"
                          onClick={() => move(i, 1)}
                        >
                          <ChevronDown size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ol>
            {prefs.mode === "custom" && (
              <p className="mt-2 text-xs text-slate-500">
                Ange ungefärliga minuter per station. Fördelningen anpassas till tiden du har. Din
                ordning och rutin sparas.
              </p>
            )}
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <Flag size={16} />
              {reserve} min marginal till första tee
            </p>
            {prefs.minutes < 10 && prefs.order.length > 2 && (
              <p className="mt-2 text-sm text-blue-700">
                Kort om tid? Välj gärna bara en eller två stationer.
              </p>
            )}
          </section>
          <button
            className={button}
            disabled={
              !prefs.order.length ||
              !Number.isFinite(prefs.minutes) ||
              prefs.minutes < 5 ||
              prefs.minutes > 60
            }
            onClick={() => {
              const s = startWarm(effective, Date.now(), crypto.randomUUID());
              save({ ...state, prefs, active: s });
            }}
          >
            Starta min uppvärmning <ArrowRight size={18} />
          </button>
          <p className="text-center text-xs text-slate-400">
            Din rutin sparas på den här enheten. Påminnelser när uppvärmningen är öppen.
          </p>
          <button
            className="min-h-11 w-full text-sm font-bold text-blue-600"
            onClick={() => setRationale(!rationale)}
          >
            Så bygger vi din uppvärmning
          </button>
          {rationale && (
            <p className="rounded-2xl bg-white p-4 text-sm leading-relaxed text-slate-600">
              Du får en enkel grund: hitta rytm, bollkontakt och dagens längdkänsla. Vi anpassar
              tidsfördelningen efter dina val och, när det finns tillräckligt underlag, dina senaste
              puttrundor. Din återkoppling kan förbättra nästa upplägg. Ingen teknikomläggning,
              poängjakt eller HCP-bedömning.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
export function WarmUpHomeCard() {
  const { user, loading } = useAuth();
  return <WarmHome key={user?.id ?? "guest"} userId={user?.id ?? null} loading={loading} />;
}
function WarmHome({ userId, loading }: { userId: string | null; loading: boolean }) {
  const { state, ready, error, update } = useWarmUp(userId, loading),
    clock = useClock(),
    now = Math.max(clock, state.active?.stationAt ?? 0);
  const session = ready ? followupDue(state, now) : null;
  const [response, setResponse] = useState<Feeling | null>(null),
    [helped, setHelped] = useState<Station | null>(null),
    [more, setMore] = useState<Station | null>(null);
  useEffect(() => {
    setResponse(null);
    setHelped(null);
    setMore(null);
  }, [session?.id]);
  function finish(kind: "done" | "dismissed", defer = false) {
    if (!session) return;
    update((s) => ({
      ...s,
      history: s.history.map((r) =>
        r.id !== session.id
          ? r
          : defer
            ? { ...r, deferUntil: now + 3 * 3600000 }
            : {
                ...r,
                followup: kind,
                readiness: response ?? undefined,
                helped: helped ?? undefined,
                more: more ?? undefined,
              },
      ),
    }));
  }
  return (
    <section className="mt-5 space-y-3" aria-label="Redo för första tee">
      {session && (
        <div className="space-y-3 rounded-3xl border border-blue-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
            Efter din uppvärmning
          </p>
          <h2 className="text-xl font-black">
            {response ? "Vad tar vi med till nästa gång?" : "Kände du dig redo på första tee?"}
          </h2>
          <p className="text-sm text-slate-500">
            Du använde My Warm Up {new Date(session.startedAt).toLocaleDateString("sv-SE")}. Din
            återkoppling hjälper nästa upplägg.
          </p>
          {!response ? (
            <div className="grid grid-cols-3 gap-2">
              {(["good", "medium", "notyet"] as Feeling[]).map((v, i) => (
                <button key={v} className={secondary} onClick={() => setResponse(v)}>
                  {["Ja", "Delvis", "Nej"][i]}
                </button>
              ))}
            </div>
          ) : (
            <>
              <p className="text-sm font-bold">
                Vad hjälpte mest? <span className="font-normal text-slate-400">Valfritt</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {session.done.map((k) => (
                  <button
                    key={k}
                    aria-pressed={helped === k}
                    className={
                      helped === k ? `${secondary} !bg-blue-100 !text-blue-700` : secondary
                    }
                    onClick={() => setHelped(helped === k ? null : k)}
                  >
                    {STATIONS[k].short}
                  </button>
                ))}
              </div>
              <p className="text-sm font-bold">Mer tid nästa gång?</p>
              <div className="flex flex-wrap gap-2">
                {session.order.map((k) => (
                  <button
                    key={k}
                    aria-pressed={more === k}
                    className={more === k ? `${secondary} !bg-blue-100 !text-blue-700` : secondary}
                    onClick={() => setMore(more === k ? null : k)}
                  >
                    {STATIONS[k].short}
                  </button>
                ))}
                <button className={secondary} aria-pressed={!more} onClick={() => setMore(null)}>
                  Behåll upplägget
                </button>
              </div>
              <button className={button} onClick={() => finish("done")}>
                Spara återkoppling
              </button>
            </>
          )}
          <div className="flex justify-between">
            <button
              className="min-h-11 text-sm text-slate-500"
              onClick={() => finish("dismissed", true)}
            >
              Inte spelat klart
            </button>
            <button className="min-h-11 text-sm text-slate-500" onClick={() => finish("dismissed")}>
              Hoppa över
            </button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-amber-700">
              Kunde inte spara. Försök igen.
            </p>
          )}
        </div>
      )}
      <Link
        to="/uppvarmning"
        className="relative block overflow-hidden rounded-[26px] bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 p-6 text-white shadow-sm"
      >
        <div
          className="absolute -right-8 -top-10 h-40 w-40 rounded-full border-[20px] border-white/10"
          aria-hidden
        />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-100">
            <Sun size={17} />
            My Warm Up
          </div>
          <h2 className="mt-3 text-2xl font-black">Redo för första tee</h2>
          <p className="mt-2 max-w-[270px] text-sm leading-relaxed text-blue-50">
            Hitta känslan. Bygg självförtroendet. Ta med det till första slaget.
          </p>
          <p className="mt-3 text-xs text-blue-100">
            Anpassad efter din tid, ditt spel och din rutin.
          </p>
          <span className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 font-bold text-blue-700">
            {state.active ? "Fortsätt min uppvärmning" : "Starta min uppvärmning"}
            <ArrowRight size={17} />
          </span>
        </div>
      </Link>
    </section>
  );
}
