import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/spela-runda")({
  head: () => ({ meta: [{ title: "Spel & utmaningar – SG4" }] }),
  component: RoundGamesPage,
});
function RoundGamesPage() {
  useHideBottomNav(true);
  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-50 px-5 pb-8 pt-[max(16px,env(safe-area-inset-top))] text-slate-950">
      <Link
        to="/"
        data-local-navigation
        aria-label="Tillbaka till startsidan"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <h1 className="mt-6 text-3xl font-black">Spel & utmaningar</h1>
      <p className="mt-2 text-base text-slate-500">Slå ditt personbästa och se din HCP-nivå.</p>
      <Link
        to="/chipprundan"
        className="mt-6 block overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm"
      >
        <img
          src="/0d286fd4-99fa-47eb-b39c-a7ff718ebdd6.png"
          alt=""
          className="h-48 w-full object-cover object-[18%_50%]"
        />
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
               Chippning
            </p>
            <h2 className="mt-1 text-2xl font-black">Närmast flaggan</h2>
            <p className="mt-1 text-sm text-slate-500">6 hål · poäng · stjärnor</p>
          </div>
          <ChevronRight className="h-6 w-6 text-blue-600" />
        </div>
      </Link>
      <Link
        to="/puttrundan"
        className="mt-6 block overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm"
      >
        <img src="/Putting_1.png" alt="" className="h-48 w-full object-cover object-[18%_50%]" />
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
               Puttning
            </p>
            <h2 className="mt-1 text-2xl font-black">Sänk den!</h2>
            <p className="mt-1 text-sm text-slate-500">6 hål · en boll · 16 stjärnor</p>
          </div>
          <ChevronRight className="h-6 w-6 text-blue-600" />
        </div>
      </Link>
      <Link
        to="/inspelsrundan"
        className="mt-6 block overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm"
      >
        <img
          src="/Approach_shot.png"
          alt=""
          className="h-48 w-full object-cover object-[18%_50%]"
        />
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
               Inspel
            </p>
            <h2 className="mt-1 text-2xl font-black">Mitt i prick</h2>
            <p className="mt-1 text-sm text-slate-500">6 mål · 6 slag · 18 stjärnor</p>
          </div>
          <ChevronRight className="h-6 w-6 text-blue-600" />
        </div>
      </Link>
      <Link
        to="/driverrundan"
        className="mt-6 block overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm"
      >
        <img src="/Off_the_tee.png" alt="" className="h-48 w-full object-cover object-[18%_50%]" />
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
               Driver
            </p>
            <h2 className="mt-1 text-2xl font-black">Långt & rakt</h2>
            <p className="mt-1 text-sm text-slate-500">
              6 utslag · längd & precision
            </p>
          </div>
          <ChevronRight className="h-6 w-6 text-blue-600" />
        </div>
      </Link>
      <Link
        to="/speedrundan"
        className="mt-6 block overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm"
      >
        <img src="/Off_the_tee.png" alt="" className="h-48 w-full object-cover object-[18%_50%]" />
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
               Speed
            </p>
            <h2 className="mt-1 text-2xl font-black">Maxfart</h2>
            <p className="mt-1 text-sm text-slate-500">6 försök · jaga din toppfart</p>
          </div>
          <ChevronRight className="h-6 w-6 text-blue-600" />
        </div>
      </Link>
      <Link
        to="/bunkerrundan"
        className="mt-6 block overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm"
      >
        <img src="/bunker-round.svg" alt="" className="h-48 w-full object-cover object-[18%_50%]" />
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
               Bunker
            </p>
            <h2 className="mt-1 text-2xl font-black">Sandjakten</h2>
            <p className="mt-1 text-sm text-slate-500">2 omgångar · 6 slag · 6 stjärnor</p>
          </div>
          <ChevronRight className="h-6 w-6 text-blue-600" />
        </div>
      </Link>
    </main>
  );
}
