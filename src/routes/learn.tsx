import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  BarChart3,
  ArrowLeft,
  Brain,
  ChevronRight,
  CircleDot,
  CloudSun,
  Crosshair,
  Flag,
  Gauge,
  GraduationCap,
  LockKeyhole,
  Map,
  Medal,
  Mountain,
  Route as RouteIcon,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Wind,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LEARN_QUESTIONS, knowledgeForLesson, questionsForLesson, type LearnQuestion } from "@/lib/learn-knowledge";

export const Route = createFileRoute("/learn")({
  head: () => ({ meta: [{ title: "Learn | SG4" }] }),
  component: LearnPage,
});

type Tone = "teal" | "green" | "orange" | "amber" | "blue" | "cyan" | "red" | "brown" | "sky" | "purple" | "gold" | "violet";
type Lesson = { id: string; title: string; description: string; coach: string; icon: typeof Target };
type Section = { id: string; title: string; tone: Tone; goal: string; lessons: Lesson[] };

const make = (id: string, title: string, description: string, coach: string, icon: typeof Target): Lesson => ({ id, title, description, coach, icon });

const SECTIONS: Section[] = [
  { id: "basics", title: "Golfens grunder", tone: "teal", goal: "Förstå spelet och vad som faktiskt sänker score.", lessons: [
    make("score", "Så räknas score", "Par, bogey och birdie – grunden till allt.", "Vi börjar med hur golf faktiskt räknas. Målet är alltid lägre score.", BarChart3),
    make("hcp", "Vad är handicap?", "Förstå vad HCP mäter och hur det används.", "Handicap beskriver din spelstyrka – inte hur snygg din sving är.", Gauge),
    make("clubs", "Klubborna", "Varför olika klubbor finns och när de används.", "Olika klubbor löser olika problem. Du behöver inte slå samma slag överallt.", Flag),
    make("carry-total", "Carry vs total", "Skillnaden mellan flyglängd och slutlängd.", "Carry är hur långt bollen flyger. Total är var den till slut stannar.", ArrowDownToLine),
    make("course", "Banan", "Green, fairway, rough, bunker och straffområden.", "Lär dig var du tjänar slag – och var du snabbt kan förlora dem.", Map),
    make("good-miss", "Den bra missen", "Alla missar. Bra golfare missar på bättre ställen.", "Målet är inte perfekta slag. Målet är att dina missar fortfarande går att spela vidare från.", ShieldCheck),
  ]},
  { id: "putting", title: "Putting", tone: "green", goal: "Gör nästa putt enkel och eliminera treputtar.", lessons: [
    make("short-putt", "Kortputt", "Förstå varför korta puttar är scoringens grund.", "Korta puttar handlar om startlinje och trygghet. Vi börjar nära hålet.", CircleDot),
    make("lag-putting", "Lag putting", "Kontrollera längd så att nästa putt blir enkel.", "På långa puttar är målet främst att eliminera treputtar.", Target),
    make("speed-control", "Fartkontroll", "Lär dig varför rätt fart ofta är viktigare än perfekt linje.", "Bra fart gör hålet större och nästa putt enklare.", Gauge),
    make("start-line", "Startlinje", "Förstå vart bollen faktiskt startar.", "Du kan läsa greenen perfekt och ändå missa om bollen startar på fel linje.", RouteIcon),
    make("one-meter", "1-meterszonen", "Bygg ett tydligt mål runt hålet på långa puttar.", "Från långt håll är en meter runt hålet en väldigt bra säkerhetszon.", Crosshair),
    make("three-putt", "Undvik treputt", "Kombinera fart, linje och strategi.", "Bra putting handlar lika mycket om att undvika stora misstag som att håla fler puttar.", ShieldCheck),
  ]},
  { id: "chipping", title: "Chipping", tone: "orange", goal: "Få bollen nära med ett enkelt slag.", lessons: [
    make("chip-what", "Vad är en chip?", "Ett lågt närspelsslag där bollen ofta rullar mer än den flyger.", "En chip är i grunden ett enkelt sätt att få bollen från runt green till nära hålet.", Flag),
    make("chip-pitch", "Chip vs pitch", "Förstå skillnaden mellan låg rull och mer flygtid.", "Välj slag efter situationen – inte efter vilken klubba du råkar gilla.", RouteIcon),
    make("landing", "Landningspunkt", "Se första delen av slaget som ett tydligt mål.", "När landningspunkten blir tydlig blir resten av slaget lättare att planera.", Target),
    make("roll", "Carry vs roll", "Förstå hur mycket slaget flyger och rullar.", "Samma landningspunkt kan ge helt olika slutresultat beroende på hur mycket bollen rullar.", Gauge),
    make("chip-distance", "Avstånd", "Kort, medel och lång chip kräver olika kontroll.", "Vi tränar inte en enda chip. Vi lär oss kontrollera flera längder.", Crosshair),
    make("chip-lie", "Läget styr", "Fairway, rough och tight lie påverkar vad som händer.", "Bollens läge förändrar vad som är ett smart slag – även om avståndet är samma.", Mountain),
  ]},
  { id: "wedges", title: "Pitching & wedges", tone: "amber", goal: "Kontrollera carry från korta inspel.", lessons: [
    make("wedge-30", "20–30 meter", "Börja bygga känsla för kort carry.", "Här börjar övergången från chip till riktiga wedgeslag.", Target),
    make("wedge-50", "30–50 meter", "Kontrollera mellanlägen där full sving är för mycket.", "Mellanavstånden är ofta där flest slag kan sparas.", Gauge),
    make("wedge-70", "50–70 meter", "Bygg repeterbar carry utan att jaga max.", "Målet är inte maximal längd – det är förutsägbar längd.", Crosshair),
    make("wedge-100", "70–100 meter", "Förstå din scoringzon in mot green.", "Ju bättre du känner dina carry-längder, desto mindre behöver du gissa.", Flag),
    make("wedge-carry", "Carry-kontroll", "Lär dig tänka landningsavstånd först.", "Wedges handlar mer om var bollen landar än hur långt den rullar totalt.", RouteIcon),
    make("wedge-gapping", "Wedge-gapping", "Undvik stora avståndshål mellan dina slag.", "Bra gapping gör att du nästan alltid har ett slag som passar avståndet.", BarChart3),
  ]},
  { id: "ballflight", title: "Bollflykt", tone: "blue", goal: "Förstå varför bollen startar och kurvar som den gör.", lessons: [
    make("start-direction", "Startlinje", "Klubbbladet påverkar starkt vart bollen startar.", "Vi börjar med vad bollen berättar direkt efter träffen.", RouteIcon),
    make("draw", "Draw", "Förstå en kontrollerad kurva från höger till vänster för högerspelare.", "En draw är en bollflykt – inte automatiskt ett bättre slag.", RouteIcon),
    make("fade", "Fade", "Förstå en kontrollerad kurva från vänster till höger för högerspelare.", "En fade kan vara lika effektiv som en draw när den är förutsägbar.", RouteIcon),
    make("slice-hook", "Slice & hook", "Stora kurvor visar ofta ett tydligt face/path-förhållande.", "En återkommande slice eller hook är ett bra läge att ta hjälp av en tränare.", Wind),
    make("push-pull", "Push & pull", "Förstå när bollen startar tydligt höger eller vänster.", "Startlinjen ger dig viktig information om klubbbladet i träffen.", ArrowDownToLine),
    make("face-path", "Face vs path", "Se hur blad och svingspår tillsammans skapar bollflykten.", "Du behöver inte bli din egen svingcoach – men du bör förstå vad bollflykten betyder.", Crosshair),
  ]},
  { id: "approach", title: "Approach", tone: "cyan", goal: "Träffa fler greens och missa smartare.", lessons: [
    make("approach-carry", "Carry distance", "Välj klubba efter verklig carry, inte bästa slaget du någonsin slagit.", "Bra inspel börjar med ett realistiskt avstånd.", Gauge),
    make("center-green", "Center green", "Varför mitten av green ofta är ett starkt mål.", "Flaggan är inte alltid det bästa målet.", Target),
    make("front-middle-back", "Front, middle, back", "Läs hur pinnens djup förändrar klubbvalet.", "Samma green kan kräva helt olika beslut beroende på var flaggan står.", Map),
    make("proximity", "Närhet", "Förstå vad ett bra inspel faktiskt är från olika avstånd.", "Ju längre slag, desto större rimlig målzon.", Crosshair),
    make("dispersion", "Dispersion", "Ditt normala spridningsmönster är viktigare än ett perfekt slag.", "Spela efter din verkliga spridning – inte efter din bästa boll.", BarChart3),
    make("approach-miss", "Smart miss", "Planera vilken sida av green som lämnar enklast nästa slag.", "En bra miss kan vara skillnaden mellan par och dubbelbogey.", ShieldCheck),
  ]},
  { id: "tee", title: "Tee shots", tone: "red", goal: "Sätt bollen i spel och använd längd smart.", lessons: [
    make("fairway-width", "Fairwaybredd", "Förstå hur målbredd påverkar ditt klubbval.", "Ju smalare mål, desto mer behöver du väga längd mot kontroll.", Target),
    make("tee-start", "Startlinje", "Välj ett tydligt startmål från tee.", "Ett tydligt mål gör utslaget enklare att utvärdera.", RouteIcon),
    make("tee-carry", "Carry", "Vet hur långt bollen behöver flyga över hinder.", "Carry avgör om bunkern eller vattnet faktiskt är i spel.", Gauge),
    make("tee-dispersion", "Spridning", "Planera efter hela din shot pattern.", "Du spelar aldrig med en enda linje – du spelar med en spridning.", BarChart3),
    make("driver-or-less", "Driver eller mindre?", "När extra längd hjälper och när den bara ökar risken.", "Driver är inte automatiskt rätt val på varje par 4.", ShieldCheck),
    make("risk-reward", "Risk & reward", "Väg potentiell vinst mot hur dyr missen blir.", "Bra beslut maximerar din förväntade score – inte ditt snyggaste slag.", Trophy),
  ]},
  { id: "lies", title: "Lies & situationer", tone: "brown", goal: "Förstå hur läget förändrar slaget.", lessons: [
    make("rough", "Rough", "Mer gräs mellan klubba och boll förändrar kontrollen.", "Från rough behöver du ofta acceptera mindre kontroll.", Mountain),
    make("tight", "Tight lie", "Lite gräs under bollen förändrar marginalerna.", "Ett tight läge kräver respekt – men inte panik.", Flag),
    make("uphill", "Uppförsläge", "Lutningen påverkar både bollflykt och balans.", "Markens lutning är en del av slaget.", Mountain),
    make("downhill", "Nedförsläge", "Förstå varför bollen ofta kommer ut lägre och mer svårkontrollerad.", "Nedförsläge förändrar vad som är ett realistiskt resultat.", Mountain),
    make("sidehill", "Bollen över/under fötterna", "Sidolutning påverkar riktning och träffbild.", "Lutningen hjälper dig förutse vilken miss som är mer sannolik.", RouteIcon),
    make("bunker", "Bunker", "Förstå målet: ut, på green och vidare.", "Från bunker är det ofta viktigare att eliminera nästa stora misstag än att jaga flaggan.", ShieldCheck),
  ]},
  { id: "weather", title: "Vind & miljö", tone: "sky", goal: "Justera beslutet efter förhållandena.", lessons: [
    make("headwind", "Motvind", "Motvind påverkar carry mer än många tror.", "I motvind blir höjd och spin ännu viktigare för hur långt bollen går.", Wind),
    make("tailwind", "Medvind", "Medvind ger inte alltid så mycket extra carry som du tror.", "Medvind påverkar både flyg och hur bollen landar.", Wind),
    make("crosswind", "Sidvind", "Planera startlinje och målzon med vinden.", "Du behöver inte alltid bekämpa vinden – ofta är det smartare att spela med den.", Wind),
    make("temperature", "Temperatur", "Kall luft och kall boll påverkar längden.", "Samma klubba går inte exakt lika långt i alla temperaturer.", CloudSun),
    make("elevation", "Höjdskillnad", "Uppför och nedför ändrar effektivt spelavstånd.", "Spelavstånd är mer än siffran på lasern.", Mountain),
    make("ground", "Fast eller mjuk mark", "Marken styr hur mycket bollen rullar efter landning.", "Total längd förändras kraftigt när markförhållandena ändras.", Map),
  ]},
  { id: "strategy", title: "Strategi", tone: "purple", goal: "Ta beslut som sänker din förväntade score.", lessons: [
    make("safe-side", "Safe side", "Välj sidan som lämnar enklast nästa slag.", "Smart golf handlar ofta om var du absolut inte vill missa.", ShieldCheck),
    make("attack", "När ska du attackera?", "Aggressivt när uppsidan är stor och nedsidan liten.", "Attackera rätt lägen – inte alla lägen.", Trophy),
    make("conservative", "När ska du spela säkert?", "Acceptera ett längre nästa slag för att undvika stora problem.", "Konservativt är inte fegt när det ger lägre score.", ShieldCheck),
    make("layup", "Lay-up", "Välj nästa favoritavstånd istället för maximal längd.", "Ett bra lay-up lämnar ett slag du faktiskt vill slå.", RouteIcon),
    make("par5", "Par 5-beslut", "Två slag eller tre? Låt risk och spridning avgöra.", "Par 5 är ofta en strategifråga innan det är en längdfråga.", Map),
    make("expected", "Expected score", "Tänk i sannolika utfall istället för perfekta slag.", "Det bästa beslutet är det som ger lägst score över många försök.", Brain),
  ]},
  { id: "scoring", title: "Scoring", tone: "gold", goal: "Spela för score – inte perfekta slag.", lessons: [
    make("double", "Undvik dubbelbogey", "Stoppa ett misstag från att bli två eller tre.", "Efter ett dåligt slag är nästa mål ofta bara att få hålet under kontroll igen.", ShieldCheck),
    make("up-down", "Up & down", "Förstå kedjan: missad green, bra närspel, en putt.", "Scoring runt green handlar om hela sekvensen – inte bara första slaget.", Target),
    make("par-save", "Rädda par", "Se vilka situationer som faktiskt går att rädda.", "Par är ibland resultatet av ett bra beslut efter ett dåligt slag.", Medal),
    make("recovery", "Recovery", "Ta dig tillbaka i position utan att skapa ett större problem.", "När du är i problem är vägen tillbaka ofta viktigare än vägen mot flaggan.", RouteIcon),
    make("big-miss", "Stora misstag", "OB, plikt och treputtar kostar ofta mer än små precisionstapp.", "Ta bort de dyraste misstagen först.", BarChart3),
    make("score-first", "Score först", "Lär dig skilja mellan bra golf och snygga slag.", "Golf belönar inte det snyggaste slaget – bara lägst score.", Trophy),
  ]},
  { id: "performance", title: "Performance", tone: "violet", goal: "Utför samma spel när det gäller.", lessons: [
    make("routine", "Pre-shot routine", "Skapa samma startpunkt inför varje slag.", "En bra rutin hjälper dig flytta fokus från resultat till uppgift.", Sparkles),
    make("one-ball", "One-ball practice", "Träna ett slag, byt mål, börja om.", "På banan får du sällan tio försök från samma plats.", CircleDot),
    make("pressure", "Press", "Lär dig vad som förändras när slaget betyder något.", "Press är inte ett problem att ta bort – det är något du kan lära dig prestera med.", Brain),
    make("match-play", "Match play", "Strategin förändras när du spelar mot en motståndare.", "I matchspel spelar du både banan och situationen.", Trophy),
    make("reset", "Reset", "Släpp ett dåligt hål innan nästa tee.", "Ett dåligt hål behöver inte bli en dålig rond.", Sparkles),
    make("close", "Stäng ronden", "Behåll process och beslut på sista hålen.", "När du spelar bra behöver du inte börja spela annorlunda.", Medal),
  ]},
];

