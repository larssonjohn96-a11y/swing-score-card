import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/spela-runda")({
  head: () => ({ meta: [{ title: "HCP-tester – SG4" }] }),
  component: RoundGamesPage,
});
const GAMES = [
  { to:"/speedrundan", title:"Ball Speed", image:"/Off_the_tee.png" },
  { to:"/driverrundan", title:"Driver", image:"/Off_the_tee.png" },
  { to:"/inspelsrundan", title:"Inspel", image:"/Approach_shot.png" },
  { to:"/puttrundan", title:"Puttning", image:"/Putting_1.png" },
  { to:"/chipprundan", title:"Chippning", image:"/0d286fd4-99fa-47eb-b39c-a7ff718ebdd6.png" },
  { to:"/bunkerrundan", title:"Bunker", image:"/bunker-round.svg" },
] as const;

type GameCard = (typeof GAMES)[number];

function RoundGamesPage() {
  const Card=({game,portrait=false,full=false}:{game:GameCard;portrait?:boolean;full?:boolean})=><div className={`relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm ${full?"h-[190px] w-full":portrait?"h-[236px] w-[180px] shrink-0":"h-[220px] w-full"}`}>
    <Link to={game.to} className="absolute inset-0"><img src={game.image} alt="" className="h-full w-full object-cover object-[18%_50%]"/><span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/12 to-black/5"/><span className="absolute inset-x-0 bottom-0 p-4 text-white"><strong className="font-display text-[28px] leading-none">{game.title}</strong></span></Link>
  </div>;
  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/75 bg-slate-50/92 px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <Link to="/" aria-label="Tillbaka" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <p className="truncate text-center text-[15px] font-bold text-slate-950">HCP-tester</p>
          <span aria-hidden="true" />
        </div>
      </header>

      <div className="px-5">
      <section className="mt-6 px-1">
        <h1 className="mt-1 text-[42px] font-black leading-[.98] tracking-[-.02em]">HCP-tester</h1>
        <p className="mt-4 max-w-sm text-[17px] font-medium leading-[1.5] text-slate-600">Testa ditt golfspel och se din HCP-nivå i varje kategori.</p>
      </section>
      <section className="mt-8">
        <h2 className="px-0.5 font-display text-[30px] leading-none text-slate-950">Speed</h2>
        <div className="mt-3">{GAMES.filter(g=>g.to==="/speedrundan").map(game=><Card key={game.to} game={game} full />)}</div>
      </section>
      <section className="mt-8">
        <h2 className="px-0.5 font-display text-[30px] leading-none text-slate-950">Utslag</h2>
        <div className="mt-3">{GAMES.filter(g=>g.to==="/driverrundan").map(game=><Card key={game.to} game={game} full />)}</div>
      </section>
      <section className="mt-8">
        <h2 className="px-0.5 font-display text-[30px] leading-none text-slate-950">Inspel</h2>
        <div className="mt-3">{GAMES.filter(g=>g.to==="/inspelsrundan").map(game=><Card key={game.to} game={game} full />)}</div>
      </section>
      <section className="mt-8">
        <h2 className="px-0.5 font-display text-[30px] leading-none text-slate-950">Puttning</h2>
        <div className="mt-3">{GAMES.filter(g=>g.to==="/puttrundan").map(game=><Card key={game.to} game={game} full />)}</div>
      </section>
      <section className="mt-8">
        <h2 className="px-0.5 font-display text-[30px] leading-none text-slate-950">Närspel</h2>
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {GAMES.filter(g=>g.to==="/chipprundan"||g.to==="/bunkerrundan").map(game=><Card key={game.to} game={game} portrait />)}
        </div>
      </section>
      </div>
    </main>
  );
}
