import { useEffect, useRef, useState, type ReactNode } from "react";
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
  Plus,
  Minus,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { useWarmUp } from "@/lib/use-warm-up";
import { readWarmProfile, loadWarmProfile } from "@/lib/warm-up-profile";
import {
  STATIONS,
  routineDefaults,
  normalizePrefs,
  buildVisits,
  startRoutine,
  advanceExercise,
  completeVisit,
  extendVisit,
  finishRoutine,
  goToVisit,
  pendingVisits,
  applyRoutineChange,
  saveRoutineFeedback,
  routineFollowupDue,
  type RoutinePrefs,
  type RoutineSession,
  type WarmProfile,
  type Feeling,
  type Station,
  type RoutineChange,
  type Visit,
  type Exercise,
} from "@/lib/warm-up-routine";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import "./warm-up.css";

const timeLabel = (at: number) =>
  new Date(at).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
const minuteLabel = (n: number) => (n < 1 ? "<1 min" : `${Math.round(n)} min`);
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
function Action({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button className="wu-primary" disabled={disabled} onClick={onClick}>
      {children}
      <ArrowRight size={20} aria-hidden />
    </button>
  );
}
function Choice({
  selected,
  children,
  onClick,
  disabled = false,
}: {
  selected?: boolean;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={`wu-choice ${selected ? "is-selected" : ""}`}
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function Heading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="wu-heading">
      <p className="wu-eyebrow">{eyebrow}</p>
      <h1 tabIndex={-1}>{title}</h1>
      {text && <p className="wu-description">{text}</p>}
    </div>
  );
}
function ExerciseVisual({ task, kind }: { task: Exercise; kind: Visit["kind"] }) {
  if (task.distance)
    return (
      <div className="wu-distance">
        <span>
          {task.distance}
          <small>m</small>
        </span>
        <p>{kind === "range" ? "till målet" : "från hålet"}</p>
        <div className="wu-distance-line" aria-hidden>
          <i />
          <i />
          <i />
          <span />
          <Flag size={30} fill="#facc15" color="#dca506" />
        </div>
      </div>
    );
  return (
    <div className="wu-symbol" aria-hidden>
      {kind === "tee" ? (
        <Flag size={72} />
      ) : kind === "body" ? (
        <Sun size={76} strokeWidth={1.5} />
      ) : (
        <span>
          {task.count ?? 3}
          <small>slag</small>
        </span>
      )}
      {task.seconds && <p>Cirka {task.seconds} sekunder</p>}
    </div>
  );
}
function OrderEditor({
  prefs,
  setPrefs,
}: {
  prefs: RoutinePrefs;
  setPrefs: (p: RoutinePrefs) => void;
}) {
  function move(i: number, delta: number) {
    const order = [...prefs.order];
    [order[i], order[i + delta]] = [order[i + delta], order[i]];
    setPrefs({ ...prefs, order });
  }
  return (
    <div className="wu-order">
      {prefs.order.map((kind, i) => (
        <div className="wu-order-row" key={`${kind}-${i}`}>
          <span className="wu-step-number">{i + 1}</span>
          <strong>
            {STATIONS[kind].short}
            {kind === "putt" && prefs.order.filter((k) => k === "putt").length === 2
              ? ` ${prefs.order.slice(0, i + 1).filter((k) => k === "putt").length}`
              : ""}
          </strong>
          <button
            className="wu-icon"
            aria-label={`Flytta ${STATIONS[kind].short} ${i + 1} upp`}
            onClick={() => move(i, -1)}
            disabled={i === 0}
          >
            <ChevronUp size={20} />
          </button>
          <button
            className="wu-icon"
            aria-label={`Flytta ${STATIONS[kind].short} ${i + 1} ned`}
            onClick={() => move(i, 1)}
            disabled={i === prefs.order.length - 1}
          >
            <ChevronDown size={20} />
          </button>
        </div>
      ))}
    </div>
  );
}
export function WarmUpPage() {
  const { user, loading } = useAuth();
  useHideBottomNav(true);
  return <WarmExperience key={user?.id ?? "guest"} userId={user?.id ?? null} loading={loading} />;
}
function WarmExperience({ userId, loading }: { userId: string | null; loading: boolean }) {
  const { state, ready, error, save, update } = useWarmUp(userId, loading);
  const now = useClock();
  const [prefs, setPrefs] = useState<RoutinePrefs>(routineDefaults);
  const [initialized, setInitialized] = useState(false);
  const [screen, setScreen] = useState<
    "time" | "places" | "plan" | "order" | "par3" | "feedback" | "adapt" | "saved"
  >("time");
  const [profile, setProfile] = useState<WarmProfile>({});
  const [timeMode, setTimeMode] = useState<"duration" | "tee">("duration");
  const [teeTime, setTeeTime] = useState(0);
  const [timeOptions, setTimeOptions] = useState<number[]>([]);
  const [summaryId, setSummaryId] = useState<string | null>(null);
  const [rating, setRating] = useState<Feeling>("good");
  const [change, setChange] = useState<RoutineChange>("keep");
  const [customFeedback, setCustomFeedback] = useState(false);
  const [detail, setDetail] = useState<{ title: string; text: string } | null>(null);
  const [options, setOptions] = useState(false);
  const [message, setMessage] = useState("");
  const content = useRef<HTMLDivElement>(null);
  const lastPage = useRef("");
  const active = state.active;
  const summary = state.history.find((s) => s.id === summaryId);
  const visit = active?.visits[active.current];
  const task = visit?.exercises[active?.exercise ?? 0];
  const atTee = !!active && now >= active.teeAt - active.reserve * 60000;
  const due = !!active && !active.manual && now >= active.dueAt;
  const effectiveMinutes = timeMode === "tee" ? (teeTime - now) / 60000 : prefs.minutes;
  const validTime = effectiveMinutes >= 5 && effectiveMinutes <= 120;
  const preview = buildVisits({ ...prefs, minutes: Math.max(5, effectiveMinutes) }, profile);
  useEffect(() => {
    if (!ready || initialized) return;
    setPrefs(state.prefs);
    const base = Math.ceil(Date.now() / 300000) * 300000;
    const times = Array.from({ length: 23 }, (_, i) => base + (i + 1) * 300000);
    setTimeOptions(times);
    setTeeTime(times[5]);
    const last = state.history[state.history.length - 1];
    if (
      !state.active &&
      last?.finishedAt &&
      !last.feedback &&
      Date.now() - last.finishedAt < 2 * 3600000
    ) {
      setSummaryId(last.id);
      setScreen("feedback");
    }
    setInitialized(true);
  }, [ready, initialized, state]);
  useEffect(() => {
    if (!ready) return;
    let disposed = false;
    let lastFetch = 0;
    let hasRemote = false;
    const read = () => {
      try {
        if (!hasRemote) setProfile(readWarmProfile(userId, localStorage, Date.now()));
      } catch {
        setProfile({});
      }
      if (userId && Date.now() - lastFetch > 60000) {
        lastFetch = Date.now();
        void loadWarmProfile(userId, localStorage, Date.now())
          .then((data) => {
            if (!disposed) {
              hasRemote = true;
              setProfile(data);
            }
          })
          .catch(() => {
            /* Offline: use the current account's local results. */
          });
      }
    };
    read();
    const events = [
      "focus",
      "storage",
      "sg4-putt-cloud-updated",
      "sg4-chip-cloud-updated",
      "sg4-approach-cloud-updated",
    ];
    events.forEach((e) => window.addEventListener(e, read));
    return () => {
      disposed = true;
      events.forEach((e) => window.removeEventListener(e, read));
    };
  }, [ready, userId]);
  const pageKey = active
    ? `${active.id}:${active.current}:${active.exercise}:${active.phase}:${atTee}`
    : screen;
  useEffect(() => {
    if (lastPage.current === pageKey) return;
    lastPage.current = pageKey;
    content.current?.scrollTo(0, 0);
    content.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
    setMessage("");
  }, [pageKey]);
  useEffect(() => {
    if (!active || active.manual || (!due && !atTee) || document.visibilityState !== "visible")
      return;
    const key = `warm-reminded:${active.id}:${atTee ? "tee" : active.dueAt}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "yes");
      if (typeof Notification !== "undefined" && Notification.permission === "granted")
        new Notification("My Warm Up", {
          body: atTee
            ? "Dags att gå till första tee."
            : "Redo för nästa del? Du väljer när du går vidare.",
          tag: "sg4-warm-up",
        });
    } catch {
      /* In-app reminders remain available. */
    }
  }, [active?.id, active?.dueAt, active?.manual, due, atTee]);
  function persist(next: RoutineSession) {
    const ok = update((s) =>
      next.finishedAt
        ? {
            ...s,
            active: null,
            history: [...s.history.filter((r) => r.id !== next.id), next].slice(-100),
          }
        : { ...s, active: next },
    );
    if (ok && next.finishedAt) {
      setSummaryId(next.id);
      setScreen("feedback");
    }
    return ok;
  }
  function finish() {
    if (active) {
      persist(finishRoutine(active, Date.now()));
      setOptions(false);
    }
  }
  function start() {
    try {
      const p = normalizePrefs(prefs),
        at = Date.now();
      const next = startRoutine(
        p,
        profile,
        at,
        crypto.randomUUID(),
        timeMode === "tee" ? teeTime : at + p.minutes * 60000,
      );
      save({
        ...state,
        prefs: { ...p, minutes: Math.round((next.teeAt - at) / 60000) },
        active: next,
      });
      setSummaryId(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Välj en ny starttid.");
    }
  }
  function saveFeedback() {
    if (!summary) return;
    if (
      update((s) =>
        saveRoutineFeedback(s, summary.id, rating, change, customFeedback ? prefs : undefined),
      )
    ) {
      setPrefs(customFeedback ? prefs : applyRoutineChange(state.prefs, change));
      setScreen("saved");
    }
  }
  function back() {
    if (active) {
      setOptions(true);
      return;
    }
    if (screen === "places") setScreen("time");
    else if (screen === "plan") setScreen("places");
    else if (screen === "order") setScreen(summaryId ? "adapt" : "plan");
    else if (screen === "par3") setScreen("plan");
    else if (screen === "adapt") setScreen("feedback");
  }
  let body: ReactNode;
  let footer: ReactNode;
  if (!ready || !initialized) body = <Heading eyebrow="My Warm Up" title="Förbereder din rutin…" />;
  else if (active && visit && task) {
    const index = active.exercise;
    const nextVisit = pendingVisits(active).find((v) => v.id !== visit.id);
    if (atTee) {
      body = (
        <>
          <Heading
            eyebrow="Första tee väntar"
            title="Ta med känslan"
            text="Dags att gå till tee. Du behöver inte hinna alla delar."
          />
          <div className="wu-symbol">
            <Flag size={78} />
            <p>Start {timeLabel(active.teeAt)}</p>
          </div>
          <p className="wu-cue">
            Välj ett tydligt mål. Ta ett lugnt andetag och använd din vanliga rutin.
          </p>
        </>
      );
      footer = <Action onClick={finish}>Klar – mot första tee</Action>;
    } else if (active.phase === "check") {
      body = (
        <>
          <Heading
            eyebrow={`${visit.title} · klart`}
            title="Hur känns det?"
            text="Din känsla får styra nästa steg."
          />
          <div className="wu-feedback-options">
            <button
              className="wu-feedback-choice"
              onClick={() => persist(completeVisit(active, Date.now(), "good"))}
            >
              <span>☀️</span>
              <div>
                <strong>Bra känsla</strong>
                <small>Redo för nästa del</small>
              </div>
              <ArrowRight />
            </button>
            <button
              className="wu-feedback-choice"
              onClick={() => persist(completeVisit(active, Date.now(), "medium"))}
            >
              <span>👌</span>
              <div>
                <strong>Helt okej</strong>
                <small>Jag går vidare</small>
              </div>
              <ArrowRight />
            </button>
            <button
              className="wu-feedback-choice"
              onClick={() => persist(extendVisit(active, Date.now()))}
            >
              <Clock />
              <div>
                <strong>Lite mer tid</strong>
                <small>Upprepa lugnt · upp till 2 min</small>
              </div>
              <Plus />
            </button>
          </div>
          <p className="wu-muted">
            {nextVisit ? `Sedan: ${nextVisit.title}` : "Sedan: första tee"}
          </p>
        </>
      );
      footer = (
        <button
          className="wu-text-button"
          onClick={() => persist(completeVisit(active, Date.now()))}
        >
          Gå vidare utan svar
        </button>
      );
    } else {
      body = (
        <>
          <div className="wu-progress-top">
            <span>{visit.title}</span>
            <span>
              {index + 1} / {visit.exercises.length}
            </span>
          </div>
          <div
            className="wu-progress"
            aria-label={`Övning ${index + 1} av ${visit.exercises.length}`}
          >
            {visit.exercises.map((e, i) => (
              <span key={e.id} className={i <= index ? "is-done" : ""} />
            ))}
          </div>
          <Heading
            eyebrow={
              visit.kind === "body"
                ? "Börja mjukt"
                : visit.kind === "tee"
                  ? "Sista steget"
                  : "Ditt nästa moment"
            }
            title={task.title}
          />
          <ExerciseVisual task={task} kind={visit.kind} />
          <p className="wu-instruction">{task.instruction}</p>
          <p className="wu-cue">{task.cue}</p>
          {visit.focus && (
            <button
              className="wu-reason"
              onClick={() => setDetail({ title: visit.focus!.reason, text: visit.focus!.detail })}
            >
              <Sparkles size={16} />
              <span>{visit.focus.reason}</span>
            </button>
          )}
          {due && (
            <div className="wu-reminder" role="status">
              <span>Redo att gå vidare?</span>
              <button onClick={() => persist(extendVisit(active, Date.now()))}>2 min till</button>
              <button onClick={() => persist({ ...active, phase: "check" })}>Nästa del</button>
            </div>
          )}
        </>
      );
      footer = (
        <>
          <Action onClick={() => persist(advanceExercise(active, Date.now()))}>
            {visit.kind === "tee"
              ? "Redo för första tee"
              : index < visit.exercises.length - 1
                ? "Klar – nästa övning"
                : "Klar med den här delen"}
          </Action>
          <div className="wu-footer-links">
            <button
              className="wu-text-button"
              onClick={() => persist(completeVisit(active, Date.now(), undefined, true))}
            >
              Hoppa över delen
            </button>
            <span>
              {active.manual
                ? "I din takt"
                : `${minuteLabel(Math.max(0, (active.dueAt - now) / 60000))} kvar här`}
            </span>
          </div>
        </>
      );
    }
  } else if (screen === "feedback" && summary) {
    body = (
      <>
        <Heading
          eyebrow="Uppvärmningen är klar"
          title="Passade upplägget?"
          text="Ett snabbt svar hjälper oss med din nästa rutin."
        />
        <div className="wu-feedback-options">
          {(
            [
              ["good", "Ja, bra!", "☀️"],
              ["medium", "Ganska bra", "👌"],
              ["notyet", "Jag vill ändra", "🔄"],
            ] as const
          ).map(([value, label, icon]) => (
            <button
              key={value}
              className="wu-feedback-choice"
              onClick={() => {
                setRating(value);
                setChange("keep");
                setCustomFeedback(false);
                setPrefs(state.prefs);
                setScreen("adapt");
              }}
            >
              <span>{icon}</span>
              <strong>{label}</strong>
              <ArrowRight />
            </button>
          ))}
        </div>
        <p className="wu-cue">Ta med ditt vanliga tempo till första slaget.</p>
      </>
    );
    footer = (
      <Link to="/" data-local-navigation className="wu-text-button">
        Svara senare – till startsidan
      </Link>
    );
  } else if (screen === "adapt" && summary) {
    const choices: [RoutineChange, string][] = [
      ["keep", "Behåll rutinen"],
      ["putt-first", "Putt först"],
      ["range-last", "Range sist"],
      ["two-putts", "Två puttpass"],
    ];
    const nextPrefs = customFeedback ? prefs : applyRoutineChange(state.prefs, change);
    body = (
      <>
        <Heading
          eyebrow="Din rutin blir mer personlig"
          title="Till nästa gång?"
          text="Behåll det som fungerar eller välj en ändring."
        />
        <div className="wu-grid">
          {choices.map(([value, label]) => (
            <Choice
              key={value}
              selected={!customFeedback && change === value}
              onClick={() => {
                setChange(value);
                setCustomFeedback(false);
              }}
            >
              {label}
            </Choice>
          ))}
        </div>
        <div className="wu-next-routine">
          <p className="wu-eyebrow">Nästa rutin</p>
          <p>{nextPrefs.order.map((k) => STATIONS[k].short).join(" → ")}</p>
        </div>
        <button
          className="wu-text-button"
          onClick={() => {
            setPrefs(nextPrefs);
            setCustomFeedback(true);
            setScreen("order");
          }}
        >
          Ändra ordningen själv
        </button>
        <button
          className="wu-text-button"
          onClick={() => {
            setPrefs(nextPrefs);
            setCustomFeedback(true);
            setOptions(true);
          }}
        >
          Mer tid för en del
        </button>
      </>
    );
    footer = <Action onClick={saveFeedback}>Spara min rutin</Action>;
  } else if (screen === "saved") {
    body = (
      <>
        <div className="wu-saved-check">
          <Check size={38} />
        </div>
        <Heading
          eyebrow="Din rutin är sparad"
          title="Redo för första tee"
          text="Nästa gång utgår vi från det upplägg du valt."
        />
        <div className="wu-next-routine">
          <p>{prefs.order.map((k) => STATIONS[k].short).join(" → ")}</p>
        </div>
        <p className="wu-cue">Välj ett tydligt mål och ta ett slag i taget.</p>
      </>
    );
    footer = (
      <Link to="/" data-local-navigation className="wu-primary">
        Klart – till startsidan
        <ArrowRight size={20} />
      </Link>
    );
  } else if (screen === "time") {
    body = (
      <>
        <Heading
          eyebrow="My Warm Up"
          title="Redo från första tee"
          text="En enkel rutin för kroppen, rytmen och dagens känsla."
        />
        <div className="wu-segment">
          <Choice selected={timeMode === "duration"} onClick={() => setTimeMode("duration")}>
            Tid att använda
          </Choice>
          <Choice selected={timeMode === "tee"} onClick={() => setTimeMode("tee")}>
            Starttid på tee
          </Choice>
        </div>
        {timeMode === "duration" ? (
          <>
            <div className="wu-time-value">
              {prefs.minutes}
              <span>minuter</span>
            </div>
            <div className="wu-grid wu-four">
              {[10, 20, 30, 45].map((n) => (
                <Choice
                  key={n}
                  selected={prefs.minutes === n}
                  onClick={() => setPrefs({ ...prefs, minutes: n })}
                >
                  {n}
                </Choice>
              ))}
            </div>
            <label className="wu-slider-label">
              <span>5 min</span>
              <span>60 min</span>
              <input
                aria-label="Tid till första tee i minuter"
                type="range"
                min={5}
                max={60}
                step={5}
                value={Math.min(60, prefs.minutes)}
                onChange={(e) => setPrefs({ ...prefs, minutes: Number(e.target.value) })}
              />
            </label>
            <p className="wu-muted">Inklusive tid att ta dig till första tee.</p>
          </>
        ) : (
          <>
            <label className="wu-time-select">
              Första tee
              <select
                aria-label="Starttid på första tee"
                value={teeTime}
                onChange={(e) => setTeeTime(Number(e.target.value))}
              >
                {timeOptions.map((at) => (
                  <option key={at} value={at}>
                    {timeLabel(at)}
                  </option>
                ))}
              </select>
            </label>
            <p className="wu-muted">
              {validTime
                ? `${Math.floor(effectiveMinutes)} minuter kvar. Vi planerar bakåt från din starttid.`
                : "Välj en starttid minst 5 minuter framåt."}
            </p>
          </>
        )}
        {!!state.history.length && (
          <p className="wu-memory">
            <Sparkles size={17} /> Din sparade rutin följer med.
          </p>
        )}
      </>
    );
    footer = (
      <Action onClick={() => setScreen("places")} disabled={!validTime}>
        Välj platser
      </Action>
    );
  } else if (screen === "places") {
    body = (
      <>
        <Heading
          eyebrow="Steg 2 av 3"
          title="Vad finns på plats?"
          text="Välj de delar du vill hinna med."
        />
        <div className="wu-grid">
          {(Object.keys(STATIONS) as Station[]).map((kind) => (
            <Choice
              key={kind}
              selected={prefs.order.includes(kind)}
              onClick={() =>
                setPrefs({
                  ...prefs,
                  order: prefs.order.includes(kind)
                    ? prefs.order.filter((k) => k !== kind)
                    : [...prefs.order, kind],
                })
              }
            >
              <span className="wu-place-icon">{STATIONS[kind].icon}</span>
              {STATIONS[kind].short}
            </Choice>
          ))}
        </div>
        <Choice selected={prefs.body} onClick={() => setPrefs({ ...prefs, body: !prefs.body })}>
          <Sun size={19} /> Väck kroppen {prefs.body && <Check size={18} />}
        </Choice>
        <p className="wu-field-label">Gångtid & marginal till tee</p>
        <div className="wu-grid wu-three">
          {[3, 5, 8].map((n) => (
            <Choice
              key={n}
              selected={prefs.reserve === n}
              onClick={() => setPrefs({ ...prefs, reserve: n })}
            >
              {n} min
            </Choice>
          ))}
        </div>
        <p className="wu-muted">För vägen mellan platserna och till första tee.</p>
      </>
    );
    footer = (
      <Action disabled={!prefs.order.length} onClick={() => setScreen("plan")}>
        Se min rutin
      </Action>
    );
  } else if (screen === "order") {
    body = (
      <>
        <Heading
          eyebrow="Din ordning"
          title="Så passar det dig"
          text="Flytta delarna med pilarna."
        />
        <OrderEditor prefs={prefs} setPrefs={setPrefs} />
        <Choice
          selected={prefs.order.filter((k) => k === "putt").length === 2}
          onClick={() =>
            setPrefs(
              prefs.order.filter((k) => k === "putt").length === 2
                ? {
                    ...prefs,
                    order: prefs.order.filter((k, i, a) => k !== "putt" || a.indexOf(k) === i),
                  }
                : applyRoutineChange(prefs, "two-putts"),
            )
          }
        >
          Två puttpass · i början och slutet
        </Choice>
        <p className="wu-muted">Två pass delar på puttiden. Du kan flytta dem som du vill.</p>
      </>
    );
    footer = (
      <Action onClick={() => setScreen(summaryId ? "adapt" : "plan")}>Använd ordningen</Action>
    );
  } else if (screen === "par3") {
    body = (
      <>
        <Heading
          eyebrow="Valfritt · dagens bana"
          title="Förbered par 3-hålen"
          text="Välj upp till 3 ungefärliga avstånd från din tee."
        />
        <div className="wu-grid wu-three">
          {[80, 100, 120, 140, 160, 180, 200].map((d) => (
            <Choice
              key={d}
              selected={prefs.par3.includes(d)}
              disabled={prefs.par3.length >= 3 && !prefs.par3.includes(d)}
              onClick={() =>
                setPrefs({
                  ...prefs,
                  par3: prefs.par3.includes(d)
                    ? prefs.par3.filter((n) => n !== d)
                    : [...prefs.par3, d],
                })
              }
            >
              {d} m
            </Choice>
          ))}
        </div>
        <button className="wu-text-button" onClick={() => setPrefs({ ...prefs, par3: [] })}>
          Vet inte – använd grundupplägget
        </button>
        <p className="wu-cue">
          Avstånden blir mål för järnslagen på rangen. Välj klubban du brukar använda.
        </p>
      </>
    );
    footer = <Action onClick={() => setScreen("plan")}>Klart</Action>;
  } else {
    const focused = preview.find((v) => v.focus)?.focus;
    const shortened =
      preview.filter((v) => v.kind !== "body" && v.kind !== "tee").length < prefs.order.length;
    body = (
      <>
        <Heading
          eyebrow="Steg 3 av 3"
          title="Din uppvärmning"
          text={
            shortened
              ? "Ett kortare upplägg som ryms före första tee."
              : "En övning i taget. Du väljer när du är klar."
          }
        />
        <div className="wu-plan">
          {preview.map((v) => (
            <div key={v.id}>
              <span className="wu-plan-dot" />
              <strong>{v.title}</strong>
              <span>{minuteLabel(v.minutes)}</span>
            </div>
          ))}
          <div className="wu-plan-margin">
            <Flag size={16} />
            <span>Gångtid & marginal</span>
            <strong>{Math.min(prefs.reserve, Math.max(1, effectiveMinutes - 2))} min</strong>
          </div>
        </div>
        <div className="wu-grid">
          <button className="wu-small-action" onClick={() => setScreen("order")}>
            <Settings2 size={17} /> Ändra ordning
          </button>
          <button
            className="wu-small-action"
            disabled={!prefs.order.includes("range")}
            onClick={() => setScreen("par3")}
          >
            <Flag size={17} /> Par 3-avstånd
          </button>
        </div>
        {focused ? (
          <button
            className="wu-reason"
            onClick={() =>
              setDetail({
                title: "Anpassat efter dina resultat",
                text: preview
                  .filter((v) => v.focus)
                  .map((v) => v.focus!.detail)
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .join("\n\n"),
              })
            }
          >
            <Sparkles size={18} />
            <span>{focused.reason}</span>
          </button>
        ) : (
          <p className="wu-muted">
            {prefs.useStats
              ? "Grundupplägg idag. Med fler sparade resultat kan vi välja personliga avstånd."
              : "Dina val styr upplägget. Personliga resultat är avstängda."}
          </p>
        )}
        <button className="wu-text-button" onClick={() => setOptions(true)}>
          Inställningar & hur rutinen anpassas
        </button>
      </>
    );
    footer = (
      <Action onClick={start} disabled={!validTime}>
        Starta min uppvärmning
      </Action>
    );
  }
  return (
    <main className="wu-shell" aria-label="My Warm Up">
      <div className="wu-frame">
        <header className="wu-header">
          {!active && (screen === "time" || screen === "feedback" || screen === "saved") ? (
            <Link to="/" data-local-navigation aria-label="Till startsidan" className="wu-icon">
              <ArrowLeft size={22} />
            </Link>
          ) : (
            <button
              data-local-navigation
              aria-label={active ? "Öppna uppvärmningsmenyn" : "Tillbaka"}
              className="wu-icon"
              onClick={back}
            >
              {active ? <Settings2 size={21} /> : <ArrowLeft size={22} />}
            </button>
          )}
          <span>MY WARM UP</span>
          {active ? (
            <span className="wu-tee-time">
              <Clock size={15} /> {timeLabel(active.teeAt)}
            </span>
          ) : (
            <Sun size={21} className="text-blue-600" />
          )}
        </header>
        {(error || message) && (
          <p className="wu-error" role="alert">
            {message || "Kunde inte spara. Försök igen innan du lämnar sidan."}
          </p>
        )}
        <div ref={content} className="wu-content" key={pageKey}>
          {body}
        </div>
        <footer className="wu-footer">{footer}</footer>
      </div>
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-3xl">
          <DialogTitle>{detail?.title}</DialogTitle>
          <DialogDescription className="whitespace-pre-line text-base leading-relaxed">
            {detail?.text}
          </DialogDescription>
        </DialogContent>
      </Dialog>
      <Dialog open={options} onOpenChange={setOptions}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-3xl">
          <DialogTitle>{active ? "Din uppvärmning" : "Anpassa rutinen"}</DialogTitle>
          <DialogDescription>
            {active
              ? "Du styr takten. Tiden till första tee ligger fast."
              : "Dina val sparas på den här enheten."}
          </DialogDescription>
          {active ? (
            <div className="wu-menu">
              <Choice
                selected={active.manual}
                onClick={() => persist({ ...active, manual: !active.manual })}
              >
                Jag styr tiden själv
              </Choice>
              {pendingVisits(active)
                .filter((v) => v.id !== visit?.id)
                .map((v) => (
                  <button
                    className="wu-choice"
                    key={v.id}
                    onClick={() => {
                      persist(goToVisit(active, active.visits.indexOf(v), Date.now()));
                      setOptions(false);
                    }}
                  >
                    Gå till {v.title}
                    <ArrowRight size={18} />
                  </button>
                ))}
              <button className="wu-primary" onClick={finish}>
                Avsluta uppvärmningen
                <Flag size={18} />
              </button>
              <Link to="/" data-local-navigation className="wu-text-button">
                Till startsidan – spara min plats
              </Link>
              <p className="wu-muted">
                Påminnelser visas när verktyget är öppet. På låst skärm kan de utebli; tiden stäms
                av när du återvänder.
              </p>
              {typeof Notification !== "undefined" && Notification.permission !== "granted" && (
                <button
                  className="wu-text-button"
                  onClick={async () => {
                    try {
                      const permission = await Notification.requestPermission();
                      setMessage(
                        permission === "granted"
                          ? "Aviseringar är på."
                          : "Påminnelser visas i verktyget.",
                      );
                    } catch {
                      setMessage("Påminnelser visas i verktyget.");
                    }
                    setOptions(false);
                  }}
                >
                  Tillåt webbläsaraviseringar
                </button>
              )}
            </div>
          ) : (
            <div className="wu-menu">
              <Choice
                selected={prefs.useStats}
                onClick={() => setPrefs({ ...prefs, useStats: !prefs.useStats })}
              >
                <Sparkles size={18} /> Använd mina sparade resultat
              </Choice>
              <p className="wu-field-label">Dagens runda</p>
              <div className="wu-grid">
                {([9, 18] as const).map((n) => (
                  <Choice
                    key={n}
                    selected={prefs.holes === n}
                    onClick={() => setPrefs({ ...prefs, holes: n })}
                  >
                    {n} hål
                  </Choice>
                ))}
              </div>
              <p className="wu-muted">
                Vi frågar hur starten kändes när du kommer tillbaka efter rundan.
              </p>
              <p className="wu-field-label">Fördelning mellan stationerna</p>
              {[...new Set(prefs.order)].map((k) => (
                <div className="wu-weight" key={k}>
                  <strong>{STATIONS[k].short}</strong>
                  <button
                    className="wu-icon"
                    aria-label={`Mindre tid för ${STATIONS[k].short}`}
                    disabled={prefs.weights[k] <= 1}
                    onClick={() =>
                      setPrefs({
                        ...prefs,
                        weights: { ...prefs.weights, [k]: Math.max(1, prefs.weights[k] - 2) },
                      })
                    }
                  >
                    <Minus size={18} />
                  </button>
                  <span>
                    {minuteLabel(
                      preview.filter((v) => v.kind === k).reduce((sum, v) => sum + v.minutes, 0),
                    )}
                  </span>
                  <button
                    className="wu-icon"
                    aria-label={`Mer tid för ${STATIONS[k].short}`}
                    disabled={prefs.weights[k] >= 30}
                    onClick={() =>
                      setPrefs({
                        ...prefs,
                        weights: { ...prefs.weights, [k]: Math.min(30, prefs.weights[k] + 2) },
                      })
                    }
                  >
                    <Plus size={18} />
                  </button>
                </div>
              ))}
              <p className="wu-muted">Flytta tid mellan delarna. Din totala tid ligger kvar.</p>
              <button
                className="wu-text-button"
                onClick={() => {
                  setOptions(false);
                  setDetail({
                    title: "Så bygger vi din rutin",
                    text: "Vi börjar med mjuka rörelser, fortsätter med bekanta slag och förbereder första utslaget. När tillräckliga resultat finns från flera pass väljs putt-, chipp- och inspelsavstånd utifrån dina senaste 90 dagar. Vi ändrar inte din sving och beräknar inget HCP från uppvärmningen.\n\nDin återkoppling påverkar nästa rutin. Tider och antal slag är praktiska riktmärken; du kan alltid gå vidare tidigare.",
                  });
                }}
              >
                Så bygger vi din rutin
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
export function WarmUpHomeCard() {
  const { user, loading } = useAuth();
  return <WarmHome key={user?.id ?? "guest"} userId={user?.id ?? null} loading={loading} />;
}
function WarmHome({ userId, loading }: { userId: string | null; loading: boolean }) {
  const { state, ready, error, update } = useWarmUp(userId, loading);
  const now = useClock();
  const session = ready ? routineFollowupDue(state, now) : null;
  const [played, setPlayed] = useState(false);
  useEffect(() => setPlayed(false), [session?.id]);
  function followup(value: RoutineSession["roundFeeling"] | "later" | "dismissed") {
    if (!session) return;
    update((s) => ({
      ...s,
      history: s.history.map((r) =>
        r.id !== session.id
          ? r
          : value === "later"
            ? { ...r, deferUntil: now + 2 * 3600000 }
            : value === "dismissed"
              ? { ...r, followup: "dismissed" }
              : { ...r, followup: "done", roundFeeling: value },
      ),
    }));
  }
  return (
    <section className="mt-5 space-y-3" aria-label="Redo för första tee">
      {session && (
        <div className="space-y-3 rounded-3xl border border-blue-200 bg-white p-5">
          <p className="text-sm font-bold text-blue-600">Efter My Warm Up</p>
          <h2 className="text-xl font-black">
            {played ? "Hur kändes starten jämfört med vanligt?" : "Har du spelat klart?"}
          </h2>
          {played ? (
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["better", "Bättre"],
                  ["same", "Som vanligt"],
                  ["worse", "Sämre"],
                  ["unsure", "Vet inte"],
                ] as const
              ).map(([value, label]) => (
                <button key={value} className="wu-choice" onClick={() => followup(value)}>
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button className="wu-choice is-selected" onClick={() => setPlayed(true)}>
                Ja, klar
              </button>
              <button className="wu-choice" onClick={() => followup("later")}>
                Spelar fortfarande
              </button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Link
              to="/uppvarmning"
              data-local-navigation
              className="py-3 text-sm font-bold text-blue-600"
            >
              Anpassa nästa rutin
            </Link>
            <button className="py-3 text-sm text-slate-500" onClick={() => followup("dismissed")}>
              Hoppa över
            </button>
          </div>
          {error && <p role="alert">Kunde inte spara. Försök igen.</p>}
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
          <p className="mt-2 max-w-[290px] text-base leading-relaxed text-blue-50">
            Din personliga uppvärmning. En enkel övning i taget.
          </p>
          <span className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-4 font-bold text-blue-700">
            {ready && state.active ? "Fortsätt min uppvärmning" : "Starta min uppvärmning"}
            <ArrowRight size={18} />
          </span>
        </div>
      </Link>
    </section>
  );
}
