import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/spela-runda")({
  head: () => ({meta: [{title: "Spela en runda – SG4"}]}),
  component: RoundGamesPage,
});
function RoundGamesPage() {
  useHideBottomNav(true);
  return <main className="mx-auto min-h-screen max-w-md bg-slate-50 px-5 pb-8 pt-[max(16px,env(safe-area-inset-top))] text-slate-950">
    <Link to="/" data-local-navigation aria-label="Tillbaka till startsidan" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white"><ArrowLeft className="h-5 w-5"/></Link>
    <h1 className="mt-6 text-3xl font-black">Spela en runda</h1>
    <p className="mt-2 text-base text-slate-500">Slå ditt personbästa och få ett HCP-resultat.</p>
    <Link to="/chipprundan" className="mt-6 block overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
      <img src="/0d286fd4-99fa-47eb-b39c-a7ff718ebdd6.png" alt="" className="h-48 w-full object-cover object-[18%_50%]"/>
      <div className="flex items-center justify-between p-5"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Spela själv</p><h2 className="mt-1 text-2xl font-black">Chipprundan</h2><p className="mt-1 text-sm text-slate-500">6 hål · poäng · stjärnor</p></div><ChevronRight className="h-6 w-6 text-blue-600"/></div>
    </Link>
    <Link to="/puttrundan" className="mt-6 block overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
      <img src="/Putting_1.png" alt="" className="h-48 w-full object-cover object-[18%_50%]"/>
      <div className="flex items-center justify-between p-5"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Spela själv</p><h2 className="mt-1 text-2xl font-black">Puttrundan</h2><p className="mt-1 text-sm text-slate-500">6 hål · en boll · 16 stjärnor</p></div><ChevronRight className="h-6 w-6 text-blue-600"/></div>
    </Link>
    <Link to="/bunkerrundan" className="mt-6 block overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
      <img src="/bunker-round.svg" alt="" className="h-48 w-full object-cover object-[18%_50%]"/>
      <div className="flex items-center justify-between p-5"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Spela själv</p><h2 className="mt-1 text-2xl font-black">Bunkerrundan</h2><p className="mt-1 text-sm text-slate-500">2 omgångar · 6 slag · 6 stjärnor</p></div><ChevronRight className="h-6 w-6 text-blue-600"/></div>
    </Link>
  </main>;
}
