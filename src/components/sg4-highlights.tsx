import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";

type Story = { title: string; text: string; action: string; href: string; image: string };
export const SG4_HIGHLIGHTS: { label: string; image: string; stories: Story[] }[] = [
  {
    label: "10 min över?",
    image: "/Putting_1.png",
    stories: [
      {
        title: "En snabb puttmatch",
        text: "Tio minuter över? Utmana en kompis på tre hål.",
        action: "Starta puttmatch",
        href: "/match?flow=friend&category=putting",
        image: "/Putting_1.png",
      },
      {
        title: "Vem chippar närmast?",
        text: "Gör uppvärmningen till en kort match mot en vän.",
        action: "Starta chippmatch",
        href: "/match?flow=friend&category=around-the-green",
        image: "/Approach_shot.png",
      },
      {
        title: "Slå ditt puttrekord",
        text: "Spela själv och försök förbättra ditt personbästa.",
        action: "Spela puttutmaningen",
        href: "/puttrundan",
        image: "/Putting_1.png",
      },
    ],
  },
  {
    label: "Hur bra är jag?",
    image: "/Off_the_tee.png",
    stories: [
      {
        title: "HCP för varje moment",
        text: "Testa dina styrkor med uppskattat HCP per moment – inte officiellt handicap.",
        action: "Välj HCP-test",
        href: "/standardiserade-tester",
        image: "/Approach_shot.png",
      },
      {
        title: "Hur snabb är du?",
        text: "Mät bollhastigheten med en hastighetsmätare och följ din speed.",
        action: "Testa din speed",
        href: "/speed-test",
        image: "/Off_the_tee.png",
      },
      {
        title: "Se dina framsteg",
        text: "Jämför med tidigare tester och se hur ditt spel utvecklas.",
        action: "Se min utveckling",
        href: "/framsteg",
        image: "/Approach_shot.png",
      },
      {
        title: "Jämför med kompisar",
        text: "Se era styrkor och vem som ligger före i olika golfmoment.",
        action: "Jämför med en kompis",
        href: "/jamfor",
        image: "/Red_vs_blue_1.png",
      },
    ],
  },
  {
    label: "Tränar själv?",
    image: "/Red_vs_blue_1.png",
    stories: [
      {
        title: "Spela mot en bot",
        text: "Tränar du ensam? Få en motståndare att tävla mot.",
        action: "Välj en bot",
        href: "/match-bot",
        image: "/Red_vs_blue_1.png",
      },
      {
        title: "Träna med ett mål",
        text: "Samla poäng och försök slå ditt personbästa.",
        action: "Välj utmaning",
        href: "/spela-runda",
        image: "/Putting_1.png",
      },
      {
        title: "Få hjälp med träningen",
        text: "Välj ett moment och få uppgifter och återkoppling under passet.",
        action: "Starta guidad träning",
        href: "/coach",
        image: "/Putting_1.png",
      },
    ],
  },
  {
    label: "På banan?",
    image: "/Approach_shot.png",
    stories: [
      {
        title: "Match på korthålsbanan",
        text: "Välj kompis och antal hål. Ingen bana behöver läggas in.",
        action: "Spela på bana",
        href: "/match?flow=friend&category=course",
        image: "/Approach_shot.png",
      },
      {
        title: "Tävla på valfria hål",
        text: "Spela en egen match på hela rundan eller bara några hål.",
        action: "Starta en banmatch",
        href: "/match?flow=friend&category=course",
        image: "/Off_the_tee.png",
      },
      {
        title: "Olika bra? Ge extraslag",
        text: "Bestäm vem som får extraslag. SG4 fördelar dem över hålen.",
        action: "Spela med extraslag",
        href: "/match?flow=friend&category=course",
        image: "/Red_vs_blue_1.png",
      },
    ],
  },
];

