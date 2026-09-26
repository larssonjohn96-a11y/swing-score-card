import { createFileRoute, Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/spela-runda")({
  head: () => ({ meta: [{ title: "HCP-tester – SG4" }] }),
  component: RoundGamesPage,
});
const FAVORITES_KEY = "sg4-game-favorites-v1";
const GAMES = [
  { to:"/speedrundan", title:"Ball Speed", subtitle:"Hur bra är din speed egentligen? Se din HCP-nivå.", image:"/Off_the_tee.png", hcp:true },
  { to:"/driverrundan", title:"Driver", subtitle:"Hur bra är dina driverutslag egentligen? Se din HCP-nivå.", image:"/Off_the_tee.png", hcp:true },
  { to:"/inspelsrundan", title:"Inspel", subtitle:"Hur bra är dina inspel egentligen? Se din HCP-nivå.", image:"/Approach_shot.png", hcp:true },
  { to:"/puttrundan", title:"Putting", subtitle:"Hur bra är din putting egentligen? Se din HCP-nivå.", image:"/Putting_1.png", hcp:true },
  { to:"/chipprundan", title:"Chipping", subtitle:"Hur bra är din chipping egentligen? Se din HCP-nivå.", image:"/0d286fd4-99fa-47eb-b39c-a7ff718ebdd6.png", hcp:true },
  { to:"/bunkerrundan", title:"Bunker", subtitle:"Hur bra är ditt bunkerspel egentligen? Se din HCP-nivå.", image:"/bunker-round.svg", hcp:true },
] as const;
function RoundGamesPage() {
  useHideBottomNav(true);
  const [favorites,setFavorites]=useState<string[]>([]);
  useEffect(()=>{try{const v=JSON.parse(localStorage.getItem(FAVORITES_KEY)??"[]");if(Array.isArray(v))setFavorites(v)}catch{}},[]);
  const toggle=(to:string)=>setFavorites(cur=>{const next=cur.includes(to)?cur.filter(x=>x!==to):[...cur,to];try{localStorage.setItem(FAVORITES_KEY,JSON.stringify(next))}catch{}return next});
  const favoriteGames=GAMES.filter(g=>favorites.includes(g.to));
  const Card=({game,small=false,full=false,favorite=false}:{game:(typeof GAMES)[number];small?:boolean;full?:boolean;favorite?:boolean})=><div className={`relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm ${full?"h-[190px] w-full":small?"h-[190px] w-[calc((100%-8px)/2)] shrink-0":"h-[220px] w-full"}`}>
    <Link to={game.to} className="absolute inset-0"><img src={game.image} alt="" className="h-full w-full object-cover object-[18%_50%]"/><span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/12 to-black/5"/><span className="absolute inset-x-0 bottom-0 p-4 text-white"><strong className="font-display text-[28px] leading-none">{game.title}</strong>{!favorite?<span className="mt-2 block text-[13px] font-medium leading-snug text-white/90">{game.subtitle}</span>:null}</span></Link>
    {game.hcp?<span className="absolute left-3 top-3 z-10 rounded-full border border-white/25 bg-blue-500/75 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white backdrop-blur-sm">HCP-analys</span>:null}
    <button type="button" aria-label={favorites.includes(game.to)?"Ta bort favorit":"Lägg till favorit"} onClick={(e)=>{e.preventDefault();e.stopPropagation();toggle(game.to)}} className="absolute right-0 top-0 z-20 flex h-[72px] w-[72px] items-start justify-end p-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm"><Star className={`h-4 w-4 ${favorites.includes(game.to)?"fill-amber-400 text-amber-400":"text-slate-500"}`}/></span></button>
  </div>;
  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-50 px-5 pb-28 pt-[max(16px,env(safe-area-inset-top))] text-slate-950">
      <section className="mt-6 px-1">
        <h1 className="mt-1 text-[42px] font-black leading-[.98] tracking-[-.02em]">HCP-tester</h1>
        <p className="mt-4 max-w-sm text-[17px] font-medium leading-[1.5] text-slate-600">Testa ditt golfspel och se din HCP-nivå i varje kategori.</p>
      </section>
      <section className="mt-7">
        <h2 className="px-0.5 font-display text-[26px] leading-none">Mina favoriter</h2>
        <div className="-mx-5 mt-3 flex min-h-[190px] gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {favoriteGames.length ? favoriteGames.map(game=><Card key={game.to} game={game} small favorite />) : <div className="flex h-[190px] w-[164px] shrink-0 flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white px-4 text-center"><Star className="h-6 w-6 text-slate-300"/><p className="mt-3 text-xs font-medium leading-snug text-slate-500">Tryck på ★ uppe till höger på ett test för att lägga till det här.</p></div>}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="px-0.5 font-display text-[30px] leading-none text-slate-950">Ball Speed</h2>
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{GAMES.filter(g=>g.to==="/speedrundan").map(game=><Card key={game.to} game={game} full />)}</div>
      </section>
      <section className="mt-8">
        <h2 className="px-0.5 font-display text-[30px] leading-none text-slate-950">Driver</h2>
        <div className="mt-3">{GAMES.filter(g=>g.to==="/driverrundan").map(game=><Card key={game.to} game={game} full />)}</div>
      </section>
      <section className="mt-8">
        <h2 className="px-0.5 font-display text-[30px] leading-none text-slate-950">Inspel</h2>
        <div className="mt-3">{GAMES.filter(g=>g.to==="/inspelsrundan").map(game=><Card key={game.to} game={game} full />)}</div>
      </section>
      <section className="mt-8">
        <h2 className="px-0.5 font-display text-[30px] leading-none text-slate-950">Putting</h2>
        <div className="mt-3">{GAMES.filter(g=>g.to==="/puttrundan").map(game=><Card key={game.to} game={game} full />)}</div>
      </section>
      <section className="mt-8">
        <h2 className="px-0.5 font-display text-[30px] leading-none text-slate-950">Chipping & Bunker</h2>
        <div className="mt-3 flex w-full gap-2">{GAMES.filter(g=>g.to==="/chipprundan"||g.to==="/bunkerrundan").map(game=><Card key={game.to} game={game} small />)}</div>
      </section>
    </main>
  );
}
