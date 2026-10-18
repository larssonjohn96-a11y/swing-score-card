import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/spela-runda")({
  head: () => ({ meta: [{ title: "HCP-tester – SG4" }] }),
  component: RoundGamesPage,
});
const GAMES = [
  { to:"/speedrundan", title:"Ball Speed", image:"/Off_the_tee.png" },
  { to:"/driverrundan", title:"Driver", image:"/Off_the_tee.png" },
  { to:"/approach-pei-wedge", title:"Korta inspel", image:"/Approach_shot.png", detail:"30–110 m · 9 slag" },
  { to:"/approach-pei-iron", title:"Inspel järn", image:"/Approach_shot.png", detail:"120–175 m · 9 slag" },
  { to:"/puttrundan", search:{mode:"short"}, title:"Kortputt", image:"/Putting_1.png", detail:"1–4 m · 9 hål" },
  { to:"/puttrundan", search:{mode:"long"}, title:"Långputt", image:"/Putting_1.png", detail:"6–18 m · 9 hål" },
  { to:"/chipprundan", title:"Chippning", image:"/0d286fd4-99fa-47eb-b39c-a7ff718ebdd6.png" },
  { to:"/bunkerrundan", title:"Bunker", image:"/bunker-round.svg" },
] as const;

type GameCard = (typeof GAMES)[number];

function RoundGamesPage() {
  const Card=({game,portrait=false,full=false}:{game:GameCard;portrait?:boolean;full?:boolean})=><div className={`relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm ${full?"h-[190px] w-full":portrait?"h-[236px] w-[180px] shrink-0":"h-[220px] w-full"}`}>
    <Link to={game.to} search={"search" in game ? game.search : {}} className="absolute inset-0"><img src={game.image} alt="" className="h-full w-full object-cover object-[18%_50%]"/><span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/12 to-black/5"/><span className="absolute inset-x-0 bottom-0 p-4 text-white"><strong className="font-display text-[28px] leading-none">{game.title}</strong>{"detail" in game && <span className="mt-2 block text-[12px] font-semibold text-white/90">{game.detail}</span>}</span></Link>
  </div>;
  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28 text-slate-950">
      <div className="px-5">
      <section className="mt-6 px-1">
        <h1 className="mt-1 text-[42px] font-black leading-[.98] tracking-[-.02em]">HCP-tester</h1>
        <p className="mt-4 max-w-sm text-[17px] font-medium leading-[1.5] text-slate-600">Testa ditt golfspel och följ din utveckling inom varje kategori.</p>
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
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{GAMES.filter(g=>g.to==="/approach-pei-wedge"||g.to==="/approach-pei-iron").map(game=><Card key={game.to} game={game} portrait />)}</div>
      </section>
      <section className="mt-8">
        <h2 className="px-0.5 font-display text-[30px] leading-none text-slate-950">Puttning</h2>
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{GAMES.filter(g=>g.to==="/puttrundan").map(game=><Card key={game.title} game={game} portrait />)}</div>
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
