import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/spela-runda")({
  head: () => ({ meta: [{ title: "Spel & utmaningar – SG4" }] }),
  component: RoundGamesPage,
});
function RoundGamesPage() {
  useHideBottomNav(true);
  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-50 px-5 pb-8 pt-[max(16px,env(safe-area-inset-top))] text-slate-950">
      <section className="mt-6 px-1">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Spel & utmaningar</p>
        <h1 className="mt-1 font-display text-[38px] leading-none">Hur bra är ditt spel?</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">Spela en kategori och få din nivå direkt efter rundan. Vilken är du bäst på?</p>
      </section>
      <section className="mt-8">
        <h2 className="px-0.5 font-display text-[28px] leading-none text-slate-950">Speed</h2>
        <div className="mt-3 space-y-4">
          <Link
            to="/speedrundan"
            className="relative mt-6 block overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm"
          >
            <span className="absolute right-3 top-3 z-10 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm">HCP-analys</span>
            <img src="/Off_the_tee.png" alt="" className="h-48 w-full object-cover object-[18%_50%]" />
            <div className="flex items-center justify-between gap-3 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                   Speed
                </p>
                <h2 className="mt-1 text-2xl font-black">Maxfart</h2>
                <p className="mt-1 text-sm text-slate-500">Hur hårt kan du slå?</p>
              </div>
              <ChevronRight className="h-6 w-6 shrink-0 text-blue-600" />
            </div>
          </Link>
        </div>
      </section>
      <section className="mt-8">
        <h2 className="px-0.5 font-display text-[28px] leading-none text-slate-950">Off the Tee</h2>
        <div className="mt-3 space-y-4">
          <Link
            to="/longdrive"
            className="relative mt-6 block overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm"
          >
            <img src="/Off_the_tee.png" alt="" className="h-48 w-full object-cover object-[18%_50%]" />
            <div className="flex items-center justify-between gap-3 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Styrka</p>
                <h2 className="mt-1 text-2xl font-black">Long Drive</h2>
                <p className="mt-1 text-sm text-slate-500">Tre slag. Hur långt kan du slå?</p>
              </div>
              <ChevronRight className="h-6 w-6 shrink-0 text-blue-600" />
            </div>
          </Link>
          <Link
            to="/driverrundan"
            className="relative mt-6 block overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm"
          >
            <span className="absolute right-3 top-3 z-10 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm">HCP-analys</span>
            <img src="/Off_the_tee.png" alt="" className="h-48 w-full object-cover object-[18%_50%]" />
            <div className="flex items-center justify-between gap-3 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                   Driver
                </p>
                <h2 className="mt-1 text-2xl font-black">Utslag</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Hur långt och rakt kan du slå?
                </p>
              </div>
              <ChevronRight className="h-6 w-6 shrink-0 text-blue-600" />
            </div>
          </Link>
        </div>
      </section>
      <section className="mt-8">
        <h2 className="px-0.5 font-display text-[28px] leading-none text-slate-950">Inspel</h2>
        <div className="mt-3 space-y-4">
          <Link
            to="/inspelsrundan"
            className="relative mt-6 block overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm"
          >
            <span className="absolute right-3 top-3 z-10 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm">HCP-analys</span>
            <img
              src="/Approach_shot.png"
              alt=""
              className="h-48 w-full object-cover object-[18%_50%]"
            />
            <div className="flex items-center justify-between gap-3 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                   Inspel
                </p>
                <h2 className="mt-1 text-2xl font-black">Inspel</h2>
                <p className="mt-1 text-sm text-slate-500">Hur nära kan du slå?</p>
              </div>
              <ChevronRight className="h-6 w-6 shrink-0 text-blue-600" />
            </div>
          </Link>
        </div>
      </section>
      <section className="mt-8">
        <h2 className="px-0.5 font-display text-[28px] leading-none text-slate-950">Puttning</h2>
        <div className="mt-3 space-y-4">
          <Link
            to="/puttrundan"
            className="relative mt-6 block overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm"
          >
            <span className="absolute right-3 top-3 z-10 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm">HCP-analys</span>
            <img src="/Putting_1.png" alt="" className="h-48 w-full object-cover object-[18%_50%]" />
            <div className="flex items-center justify-between gap-3 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                   Puttning
                </p>
                <h2 className="mt-1 text-2xl font-black">Puttning</h2>
                <p className="mt-1 text-sm text-slate-500">Hur många kan du sänka?</p>
              </div>
              <ChevronRight className="h-6 w-6 shrink-0 text-blue-600" />
            </div>
          </Link>
        </div>
      </section>
      <section className="mt-8">
        <h2 className="px-0.5 font-display text-[28px] leading-none text-slate-950">Närspel</h2>
        <div className="mt-3 space-y-4">
          <Link
            to="/chipprundan"
            className="relative mt-6 block overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm"
          >
            <span className="absolute right-3 top-3 z-10 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm">HCP-analys</span>
            <img
              src="/0d286fd4-99fa-47eb-b39c-a7ff718ebdd6.png"
              alt=""
              className="h-48 w-full object-cover object-[18%_50%]"
            />
            <div className="flex items-center justify-between gap-3 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                   Chippning
                </p>
                <h2 className="mt-1 text-2xl font-black">Närspel</h2>
                <p className="mt-1 text-sm text-slate-500">Hur nära flaggan kan du komma?</p>
              </div>
              <ChevronRight className="h-6 w-6 shrink-0 text-blue-600" />
            </div>
          </Link>
          <Link
            to="/bunkerrundan"
            className="relative mt-6 block overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm"
          >
            <span className="absolute right-3 top-3 z-10 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm">HCP-analys</span>
            <img src="/bunker-round.svg" alt="" className="h-48 w-full object-cover object-[18%_50%]" />
            <div className="flex items-center justify-between gap-3 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                   Bunker
                </p>
                <h2 className="mt-1 text-2xl font-black">Bunker</h2>
                <p className="mt-1 text-sm text-slate-500">Hur nära kan du komma från sanden?</p>
              </div>
              <ChevronRight className="h-6 w-6 shrink-0 text-blue-600" />
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