const TONE: Record<Tone, { tile: string; active: string; dot: string }> = {
  teal: { tile: "from-teal-500/32 via-teal-400/16 to-white/5 border-teal-300/35", active: "shadow-[0_0_34px_rgba(20,184,166,.42)] ring-teal-300/70", dot: "bg-teal-400" },
  green: { tile: "from-emerald-500/34 via-green-400/18 to-white/5 border-emerald-300/40", active: "shadow-[0_0_36px_rgba(34,197,94,.48)] ring-emerald-300/75", dot: "bg-emerald-400" },
  orange: { tile: "from-orange-500/36 via-orange-400/18 to-white/5 border-orange-300/40", active: "shadow-[0_0_36px_rgba(249,115,22,.45)] ring-orange-300/75", dot: "bg-orange-400" },
  amber: { tile: "from-amber-500/35 via-amber-400/18 to-white/5 border-amber-300/40", active: "shadow-[0_0_36px_rgba(245,158,11,.45)] ring-amber-300/75", dot: "bg-amber-400" },
  blue: { tile: "from-blue-500/38 via-blue-400/18 to-white/5 border-blue-300/42", active: "shadow-[0_0_38px_rgba(59,130,246,.5)] ring-blue-300/75", dot: "bg-blue-400" },
  cyan: { tile: "from-cyan-500/36 via-cyan-400/18 to-white/5 border-cyan-300/42", active: "shadow-[0_0_38px_rgba(6,182,212,.48)] ring-cyan-300/75", dot: "bg-cyan-400" },
  red: { tile: "from-rose-500/35 via-red-400/18 to-white/5 border-rose-300/40", active: "shadow-[0_0_38px_rgba(244,63,94,.44)] ring-rose-300/75", dot: "bg-rose-400" },
  brown: { tile: "from-amber-800/42 via-orange-800/20 to-white/5 border-amber-600/40", active: "shadow-[0_0_34px_rgba(180,83,9,.46)] ring-amber-500/70", dot: "bg-amber-700" },
  sky: { tile: "from-sky-500/34 via-sky-400/18 to-white/5 border-sky-300/40", active: "shadow-[0_0_38px_rgba(14,165,233,.46)] ring-sky-300/75", dot: "bg-sky-400" },
  purple: { tile: "from-violet-500/38 via-purple-400/18 to-white/5 border-violet-300/40", active: "shadow-[0_0_38px_rgba(139,92,246,.5)] ring-violet-300/75", dot: "bg-violet-400" },
  gold: { tile: "from-yellow-500/34 via-amber-300/18 to-white/5 border-yellow-300/40", active: "shadow-[0_0_38px_rgba(234,179,8,.46)] ring-yellow-300/75", dot: "bg-yellow-400" },
  violet: { tile: "from-fuchsia-500/32 via-violet-500/18 to-white/5 border-fuchsia-300/35", active: "shadow-[0_0_38px_rgba(192,38,211,.44)] ring-fuchsia-300/70", dot: "bg-fuchsia-400" },
};

