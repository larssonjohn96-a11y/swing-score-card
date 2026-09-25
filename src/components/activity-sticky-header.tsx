import { Link } from "@tanstack/react-router";
import { ArrowLeft, X } from "lucide-react";
import { getHubHeader, normalizeHeaderPath } from "@/lib/hub-header";

const ACTIVITY_HEADER_TITLES: Record<string, string> = {
  "/spela-runda": "Spel & utmaningar",
  "/speedrundan": "Ball Speed Challenge",
  "/driverrundan": "Utslag",
  "/chipprundan": "Närspel",
  "/puttrundan": "Puttning",
  "/inspelsrundan": "Inspel",
  "/bunkerrundan": "Bunker",
  "/longdrive": "Long Drive",
  "/8-bollar": "8 Bollar",
  "/upp-och-in": "Upp & In",
  "/tutor-test": "Tutor Test",
  "/pga-tour-18-puttar": "18 Puttar",
  "/lagputt": "Lag Putt",
  "/green-reading": "Green Reading",
  "/klock-putt": "Klockputt",
  "/50-bollar": "25-bollsövningen",
  "/par-3-challenge": "Par 3 Challenge",
  "/approach-pei-valj": "PEI Approach",
  "/approach-pei-wedge": "PEI Wedge",
  "/approach-pei-iron": "PEI Iron",
  "/shot-shaping": "Shot Shaping",
  "/wedge-stege": "Wedge Stege",
  "/driver-konsekvens": "Driver Consistency",
  "/fairway-streak": "Fairway Streak",
  "/speed-test": "Ball Speed Test",
  "/bunker-test": "Bunkertest",
  "/narspel-test": "Närspelstest",
  "/offtee-test": "Off the Tee Test",
  "/putting": "Putting Test",
  "/approach": "Approach Test",
};

const BACK_BUTTON_CLASS =
  "flex h-10 w-10 items-center justify-center rounded-full text-slate-800 transition active:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

const TEST_ABORT_PATHS = new Set(["/speedrundan","/longdrive","/driverrundan","/inspelsrundan","/chipprundan","/puttrundan"]);

export function ActivityStickyHeader({ pathname }: { pathname: string }) {
  const normalizedPath = normalizeHeaderPath(pathname);
  const hub = getHubHeader(normalizedPath);
  const title = hub?.title ?? ACTIVITY_HEADER_TITLES[normalizedPath];
  const activeTest = typeof document !== "undefined" && document.documentElement.dataset.sg4TestActive === "true";
  if (!title) return null;
  if (typeof document !== "undefined" && document.documentElement.dataset.chipScreenColor === "blue") return null;

  return (
    <header
      data-activity-sticky-header
      className="sticky top-0 z-[60] border-b border-slate-200/70 bg-white/88 pt-[env(safe-area-inset-top)] backdrop-blur-2xl"
    >
      <div className="mx-auto grid h-[58px] w-full max-w-md grid-cols-[44px_minmax(0,1fr)_44px] items-center px-3">
        {hub ? (
          <Link to={hub.to} data-local-navigation aria-label="Tillbaka till Spel & utmaningar" className={BACK_BUTTON_CLASS}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
        ) : (
          <button type="button" data-dynamic-back aria-label="Tillbaka" className={BACK_BUTTON_CLASS}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
        <p className="min-w-0 truncate text-center text-[14px] font-extrabold tracking-[-.01em] text-slate-950">
          {title}
        </p>
        <span aria-hidden="true" />
      </div>
    </header>
  );
}
