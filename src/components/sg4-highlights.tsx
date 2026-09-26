import { useRef, useState, type PointerEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowDown, ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { StoryArtwork, StoryCover, type StoryArt } from "@/components/sg4-story-art";
import { isStoryDrag, moveStory, shouldDismissStory, type StoryPoint, type StoryPosition } from "@/lib/sg4-story-navigation";

export type HighlightStory = {
  title: string;
  text: string;
  action: string;
  href: string;
  art?: StoryArt;
  /** Retained for older callers; uploaded photos are no longer rendered. */
  image?: string;
};
export type HighlightGroup = { label: string; cover?: StoryArt; image?: string; stories: HighlightStory[] };

export const SG4_HIGHLIGHTS: HighlightGroup[] = [
  {
    label: "10 min över?", cover: "putting",
    stories: [
      { title: "En snabb puttmatch", text: "Tio minuter över? Utmana en kompis på tre hål.", action: "Starta puttmatch", href: "/match?flow=friend&category=putting", art: "putting" },
      { title: "Vem chippar närmast?", text: "Gör uppvärmningen till en kort match mot en vän.", action: "Starta chippmatch", href: "/match?flow=friend&category=around-the-green", art: "chipping" },
      { title: "Slå ditt puttrekord", text: "Spela själv och försök förbättra ditt personbästa.", action: "Spela puttutmaningen", href: "/puttrundan", art: "target" },
    ],
  },
  {
    label: "Hur bra är jag?", cover: "hcp",
    stories: [
      { title: "Ett HCP för varje moment", text: "Se dina styrkor och svagheter. Testerna uppskattar din nivå – inte ditt officiella handicap.", action: "Välj HCP-test", href: "/standardiserade-tester", art: "hcp" },
      { title: "Hur snabb är du?", text: "Mät bollhastigheten med en hastighetsmätare och följ din speed.", action: "Testa din speed", href: "/speed-test", art: "speed" },
      { title: "Se dina framsteg", text: "Testa igen. Jämför med tidigare resultat och se vad som har blivit bättre.", action: "Se min utveckling", href: "/framsteg", art: "progress" },
      { title: "Jämför med kompisar", text: "Se era styrkor och vem som ligger före i olika golfmoment.", action: "Jämför med en kompis", href: "/jamfor", art: "compare" },
    ],
  },
  {
    label: "Tränar själv?", cover: "target",
    stories: [
      { title: "Träna med ett mål", text: "Samla poäng och försök slå ditt personbästa.", action: "Välj utmaning", href: "/spela-runda", art: "target" },
      { title: "Vet vad du ska träna", text: "Välj ett moment. Få uppgifter och återkoppling under passet.", action: "Starta guidad träning", href: "/coach", art: "practice" },
    ],
  },
  {
    label: "På banan?", cover: "course",
    stories: [
      { title: "Gör rundan till en match", text: "Välj kompis och antal hål. Ingen bana behöver läggas in.", action: "Spela på bana", href: "/match?flow=friend&category=course", art: "course" },
      { title: "Tre hål eller hela rundan?", text: "Spela en egen match på de hål ni hinner med.", action: "Starta en banmatch", href: "/match?flow=friend&category=course", art: "course" },
      { title: "Olika bra? Ge extraslag", text: "Bestäm vem som får extraslag. SG4 fördelar dem över hålen.", action: "Spela med extraslag", href: "/match?flow=friend&category=course", art: "compare" },
    ],
  },
];

const TONES = [
  { background: "#0c1729", accent: "#93c5fd" },
  { background: "#1b1530", accent: "#c4b5fd" },
  { background: "#092a25", accent: "#a7f3d0" },
  { background: "#2a2013", accent: "#fcd34d" },
];

export function SG4Highlights({
  groups = SG4_HIGHLIGHTS,
  title = "När ska jag använda SG4?",
  subtitle,
  id = "sg4-highlights-title",
}: {
  groups?: HighlightGroup[];
  title?: string;
  subtitle?: string;
  id?: string;
} = {}) {
  const [position, setPosition] = useState<StoryPosition | null>(null);
  const [seen, setSeen] = useState<number[]>([]);
  const opener = useRef<HTMLButtonElement | null>(null);
  const available = groups.filter(item => item.stories.length > 0);
  const group = position ? available[position.group] : undefined;
  const story = position && group ? group.stories[position.slide] : undefined;

  function markSeen() {
    if (position) setSeen(previous => previous.includes(position.group) ? previous : [...previous, position.group]);
  }

  function move(direction: -1 | 1) {
    if (!position || !group) return;
    if (direction > 0 && position.slide === group.stories.length - 1) markSeen();
    setPosition(moveStory(available.map(item => item.stories.length), position, direction));
  }

  if (available.length === 0) return null;
  return (
    <section aria-labelledby={id} className="mb-5 mt-5">
      <h2 id={id} className="mb-3 text-base font-bold tracking-normal">{title}</h2>
      {subtitle && <p className="mb-4 text-sm leading-relaxed text-slate-600">{subtitle}</p>}
      <div className="flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {available.map((item, i) => {
          const tone = TONES[i % TONES.length];
          return (
            <button
              key={item.label}
              type="button"
              aria-label={`${item.label} – ${item.stories.length} tips`}
              onClick={event => { opener.current = event.currentTarget; setPosition({ group: i, slide: 0 }); }}
              className="flex w-[70px] shrink-0 flex-col items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <span className={`block h-[68px] w-[68px] rounded-full p-[2px] ${seen.includes(i) ? "bg-slate-300" : "bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-600"}`}>
                <span className="flex h-full w-full items-center justify-center rounded-full border-[3px] border-white" style={{ backgroundColor: tone.background, color: tone.accent }}>
                  <StoryCover art={item.cover ?? item.stories[0].art ?? "hcp"} />
                </span>
              </span>
              <span className="text-center text-[11px] font-semibold leading-snug text-slate-700">{item.label}</span>
            </button>
          );
        })}
      </div>
      <Dialog.Root open={!!position && !!story} onOpenChange={open => { if (!open) setPosition(null); }}>
        {position && group && story && (
          <HighlightViewer
            groups={available}
            position={position}
            title={title}
            move={move}
            select={slide => setPosition({ ...position, slide })}
            close={() => setPosition(null)}
            restoreFocus={() => opener.current?.focus()}
            onAction={markSeen}
          />
        )}
      </Dialog.Root>
    </section>
  );
}