const ALL_LESSONS = SECTIONS.flatMap((section) => section.lessons.map((lesson) => ({ ...lesson, section })));
const STORAGE_KEY = "sg4-learn-progress-v1";
const STATS_KEY = "sg4-learn-question-stats-v1";

function LearnPage() {
  const [selectedId, setSelectedId] = useState(ALL_LESSONS[0].id);
  const [completed, setCompleted] = useState<string[]>([]);
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const [session, setSession] = useState<{ mode: "lesson" | "quick"; questions: LearnQuestion[]; index: number; selected?: number; correct: number } | null>(null);
  const [questionStats, setQuestionStats] = useState<Record<string, { correct: number; wrong: number; lastSeen: number }>>({});
  const [lessonVisible, setLessonVisible] = useState(false);
  const selectedRef = useRef<HTMLButtonElement | null>(null);
  const sessionHistoryRef = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { selectedId?: string; completed?: string[] };
      if (saved.selectedId && ALL_LESSONS.some((item) => item.id === saved.selectedId)) setSelectedId(saved.selectedId);
      if (Array.isArray(saved.completed)) setCompleted(saved.completed.filter((id) => ALL_LESSONS.some((item) => item.id === id)));
    } catch { /* ignore unavailable storage */ }
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedId, completed })); } catch { /* ignore */ }
  }, [selectedId, completed]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STATS_KEY);
      if (raw) setQuestionStats(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(STATS_KEY, JSON.stringify(questionStats)); } catch { /* ignore */ }
  }, [questionStats]);

  useEffect(() => {
    const timer = window.setTimeout(() => selectedRef.current?.scrollIntoView({ behavior: "auto", block: "center" }), 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      if (!sessionHistoryRef.current) return;
      sessionHistoryRef.current = false;
      setLessonVisible(false);
      window.setTimeout(() => setSession(null), 280);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function openSessionHistory() {
    if (sessionHistoryRef.current) return;
    window.history.pushState({ sg4LearnSession: true }, "", window.location.href);
    sessionHistoryRef.current = true;
  }

  const selected = useMemo(() => ALL_LESSONS.find((item) => item.id === selectedId) ?? ALL_LESSONS[0], [selectedId]);
  const selectedIndex = ALL_LESSONS.findIndex((item) => item.id === selectedId);

  function startLesson(lessonId = selected.id) {
    const lesson = ALL_LESSONS.find((item) => item.id === lessonId) ?? selected;
    const questions = questionsForLesson(lesson.id, lesson.section.id, 3);
    setSelectedId(lesson.id);
    setSectionMenuOpen(false);
    setLessonVisible(false);
    openSessionHistory();
    setSession({ mode: "lesson", questions, index: -1, correct: 0 });
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setLessonVisible(true)));
  }

  function closeLesson() {
    if (sessionHistoryRef.current) {
      window.history.back();
      return;
    }
    setLessonVisible(false);
    window.setTimeout(() => setSession(null), 280);
  }

  function startQuickQuiz() {
    const seen = new Set(completed);
    seen.add(selectedId);
    const available = LEARN_QUESTIONS.filter((q) => seen.has(q.lessonId));
    const pool = (available.length >= 5 ? available : LEARN_QUESTIONS.slice(0, 12)).sort((a, b) => {
      const sa = questionStats[a.id]; const sb = questionStats[b.id];
      const wa = sa ? sa.wrong * 3 - sa.correct : 1;
      const wb = sb ? sb.wrong * 3 - sb.correct : 1;
      return wb - wa || (sa?.lastSeen ?? 0) - (sb?.lastSeen ?? 0);
    });
    setLessonVisible(false);
    openSessionHistory();
    setSession({ mode: "quick", questions: pool.slice(0, 5), index: 0, correct: 0 });
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setLessonVisible(true)));
  }

  function answerQuestion(optionIndex:number) {
    if (!session || session.index < 0 || session.selected !== undefined) return;
    const question = session.questions[session.index];
    const ok = optionIndex === question.correct;
    setQuestionStats((old) => {
      const prev = old[question.id] ?? { correct: 0, wrong: 0, lastSeen: 0 };
      return { ...old, [question.id]: { correct: prev.correct + (ok ? 1 : 0), wrong: prev.wrong + (ok ? 0 : 1), lastSeen: Date.now() } };
    });
    setSession((old) => old ? { ...old, selected: optionIndex, correct: old.correct + (ok ? 1 : 0) } : old);
  }

  function continueSession() {
    if (!session) return;
    if (session.index === -1) {
      if (session.questions.length === 0) { setSession(null); nextLesson(); return; }
      setSession({ ...session, index: 0 });
      return;
    }
    const nextIndex = session.index + 1;
    if (nextIndex < session.questions.length) {
      setSession({ ...session, index: nextIndex, selected: undefined });
      return;
    }
    if (session.mode === "lesson") {
      setCompleted((old) => old.includes(selectedId) ? old : [...old, selectedId]);
      const next = ALL_LESSONS[Math.min(selectedIndex + 1, ALL_LESSONS.length - 1)];
      setSelectedId(next.id);
      window.setTimeout(() => selectedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    }
    if (sessionHistoryRef.current) {
      window.history.back();
    } else {
      setLessonVisible(false);
      window.setTimeout(() => setSession(null), 280);
    }
  }

  function nextLesson() {
    setCompleted((old) => old.includes(selectedId) ? old : [...old, selectedId]);
    const next = ALL_LESSONS[Math.min(selectedIndex + 1, ALL_LESSONS.length - 1)];
    setSelectedId(next.id);
    window.setTimeout(() => selectedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 40);
  }

  return (
    <main className="fixed inset-0 overflow-x-hidden overflow-y-auto bg-[#242728] pb-32 text-white overscroll-none">
      <div className={`mx-auto w-full max-w-md px-4 pt-5 transition-transform duration-300 ease-[cubic-bezier(.22,.8,.24,1)] ${session && lessonVisible ? "-translate-x-[22%]" : "translate-x-0"}`}> 
        <header className="sticky top-0 z-40 -mx-4 border-b border-white/[.07] bg-[#242728]/96 px-4 pb-3 pt-[max(8px,env(safe-area-inset-top))] shadow-[0_12px_28px_-24px_rgba(0,0,0,.9)] backdrop-blur-2xl">
          <div className="grid grid-cols-[44px_1fr_auto] items-center gap-2">
            <button type="button" onClick={() => window.history.back()} aria-label="Tillbaka" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/[.05] text-white/80 active:scale-[.96]"><ArrowLeft className="h-5 w-5" /></button>
            <div className="flex items-center justify-center gap-2"><GraduationCap className="h-5 w-5 text-emerald-400" /><h1 className="font-display text-xl">Lär dig</h1></div>
            <div className="flex items-center gap-1.5"><button type="button" onClick={startQuickQuiz} className="rounded-2xl border border-amber-300/20 bg-amber-300/[.08] px-2.5 py-2 text-[11px] font-bold text-amber-100">Snabbquiz</button><button type="button" onClick={() => setSectionMenuOpen((open) => !open)} className="flex items-center gap-1.5 rounded-2xl border border-white/15 bg-white/[.06] px-2.5 py-2 text-[11px] font-semibold text-white/80 backdrop-blur-xl"><Map className="h-3.5 w-3.5" /> Sektioner</button></div>
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-300/30 bg-gradient-to-br from-emerald-500/25 via-slate-700/80 to-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,.22),0_0_24px_rgba(16,185,129,.12)]"><span className="text-2xl">🧑🏻‍🏫</span></div>
            <div className="relative min-w-0 flex-1 rounded-[18px] border border-white/15 bg-gradient-to-br from-white/[.12] via-white/[.07] to-white/[.035] px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.16)] backdrop-blur-2xl before:absolute before:-left-1.5 before:top-4 before:h-3 before:w-3 before:rotate-45 before:border-b before:border-l before:border-white/12 before:bg-[#383b3d]">
              <p className="relative line-clamp-2 text-[13px] leading-snug text-white/90">{selected.coach}</p>
            </div>
          </div>
        </header>

        {sectionMenuOpen ? (
          <div className="fixed left-1/2 top-[72px] z-50 w-[calc(100%-24px)] max-w-md -translate-x-1/2 rounded-[26px] border border-white/15 bg-[#303436]/96 p-3 shadow-[0_24px_60px_-24px_rgba(0,0,0,.9)] backdrop-blur-3xl">
            <div className="grid grid-cols-2 gap-2">
              {[...SECTIONS].reverse().map((section) => {
                const tone = TONE[section.tone];
                return <button key={section.id} type="button" onClick={() => {
                  setSectionMenuOpen(false);
                  window.setTimeout(() => document.getElementById(`learn-section-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 20);
                }} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.05] px-3 py-3 text-left text-xs font-semibold text-white/85 active:scale-[.98]">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
                  <span>{section.title}</span>
                </button>;
              })}
            </div>
          </div>
        ) : null}


        <div id="learn-sections" className="mt-6 space-y-10">
          {SECTIONS.map((section) => {
            const tone = TONE[section.tone];
            return <section key={section.id} id={`learn-section-${section.id}`} className="scroll-mt-28">
              <div className="mb-5 text-center">
                <div className={`mx-auto mb-2 h-1 w-10 rounded-full ${tone.dot}`} />
                <p className="text-[10px] font-black uppercase tracking-[.22em] text-white/40">Sektion</p>
                <h2 className="mt-1 font-display text-2xl text-white">{section.title}</h2>
                <p className="mx-auto mt-1 max-w-[30ch] text-xs leading-relaxed text-white/45">{section.goal}</p>
              </div>

              <div className="relative mx-auto max-w-[330px]">
                <div className={`absolute bottom-8 left-1/2 top-8 w-px -translate-x-1/2 ${tone.dot} opacity-30`} />
                {[3, 2, 1, 0].map((row) => {
                  const start = row === 0 ? 0 : row === 1 ? 2 : row === 2 ? 3 : 5;
                  const count = row % 2 === 0 ? 2 : 1;
                  const lessons = section.lessons.slice(start, start + count);
                  return <div key={row} className={`relative z-10 mb-3 grid ${count === 2 ? "grid-cols-2 gap-8" : "grid-cols-1 px-[90px]"}`}>
                    {lessons.map((lesson) => {
                      const globalIndex = ALL_LESSONS.findIndex((item) => item.id === lesson.id);
                      const isDone = completed.includes(lesson.id);
                      const isSelected = selectedId === lesson.id;
                      const isFuture = !isDone && !isSelected && globalIndex > Math.max(selectedIndex, completed.length);
                      const Icon = lesson.icon;
                      return <button
                        key={lesson.id}
                        ref={isSelected ? selectedRef : undefined}
                        type="button"
                        onClick={() => startLesson(lesson.id)}
                        className="group relative mx-auto h-[106px] w-[106px]"
                        aria-label={lesson.title}
                      >
                        <span className={`absolute inset-[10px] rotate-45 rounded-[24px] border bg-gradient-to-br backdrop-blur-2xl transition-all duration-200 ${isFuture ? "border-white/10 from-white/[.07] via-white/[.035] to-transparent opacity-45 grayscale" : tone.tile} ${isSelected ? `ring-2 ${tone.active}` : "shadow-[inset_0_1px_0_rgba(255,255,255,.2),0_16px_28px_-20px_rgba(0,0,0,.95)]"}`} />
                        <span className={`absolute inset-0 flex items-center justify-center transition ${isFuture ? "text-white/28" : "text-white/75"} ${isSelected ? "text-white" : ""}`}><Icon className="h-8 w-8" strokeWidth={1.8} /></span>
                        {isDone ? <span className={`absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/25 ${tone.dot} text-white shadow-lg`}><ShieldCheck className="h-4 w-4" /></span> : null}
                        {isFuture ? <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#202223] text-white/45"><LockKeyhole className="h-3.5 w-3.5" /></span> : null}
                        {isSelected ? <span className="absolute -top-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-xs font-black text-slate-900 shadow-xl after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-[6px] after:border-transparent after:border-t-white">{lesson.title}</span> : null}
                      </button>;
                    })}
                  </div>;
                })}
              </div>
            </section>;
          })}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 px-3">
        <div className="mx-auto max-w-md rounded-[28px] border border-white/18 bg-[#303436]/92 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.16),0_24px_60px_-28px_rgba(0,0,0,.9)] backdrop-blur-3xl">
          <div className="flex items-center gap-3">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-br ${TONE[selected.section.tone].tile}`}><selected.icon className="h-7 w-7 text-white" /></div>
            <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/40">{selected.section.title}</p><h3 className="mt-0.5 font-display text-2xl leading-none">{selected.title}</h3><p className="mt-1.5 text-xs leading-snug text-white/55">{selected.description}</p></div>
          </div>
          <button type="button" onClick={() => startLesson()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200/25 bg-gradient-to-r from-emerald-500 via-lime-400 to-emerald-400 py-3.5 font-display text-xl text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_10px_28px_-12px_rgba(74,222,128,.55)] active:scale-[.99]">{completed.includes(selectedId) ? "Repetera" : "Starta lektion"} <ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>
      {session ? (
        <div className={`fixed inset-0 z-[100] overflow-y-auto bg-[#202324] text-white transition-transform duration-300 ease-[cubic-bezier(.22,.8,.24,1)] ${lessonVisible ? "translate-x-0" : "translate-x-full"}`}> 
          <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-8 pt-[max(14px,env(safe-area-inset-top))]">
            <div className="flex items-center justify-between">
              <button type="button" onClick={closeLesson} aria-label="Tillbaka till Learn" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[.05]"><ArrowLeft className="h-5 w-5" /></button>
              <div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.18em] text-white/40">{session.mode === "quick" ? "Snabbquiz" : selected.section.title}</p><p className="font-display text-lg">{session.mode === "quick" ? "Repetition" : selected.title}</p></div>
              <div className="w-10" />
            </div>

            {session.index === -1 ? (
              <div className="flex flex-1 flex-col justify-center py-8">
                <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-[30px] border bg-gradient-to-br ${TONE[selected.section.tone].tile}`}><selected.icon className="h-11 w-11" /></div>
                <h2 className="mt-7 text-center font-display text-4xl leading-none">{selected.title}</h2>
                <p className="mx-auto mt-3 max-w-[32ch] text-center text-sm leading-relaxed text-white/55">{selected.description}</p>
                <div className="mt-8 space-y-3">
                  <div className="rounded-[26px] border border-white/12 bg-white/[.055] p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">Kärnan</p><p className="mt-2 text-[17px] leading-relaxed text-white/92">{knowledgeForLesson(selected.id)?.core ?? selected.coach}</p></div>
                  <div className="rounded-[26px] border border-white/10 bg-white/[.035] p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-amber-200">Varför det spelar roll</p><p className="mt-2 text-[15px] leading-relaxed text-white/72">{knowledgeForLesson(selected.id)?.why ?? "Förståelsen hjälper dig fatta bättre beslut och utvärdera dina slag tydligare."}</p></div>
                </div>
                <button type="button" onClick={continueSession} className="mt-7 rounded-2xl bg-emerald-400 py-4 font-display text-xl text-slate-950">Testa mig <ChevronRight className="ml-1 inline h-5 w-5" /></button>
              </div>
            ) : (() => {
              const question = session.questions[session.index];
              const answered = session.selected !== undefined;
              return <div className="flex flex-1 flex-col py-7">
                <div className="mb-7 flex items-center gap-2">
                  {session.questions.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= session.index ? "bg-emerald-400" : "bg-white/10"}`} />)}
                </div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/40">{question.level === "recall" ? "Återkalla" : question.level === "understand" ? "Förstå" : "Tillämpa"}</p>
                <h2 className="mt-3 font-display text-[30px] leading-[1.08]">{question.prompt}</h2>
                <div className="mt-7 space-y-3">
                  {question.options.map((option, i) => {
                    const chosen = session.selected === i;
                    const correct = answered && i === question.correct;
                    const wrong = answered && chosen && i !== question.correct;
                    return <button key={option} type="button" disabled={answered} onClick={() => answerQuestion(i)} className={`w-full rounded-[22px] border px-4 py-4 text-left text-[15px] font-semibold transition ${correct ? "border-emerald-300/60 bg-emerald-400/15 text-emerald-50" : wrong ? "border-red-300/50 bg-red-400/12 text-red-50" : "border-white/12 bg-white/[.055] text-white/88 active:scale-[.99]"}`}><span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[.05] text-xs text-white/55">{String.fromCharCode(65+i)}</span>{option}</button>;
                  })}
                </div>
                {answered ? <div className={`mt-5 rounded-[22px] border p-4 ${session.selected === question.correct ? "border-emerald-300/25 bg-emerald-400/[.08]" : "border-amber-300/25 bg-amber-300/[.07]"}`}><p className="text-sm leading-relaxed text-white/78">{question.feedback}</p></div> : null}
                <div className="mt-auto pt-6">
                  {answered ? <button type="button" onClick={continueSession} className="w-full rounded-2xl bg-emerald-400 py-4 font-display text-xl text-slate-950">{session.index + 1 < session.questions.length ? "Fortsätt" : session.mode === "lesson" ? "Klar" : "Visa resultat"}</button> : null}
                </div>
              </div>;
            })()}
          </div>
        </div>
      ) : null}
    </main>
  );
}
