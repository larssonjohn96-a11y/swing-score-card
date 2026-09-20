import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { GripVertical, ArrowLeft, ArrowRight, Check, Flag, Sun } from "lucide-react";
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
  beginVisit,
  advanceExercise,
  completeVisit,
  extendVisit,
  finishRoutine,
  pendingVisits,
  saveRoutineFeedback,
  routineFollowupDue,
  type RoutinePrefs,
  type RoutineSession,
  type WarmProfile,
  type Feeling,
  type Station,
  type Visit,
  type Exercise,
} from "@/lib/warm-up-routine";
import "./warm-up.css";

const AREA_IMAGES: Record<Station, string> = {
  range: "/Off_the_tee.png",
  chip: "/0d286fd4-99fa-47eb-b39c-a7ff718ebdd6.png",
  putt: "/Putting_1.png",
  bunker: "/bunker-card.jpg",
};
const timeLabel = (at: number) =>
  new Date(at).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
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
function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="wu-bar"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
    >
      <span style={{ width: `${value * 100}%` }} />
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
  const dragging = useRef<Station | null>(null);
  const [held, setHeld] = useState<Station | null>(null);
  function move(kind: Station, to: number) {
    const from = prefs.order.indexOf(kind);
    if (from < 0 || from === to || to < 0 || to >= prefs.order.length) return;
    const order = [...prefs.order];
    order.splice(from, 1);
    order.splice(to, 0, kind);
    setPrefs({ ...prefs, order });
  }
  return (
    <div
      className="wu-order"
      onPointerMove={(e) => {
        if (!dragging.current) return;
        const row = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest<HTMLElement>("[data-order-index]");
        if (row) move(dragging.current, Number(row.dataset.orderIndex));
      }}
      onPointerUp={() => {
        dragging.current = null;
        setHeld(null);
      }}
      onPointerCancel={() => {
        dragging.current = null;
        setHeld(null);
      }}
    >
      <div className="wu-order-row">
        <span className="wu-step-number">1</span>
        <strong>Väck kroppen</strong>
        <Check size={18} />
      </div>
      {prefs.order.map((kind, i) => (
        <div
          className={`wu-order-row ${held === kind ? "is-held" : ""}`}
          key={kind}
          data-order-index={i}
        >
          <span className="wu-step-number">{i + 2}</span>
          <strong>{STATIONS[kind].title}</strong>
          <button
            className="wu-icon wu-drag"
            aria-label={`Flytta ${STATIONS[kind].short}. Dra eller använd piltangenterna.`}
            onPointerDown={(e) => {
              dragging.current = kind;
              setHeld(kind);
              e.currentTarget.closest(".wu-order")!.setPointerCapture(e.pointerId);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                move(kind, i + (e.key === "ArrowUp" ? -1 : 1));
              }
            }}
          >
            <GripVertical size={22} />
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
  const [screen, setScreen] = useState<"intro" | "time" | "places" | "plan" | "feedback">("intro");
  const [profile, setProfile] = useState<WarmProfile>({});
  const [teeTime, setTeeTime] = useState(0);
  const [timeOptions, setTimeOptions] = useState<number[]>([]);
  const [summaryId, setSummaryId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const content = useRef<HTMLDivElement>(null);
  const active = state.active;
  const visit = active?.visits[active.current];
  const task = visit?.exercises[active?.exercise ?? 0];
  const effectiveMinutes = prefs.timing === "tee" ? (teeTime - now) / 60000 : prefs.minutes;
  const validTime = effectiveMinutes >= 5 && effectiveMinutes <= 120;
  const preview = buildVisits(
    { ...prefs, body: true, minutes: Math.max(5, effectiveMinutes) },
    profile,
  );
  function resetTime() {
    const base = Math.ceil(Date.now() / 60000) * 60000;
    const times = Array.from({ length: 115 }, (_, i) => base + (i + 5) * 60000);
    setTimeOptions(times);
    setTeeTime(times[25]);
  }
  useEffect(() => {
    if (ready && !initialized) {
      setPrefs({ ...state.prefs, body: true, par3: [] });
      resetTime();
      setInitialized(true);
    }
  }, [ready, initialized, state.prefs]);
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
    ? `${active.id}:${active.current}:${active.exercise}:${active.phase}`
    : screen;
  useEffect(() => {
    content.current?.scrollTo(0, 0);
    content.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
    setMessage("");
  }, [pageKey]);
  useEffect(() => {
    if (
      !active ||
      active.manual ||
      active.phase !== "exercise" ||
      document.visibilityState !== "visible"
    )
      return;
    const ending = now >= active.teeAt - active.reserve * 60000;
    if (!ending && now < active.dueAt) return;
    const key = `warm-reminded:${active.id}:${ending ? "end" : active.dueAt}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "yes");
      if (typeof Notification !== "undefined" && Notification.permission === "granted")
        new Notification("My Warm Up", {
          body: ending
            ? active.timing === "duration"
              ? "Din planerade uppvärmningstid är slut."
              : "Dags att gå till första tee."
            : "Redo för nästa område? Du väljer när du går vidare.",
          tag: "sg4-warm-up",
        });
    } catch {
      /* The in-app reminder remains available. */
    }
  }, [active, now]);
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
  }
  function home(rating?: Feeling) {
    if (rating && summaryId && !update((s) => saveRoutineFeedback(s, summaryId, rating, "keep")))
      return;
    setSummaryId(null);
    resetTime();
    setScreen("intro");
  }
  function start() {
    try {
      const p = normalizePrefs({ ...prefs, body: true, par3: [] });
      const at = Date.now();
      const next = startRoutine(
        p,
        profile,
        at,
        crypto.randomUUID(),
        p.timing === "tee" ? teeTime : at + p.minutes * 60000,
      );
      save({ ...state, prefs: p, active: next });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Välj en ny starttid.");
    }
  }
  let body: ReactNode;
  let footer: ReactNode;
  if (!ready || !initialized) body = <Heading eyebrow="My Warm Up" title="Förbereder din rutin…" />;
  else if (active && visit && task) {
    const next = pendingVisits(active).find((v) => v.id !== visit.id);
    const last = active.exercise === visit.exercises.length - 1;
    const totalProgress =
      (active.done.length +
        active.skipped.length +
        (active.phase === "intro" ? 0 : active.exercise / visit.exercises.length)) /
      active.visits.length;
    const endAt = active.teeAt - active.reserve * 60000;
    const due = !active.manual && now >= active.dueAt && active.phase === "exercise";
    body = (
      <>
        <div className="wu-total">
          <span>Hela uppvärmningen</span>
          <Progress value={totalProgress} label="Hela uppvärmningen" />
        </div>
        {active.phase === "intro" ? (
          <>
            <Heading
              eyebrow={visit.kind === "body" ? "Vi börjar här" : "Byt område"}
              title={
                visit.kind === "body"
                  ? "Väck kroppen"
                  : `Vidare till ${visit.title.toLocaleLowerCase("sv")}`
              }
              text={visit.kind === "body" ? "Börja mjukt. Hitta ditt tempo." : undefined}
            />
            {visit.kind !== "body" && visit.kind !== "tee" ? (
              <img className="wu-area-image" src={AREA_IMAGES[visit.kind]} alt={visit.title} />
            ) : (
              <div className="wu-transition-symbol">
                <Flag size={80} strokeWidth={1.3} />
              </div>
            )}
          </>
        ) : active.phase === "check" ? (
          <Heading
            eyebrow={visit.title}
            title="Klart här"
            text={next ? `Nästa område: ${next.title}` : "Du är klar med uppvärmningen."}
          />
        ) : (
          <>
            <div className="wu-area-heading">
              <h1 tabIndex={-1}>{visit.title}</h1>
              <span>
                {active.exercise + 1} / {visit.exercises.length}
              </span>
            </div>
            <Progress
              value={active.exercise / visit.exercises.length}
              label={`Progress inom ${visit.title}`}
            />
            <div className="wu-task-heading">
              <p className="wu-eyebrow">
                {visit.kind === "putt"
                  ? task.distance! <= 2
                    ? "Nu: korta puttar"
                    : "Nu: långa puttar"
                  : visit.kind === "range"
                    ? task.id === "wedge"
                      ? "Nu: wedgar"
                      : task.id === "first-tee"
                        ? "Nu: första utslaget"
                        : task.id === "free"
                          ? "Nu: fria slag"
                          : task.id === "bag"
                            ? "Nu: genom bagen"
                            : "Nu: par 3-utslag"
                    : "Nästa övning"}
              </p>
              <h2>{task.title}</h2>
            </div>
            {visit.kind === "range" ? (
              <div className="wu-range-visual" aria-hidden>
                <Flag size={52} strokeWidth={1.5} />
                <span>
                  {task.id === "bag"
                    ? "Kort → långt"
                    : task.id === "par3"
                      ? "Välj ett mål"
                      : task.id === "first-tee"
                        ? "Din utslagsrutin"
                        : "Din känsla"}
                </span>
              </div>
            ) : (
              <ExerciseVisual task={task} kind={visit.kind} />
            )}
            <p className="wu-instruction">{task.instruction}</p>
            <p className="wu-cue">{task.cue}</p>
          </>
        )}
        {now >= endAt ? (
          <p className="wu-reminder" role="status">
            {active.timing === "duration"
              ? "Din planerade tid är slut. Avsluta när du är redo."
              : "Dags att gå till första tee."}
          </p>
        ) : due ? (
          <div className="wu-reminder" role="status">
            <span>Redo för nästa område?</span>
            <button onClick={() => persist(extendVisit(active, Date.now()))}>2 min till</button>
            <button onClick={() => persist(completeVisit(active, Date.now()))}>Gå vidare</button>
          </div>
        ) : null}
      </>
    );
    footer = (
      <>
        <Action
          onClick={() =>
            persist(
              active.phase === "intro"
                ? beginVisit(active, Date.now())
                : active.phase === "check"
                  ? completeVisit(active, Date.now())
                  : advanceExercise(active, Date.now()),
            )
          }
        >
          {active.phase === "intro"
            ? visit.kind === "body"
              ? "Börja"
              : "Jag är på plats – börja"
            : last || active.phase === "check"
              ? next
                ? `Klar med ${visit.title.toLocaleLowerCase("sv")}`
                : "Avsluta uppvärmningen"
              : "Klar – nästa övning"}
        </Action>
        {active.phase === "exercise" && !last && (
          <button
            className="wu-text-button"
            onClick={() => persist(completeVisit(active, Date.now()))}
          >
            Redan klar här? Vidare{next ? ` till ${next.title.toLocaleLowerCase("sv")}` : ""}
          </button>
        )}
      </>
    );
  } else if (screen === "feedback") {
    body = (
      <>
        <Heading eyebrow="My Warm Up" title="Uppvärmningen klar" text="Ha en fin runda!" />
        <div className="wu-finished">
          <Check size={48} />
        </div>
        <h2 className="wu-question">Känner du dig redo?</h2>
        <p className="wu-muted">Frivilligt · ett tryck, sedan är du klar.</p>
        <div className="wu-grid wu-three">
          {(
            [
              ["good", "Ja!"],
              ["medium", "Ganska"],
              ["notyet", "Inte riktigt"],
            ] as const
          ).map(([value, label]) => (
            <Choice key={value} onClick={() => home(value)}>
              {label}
            </Choice>
          ))}
        </div>
      </>
    );
    footer = <Action onClick={() => home()}>Till uppvärmningens startsida</Action>;
  } else if (screen === "intro") {
    body = (
      <div className="wu-intro-copy">
        <p className="wu-eyebrow">MY WARM UP</p>
        <h1 tabIndex={-1}>
          Din bästa start.
          <br />
          Redan före tee.
        </h1>
        <p>En personlig uppvärmning som guidar dig från första rörelsen till första utslaget.</p>
        <ul>
          <li>
            <Check />
            <span>Hitta bollträffen och ditt tempo</span>
          </li>
          <li>
            <Check />
            <span>Känn in farten på greenerna</span>
          </li>
          <li>
            <Check />
            <span>Kom förberedd till första tee</span>
          </li>
        </ul>
        <p className="wu-intro-note">Din tid. Din ordning. Ingen registrering av slag.</p>
      </div>
    );
    footer = <Action onClick={() => setScreen("time")}>Starta</Action>;
  } else if (screen === "time") {
    body = (
      <>
        <Heading
          eyebrow="My Warm Up"
          title="Redo för första tee"
          text="Välj din tid. Vi guidar dig hela vägen."
        />
        <div className="wu-grid">
          <Choice
            selected={prefs.timing !== "tee"}
            onClick={() => setPrefs({ ...prefs, timing: "duration" })}
          >
            Uppvärmningstid
          </Choice>
          <Choice
            selected={prefs.timing === "tee"}
            onClick={() => setPrefs({ ...prefs, timing: "tee" })}
          >
            Starttid på tee
          </Choice>
        </div>
        {prefs.timing === "tee" ? (
          <>
            <label className="wu-time-field">
              När slår du ut?
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
                ? `${Math.floor(effectiveMinutes)} minuter till första tee`
                : "Välj en starttid minst 5 minuter framåt."}
            </p>
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
          </>
        ) : (
          <>
            <div className="wu-duration-number">
              {prefs.minutes}
              <small>minuter</small>
            </div>
            <input
              className="wu-slider"
              aria-label="Uppvärmningens längd"
              type="range"
              min={5}
              max={60}
              step={5}
              value={prefs.minutes}
              onChange={(e) => setPrefs({ ...prefs, minutes: Number(e.target.value) })}
            />
            <div className="wu-grid wu-three">
              {[15, 30, 45].map((n) => (
                <Choice
                  key={n}
                  selected={prefs.minutes === n}
                  onClick={() => setPrefs({ ...prefs, minutes: n })}
                >
                  {n} min
                </Choice>
              ))}
            </div>
          </>
        )}
      </>
    );
    footer = (
      <Action disabled={!validTime} onClick={() => setScreen("places")}>
        Nästa
      </Action>
    );
  } else if (screen === "places") {
    body = (
      <>
        <Heading
          eyebrow="Dina områden"
          title="Var vill du värma upp?"
          text="Välj de platser du vill använda."
        />
        <div className="wu-facilities">
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
              {STATIONS[kind].title}
              {prefs.order.includes(kind) && <Check size={20} />}
            </Choice>
          ))}
        </div>
      </>
    );
    footer = (
      <Action
        disabled={!prefs.order.length}
        onClick={() => {
          setPrefs({
            ...prefs,
            order: preview
              .filter((v) => v.kind !== "body" && v.kind !== "tee")
              .map((v) => v.kind as Station),
          });
          setScreen("plan");
        }}
      >
        Nästa
      </Action>
    );
  } else {
    body = (
      <>
        <Heading
          eyebrow="Din rutin"
          title="Så här värmer du upp"
          text="Dra områdena till den ordning som passar dig."
        />
        <OrderEditor prefs={prefs} setPrefs={setPrefs} />
      </>
    );
    footer = (
      <Action disabled={!validTime} onClick={start}>
        Starta uppvärmningen
      </Action>
    );
  }
  return (
    <main
      className={`wu-shell ${!active && screen === "intro" ? "wu-intro" : ""}`}
      aria-label="My Warm Up"
    >
      <div className="wu-frame">
        <header className="wu-header">
          {active ? (
            <button
              className="wu-text-button"
              onClick={() => persist(finishRoutine(active, Date.now()))}
            >
              Avsluta
            </button>
          ) : screen === "intro" ? (
            <Link to="/" data-local-navigation aria-label="Till startsidan" className="wu-icon">
              <ArrowLeft size={22} />
            </Link>
          ) : (
            <button
              className="wu-icon"
              aria-label="Tillbaka"
              onClick={() =>
                screen === "feedback"
                  ? home()
                  : setScreen(screen === "plan" ? "places" : screen === "time" ? "intro" : "time")
              }
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <span>MY WARM UP</span>
          {active ? (
            <div className="wu-countdown">
              <strong>{Math.max(0, Math.ceil((active.teeAt - now) / 60000))} min</strong>
              <small>{active.timing === "duration" ? "till klart" : "till tee"}</small>
            </div>
          ) : (
            <span />
          )}
        </header>
        {(error || message) && (
          <p className="wu-error" role="alert">
            {message || "Kunde inte spara. Försök igen."}
          </p>
        )}
        <div ref={content} className="wu-content" key={pageKey}>
          {body}
        </div>
        <footer className="wu-footer">{footer}</footer>
      </div>
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
            Hitta känslan före första tee.
          </p>
          <span className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-4 font-bold text-blue-700">
            {ready && state.active ? "Fortsätt" : "Hitta din rutin"}
            <ArrowRight size={18} />
          </span>
        </div>
      </Link>
    </section>
  );
}