type ViewerProps = {
  groups: HighlightGroup[];
  position: StoryPosition;
  title: string;
  move: (direction: -1 | 1) => void;
  select: (slide: number) => void;
  close: () => void;
  restoreFocus: () => void;
  onAction: () => void;
};

type ActiveGesture = { id: number; start: StoryPoint; height: number; moved: boolean };

function HighlightViewer({ groups, position, title, move, select, close, restoreFocus, onAction }: ViewerProps) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<ActiveGesture | null>(null);
  const suppressClick = useRef(false);
  const group = groups[position.group];
  const story = group.stories[position.slide];
  const art = story.art ?? "hcp";
  const tone = TONES[position.group % TONES.length];
  const first = position.group === 0 && position.slide === 0;
  const last = position.slide === group.stories.length - 1;
  const nextGroup = groups[position.group + 1];
  const nextLabel = last ? (nextGroup ? `Nästa kategori: ${nextGroup.label}` : "Avsluta stories") : "Nästa story";
  const example = ["hcp", "speed", "progress", "focus", "compare"].includes(art);

  function point(event: PointerEvent<HTMLElement>): StoryPoint {
    return { x: event.clientX, y: event.clientY, time: event.timeStamp };
  }

  function cancelGesture(event: PointerEvent<HTMLElement>) {
    if (gesture.current?.id !== event.pointerId) return;
    suppressClick.current = gesture.current.moved;
    gesture.current = null;
    setDragging(false);
    setDragY(0);
  }

  return (
    <Dialog.Portal>
      <Dialog.Overlay
        className="fixed inset-0 z-[240] bg-black/90 transition-opacity motion-reduce:transition-none"
        style={{ opacity: Math.max(0.35, 1 - dragY / 500) }}
      />
      <Dialog.Content
        data-sg4-story-panel
        onCloseAutoFocus={event => { event.preventDefault(); restoreFocus(); }}
        onKeyDown={event => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            move(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0) return;
          suppressClick.current = false;
          // Links, close and progress controls keep their own native click behavior.
          const control = (event.target as HTMLElement).closest("a, button, input, select, textarea, [role='button']");
          if (control && !control.hasAttribute("data-story-nav")) return;
          gesture.current = { id: event.pointerId, start: point(event), height: event.currentTarget.clientHeight, moved: false };
        }}
        onPointerMove={event => {
          const current = gesture.current;
          if (!current || current.id !== event.pointerId) return;
          const end = point(event);
          if (!current.moved && isStoryDrag(current.start, end)) {
            current.moved = true;
            suppressClick.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
          }
          if (current.moved) {
            const dx = end.x - current.start.x;
            const dy = end.y - current.start.y;
            setDragY(dy > Math.abs(dx) ? Math.max(0, dy) : 0);
          }
        }}
        onPointerUp={event => {
          const current = gesture.current;
          if (!current || current.id !== event.pointerId) return;
          const end = point(event);
          suppressClick.current = current.moved || isStoryDrag(current.start, end);
          gesture.current = null;
          setDragging(false);
          setDragY(0);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          if (shouldDismissStory(current.start, end, current.height)) close();
        }}
        onPointerCancel={cancelGesture}
        onLostPointerCapture={cancelGesture}
        onClickCapture={event => {
          // A drag must not also advance the story or activate an underlying CTA.
          if (suppressClick.current && event.detail !== 0) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
        className="fixed inset-0 z-[250] mx-auto flex h-dvh w-full max-w-[440px] select-none flex-col overflow-hidden text-white shadow-2xl outline-none sm:inset-y-4 sm:h-[calc(100dvh-2rem)] sm:rounded-[28px]"
        style={{
          backgroundColor: tone.background,
          touchAction: "pan-x pinch-zoom",
          transform: `translate3d(0, ${dragY}px, 0) scale(${Math.max(0.92, 1 - dragY / 4000)})`,
          transition: dragging ? "none" : "transform 220ms ease-out, background-color 180ms ease-out",
        }}
      >
        <style>{`@keyframes sg4StoryEnter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.sg4-story-enter{animation:sg4StoryEnter .22s ease-out}@media(prefers-reduced-motion:reduce){.sg4-story-enter{animation:none}[data-sg4-story-panel]{transition:none!important}}`}</style>
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="shrink-0 px-4 pt-[max(8px,env(safe-area-inset-top))]">
            <div className="flex gap-1" aria-label={`Story ${position.slide + 1} av ${group.stories.length}`}>
              {group.stories.map((_, i) => (
                <button key={i} type="button" aria-label={`Visa story ${i + 1}`} aria-current={i === position.slide ? "step" : undefined} onClick={() => select(i)} className="flex h-5 flex-1 items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  <span className={`h-[3px] w-full rounded-full ${i <= position.slide ? "bg-white" : "bg-white/25"}`} />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pb-1">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 text-[10px] font-black tracking-wide">SG4</span>
              <div key={position.group} className="sg4-story-enter min-w-0 flex-1" aria-live="polite" aria-atomic="true">
                <p className="text-sm font-bold" style={{ color: tone.accent }}>{group.label}</p>
                <p className="mt-0.5 text-[10px] text-white/60">{groups.length === 1 ? `Steg ${position.slide + 1} av ${group.stories.length}` : `Kategori ${position.group + 1} av ${groups.length}`} · {position.slide + 1}/{group.stories.length}</p>
              </div>
              <Dialog.Close aria-label="Stäng stories" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                <X className="h-6 w-6" />
              </Dialog.Close>
            </div>
          </header>

          <div className="relative min-h-0 flex-1" aria-label="Tryck till vänster eller höger för att bläddra">
            <div key={`${position.group}-${position.slide}`} className="sg4-story-enter pointer-events-none flex h-full min-h-0 flex-col px-7 pb-2 pt-[clamp(8px,2dvh,22px)]">
              <div className="shrink-0">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em]" style={{ color: tone.accent }}>{title}</p>
                <Dialog.Title className="font-sans text-[clamp(26px,4.5dvh,42px)] font-extrabold leading-[1.08] tracking-tight">{story.title}</Dialog.Title>
                <Dialog.Description className="mt-3 text-[clamp(14px,2.2dvh,17px)] leading-relaxed text-slate-300">{story.text}</Dialog.Description>
              </div>
              <div className="mx-auto mt-3 flex min-h-0 w-full max-w-[330px] flex-1 items-center justify-center py-2">
                <StoryArtwork art={art} />
              </div>
              <p className="shrink-0 text-center text-[10px] text-white/50">{example ? "Illustrerat exempel – inte dina resultat" : "Ett moment. Ett tydligt mål."}</p>
            </div>
            <div className="absolute inset-0 flex">
              <button type="button" data-story-nav aria-label="Föregående story" aria-disabled={first} onClick={() => move(-1)} className="w-2/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70" />
              <button type="button" data-story-nav aria-label={nextLabel} onClick={() => move(1)} className="flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70" />
            </div>
          </div>

          <footer className="shrink-0 px-5 pb-[max(10px,env(safe-area-inset-bottom))] pt-3">
            <a href={story.href} onClick={() => { onAction(); close(); }} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-center text-sm font-bold text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950">
              {story.action}<ArrowRight className="h-4 w-4 shrink-0" />
            </a>
            <div className="mt-1 flex items-center justify-between gap-2">
              <button type="button" aria-label="Föregående story" disabled={first} onClick={() => move(-1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><ChevronLeft className="h-4 w-4" /></button>
              {last ? <button type="button" onClick={() => move(1)} className="min-h-11 flex-1 text-center text-[11px] font-semibold text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">{nextLabel}</button> : <span className="flex items-center gap-1 text-[10px] text-white/60"><ArrowDown className="h-3 w-3" />Svep ned för att stänga</span>}
              <button type="button" aria-label={nextLabel} onClick={() => move(1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </footer>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