export function SG4Highlights() {
  const [position, setPosition] = useState<{ group: number; slide: number } | null>(null);
  const [seen, setSeen] = useState<number[]>([]);
  const opener = useRef<HTMLButtonElement | null>(null);
  const group = position ? SG4_HIGHLIGHTS[position.group] : null;
  const story = group && position ? group.stories[position.slide] : null;
  const lastSlide = !!position && !!group && position.slide === group.stories.length - 1;
  const nextGroup = position ? SG4_HIGHLIGHTS[position.group + 1] : undefined;
  const nextLabel = lastSlide
    ? nextGroup
      ? `Nästa kategori: ${nextGroup.label}`
      : "Avsluta stories"
    : "Nästa story";
  const categoryTones = ["bg-blue-600", "bg-violet-600", "bg-emerald-700", "bg-amber-700"];
  const markSeen = () => {
    if (position) setSeen((v) => (v.includes(position.group) ? v : [...v, position.group]));
  };
  function move(direction: number) {
    if (!position || !group) return;
    const slide = position.slide + direction;
    if (slide >= 0 && slide < group.stories.length) setPosition({ ...position, slide });
    else if (direction > 0) {
      markSeen();
      setPosition(
        position.group + 1 < SG4_HIGHLIGHTS.length ? { group: position.group + 1, slide: 0 } : null,
      );
    } else if (position.group > 0)
      setPosition({
        group: position.group - 1,
        slide: SG4_HIGHLIGHTS[position.group - 1].stories.length - 1,
      });
  }
  return (
    <section aria-labelledby="sg4-highlights-title" className="mt-5 mb-5">
      <h2 id="sg4-highlights-title" className="mb-3 text-base font-bold tracking-normal">
        När ska jag använda SG4?
      </h2>
      <div className="grid w-full max-w-[312px] grid-cols-4 gap-1">
        {SG4_HIGHLIGHTS.map((item, i) => (
          <button
            key={item.label}
            type="button"
            aria-label={`${item.label} – ${item.stories.length} tips`}
            onClick={(e) => {
              opener.current = e.currentTarget;
              setPosition({ group: i, slide: 0 });
            }}
            className="flex min-w-0 flex-col items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <span
              className={`block aspect-square w-full max-w-[72px] rounded-full p-[2px] ${seen.includes(i) ? "bg-slate-300" : "bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-600"}`}
            >
              <span className="block h-full w-full overflow-hidden rounded-full border-[3px] border-white bg-slate-100">
                <img
                  src={item.image}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </span>
            </span>
            <span className="text-center text-[11px] font-semibold leading-snug text-slate-700">
              {item.label}
            </span>
          </button>
        ))}
      </div>
      <Dialog.Root
        open={position !== null}
        onOpenChange={(open) => {
          if (!open) setPosition(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[240] bg-black/80" />
          {position && group && story && (
            <Dialog.Content
              onCloseAutoFocus={(e) => {
                e.preventDefault();
                opener.current?.focus();
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  move(1);
                }
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  move(-1);
                }
              }}
              className="fixed inset-0 z-[250] mx-auto flex h-dvh w-full max-w-lg flex-col overflow-y-auto bg-white text-slate-950 outline-none sm:inset-y-4 sm:h-[calc(100dvh-2rem)] sm:rounded-3xl"
            >
              <div className="relative z-10 shrink-0 bg-slate-950 px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))] text-white">
                <div
                  className="flex gap-1.5"
                  aria-label={`Story ${position.slide + 1} av ${group.stories.length}`}
                >
                  {group.stories.map((_, i) => (
                    <button
                      key={i}
                      aria-label={`Visa story ${i + 1}`}
                      aria-current={i === position.slide ? "step" : undefined}
                      onClick={() => setPosition({ ...position, slide: i })}
                      className="flex h-5 flex-1 items-center"
                    >
                      <span
                        className={`h-1 w-full rounded-full ${i <= position.slide ? "bg-white" : "bg-white/35"}`}
                      />
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-white/80">
                    SG4 · När ska jag använda appen?
                  </p>
                  <Dialog.Close
                    aria-label="Stäng stories"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-black/25"
                  >
                    <X className="h-6 w-6" />
                  </Dialog.Close>
                </div>
              </div>
              <style>{`@keyframes sg4CategoryEnter{from{opacity:.3;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.sg4-category-enter{animation:sg4CategoryEnter .28s ease-out}@media(prefers-reduced-motion:reduce){.sg4-category-enter{animation:none}}`}</style>
              <div
                key={position.group}
                aria-live="polite"
                aria-atomic="true"
                className={`sg4-category-enter relative z-10 mx-4 mt-2 rounded-2xl px-4 py-3 text-white ${categoryTones[position.group]}`}
              >
                <p className="text-[11px] font-semibold text-white/80">
                  Kategori {position.group + 1} av {SG4_HIGHLIGHTS.length}
                </p>
                <p className="mt-1 font-sans text-2xl font-extrabold leading-tight tracking-normal">
                  {group.label}
                </p>
              </div>
              <div
                className="relative mx-4 mt-3 flex min-h-[120px] flex-1 overflow-hidden rounded-2xl bg-slate-100"
                aria-label="Bläddra mellan stories"
              >
                <img
                  key={story.image}
                  src={story.image}
                  alt=""
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                />
                <button
                  aria-label="Föregående story"
                  disabled={position.group === 0 && position.slide === 0}
                  className="relative z-10 w-2/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                  onClick={() => move(-1)}
                />
                <button
                  aria-label={nextLabel}
                  className="relative z-10 flex-1 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                  onClick={() => move(1)}
                />
              </div>
              <div className="relative z-10 shrink-0 bg-white px-6 pb-[max(16px,env(safe-area-inset-bottom))] pt-5 text-slate-950">
                <Dialog.Title className="font-sans text-3xl font-extrabold leading-tight tracking-normal">
                  {story.title}
                </Dialog.Title>
                <Dialog.Description className="mt-3 text-lg leading-relaxed text-slate-600">
                  {story.text}
                </Dialog.Description>
                <a
                  href={story.href}
                  onClick={markSeen}
                  className="mt-5 flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-blue-600 px-4 py-3 text-base font-bold text-white"
                >
                  {story.action}
                  <ArrowRight className="h-5 w-5" />
                </a>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    disabled={position.group === 0 && position.slide === 0}
                    onClick={() => move(-1)}
                    aria-label="Föregående story"
                    className="flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-25"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {lastSlide ? (
                    <button
                      onClick={() => move(1)}
                      className="flex min-h-12 max-w-[80%] items-center justify-end gap-2 rounded-xl bg-slate-100 px-3 py-2 text-left text-sm font-bold"
                    >
                      <span>{nextLabel}</span>
                      <ChevronRight className="h-5 w-5 shrink-0" />
                    </button>
                  ) : (
                    <>
                      <span className="text-xs text-slate-500">
                        {position.slide + 1} / {group.stories.length} i denna kategori
                      </span>
                      <button
                        onClick={() => move(1)}
                        aria-label={nextLabel}
                        className="flex h-11 w-11 items-center justify-center rounded-full"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Dialog.Content>
          )}
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
