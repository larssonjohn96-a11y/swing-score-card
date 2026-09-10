import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronRight, Flag, Target, Trophy, User, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fetchFriendSnapshot, listFriendships, type Friendship } from "@/lib/friends-cloud";
import { loadCardProfile } from "@/lib/rating-card";
import { computeStableCategoryHandicaps } from "@/lib/category-index";
import { computeEstimatedHandicap, loadRealHandicap } from "@/lib/sg-handicap";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { CompareFriendContent } from "./jamfor.$userId";

export const Route = createFileRoute("/jamfor")({
  head: () => ({ meta: [{ title: "Head-to-head & Match | SG4" }] }),
  component: ComparePickerPage,
});

type SocialMode = "compare" | "match";
type MatchCategory = "off-the-tee" | "approach" | "around-the-green" | "putting";
type HoleWinner = "self" | "friend" | "tie" | null;
type Challenge = { title: string; detail: string };

type MatchType = {
  id: string;
  title: string;
  description: string;
};

const MATCH_CATEGORIES: Array<{ id: MatchCategory; title: string; subtitle: string }> = [
  { id: "off-the-tee", title: "Off the Tee", subtitle: "Utslag från tee" },
  { id: "approach", title: "Approach", subtitle: "Inspel mot green" },
  { id: "around-the-green", title: "Around the Green", subtitle: "Närspel runt green" },
  { id: "putting", title: "Putting", subtitle: "Puttning på green" },
];

const MATCH_TYPES: Record<MatchCategory, MatchType[]> = {
  "off-the-tee": [
    { id: "fairway", title: "Fairway Match", description: "Träffa fairway och vinn hålet på kontroll." },
    { id: "distance", title: "Long Drive", description: "Längsta godkända drive vinner hålet." },
    { id: "shape", title: "Shot Shape", description: "SG4 väljer draw eller fade inför varje hål." },
  ],
  approach: [
    { id: "closest", title: "Closest to Pin", description: "SG4 väljer avstånd. Närmast flaggan vinner." },
    { id: "control", title: "Distance Control", description: "Varierade inspel där bäst längdkontroll vinner." },
    { id: "shape", title: "Shot Shaping", description: "Avstånd plus draw/fade genereras inför varje hål." },
  ],
  "around-the-green": [
    { id: "mixed", title: "Mixed Short Game", description: "Chip, pitch, bunker och lob blandas." },
    { id: "closest", title: "Closest to Pin", description: "SG4 väljer slagtyp och ungefärligt avstånd." },
    { id: "up-down", title: "Up & Down", description: "Klara läget på två slag eller bättre." },
  ],
  putting: [
    { id: "lag", title: "Lag Putting", description: "SG4 väljer 8–20 m. Närmast hål vinner." },
    { id: "short", title: "Short Putting", description: "1–3 m. Flest sänkta puttar vinner hålet." },
    { id: "mix", title: "Putting Mix", description: "Kortputt och lagputt blandas över matchen." },
  ],
};

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function generateChallenge(category: MatchCategory, typeId: string): Challenge {
  if (category === "putting") {
    if (typeId === "lag") {
      const distance = rand(8, 20);
      return { title: `${distance} m lagputt`, detail: "En boll var · närmast hål vinner" };
    }
    if (typeId === "short") {
      const distance = rand(1, 3);
      return { title: `${distance} m kortputt`, detail: "3 bollar var · flest sänkta vinner" };
    }
    const short = Math.random() > 0.45;
    return short
      ? { title: `${rand(1, 3)} m kortputt`, detail: "3 bollar var · flest sänkta vinner" }
      : { title: `${rand(8, 20)} m lagputt`, detail: "En boll var · närmast hål vinner" };
  }

  if (category === "around-the-green") {
    const shot = pick(["Chip", "Pitch", "Bunker", "Lob"] as const);
    const distance = shot === "Chip" ? rand(5, 12) : shot === "Bunker" ? rand(8, 16) : rand(12, 30);
    if (typeId === "up-down") return { title: `${shot} · ${distance} m`, detail: "Spela ut hålet · lägst antal slag vinner" };
    return { title: `${shot} · ${distance} m`, detail: "En boll var · närmast flaggan vinner" };
  }

  if (category === "approach") {
    const distance = rand(typeId === "control" ? 60 : 80, typeId === "shape" ? 170 : 180);
    if (typeId === "shape") {
      const shape = pick(["Draw", "Fade"] as const);
      return { title: `${distance} m · ${shape}`, detail: "Rätt shape + närmast flaggan vinner" };
    }
    if (typeId === "control") return { title: `${distance} m inspel`, detail: "Bäst längdkontroll mot målavståndet vinner" };
    return { title: `${distance} m mot flaggan`, detail: "En boll var · närmast flaggan vinner" };
  }

  if (typeId === "distance") return { title: "Long Drive", detail: "Längsta godkända drive inom spelkorridoren vinner" };
  if (typeId === "shape") {
    const shape = pick(["Draw", "Fade"] as const);
    return { title: `Driver · ${shape}`, detail: "Rätt bollflykt och spelbar drive vinner" };
  }
  return { title: "Fairway Challenge", detail: "Driver · 30 m fairway · träff slår miss" };
}

function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]?.toUpperCase()).join("")}
function formatHcp(value:number|undefined|null){if(value===undefined||value===null||!Number.isFinite(value))return "–";const abs=Math.abs(value).toFixed(1).replace(".0","").replace(".",",");return value<0?`+${abs}`:abs}

function ComparePickerPage(){
  useHideBottomNav(true);
  const {user,loading}=useAuth();
  const [friends,setFriends]=useState<Friendship[]>([]);
  const [friendsLoading,setFriendsLoading]=useState(true);
  const [selfName,setSelfName]=useState("Du");
  const [selfAvatar,setSelfAvatar]=useState<string|null>(()=>loadCardProfile().photo??null);
  const [selfHcp,setSelfHcp]=useState<number|undefined>();
  const [pickerOpen,setPickerOpen]=useState(false);
  const [selectedFriend,setSelectedFriend]=useState<Friendship|null>(null);
  const [friendHcp,setFriendHcp]=useState<number|undefined>();
  const [activeFriendId,setActiveFriendId]=useState<string|null>(null);
  const [mode,setMode]=useState<SocialMode>("compare");
  const [matchCategory,setMatchCategory]=useState<MatchCategory|null>(null);
  const [matchType,setMatchType]=useState<string|null>(null);
  const [holeCount,setHoleCount]=useState<5|9>(5);
  const [matchStarted,setMatchStarted]=useState(false);
  const [holeIndex,setHoleIndex]=useState(0);
  const [holes,setHoles]=useState<Array<{ challenge: Challenge; winner: HoleWinner }>>([]);

  useEffect(()=>{
    const real=loadRealHandicap();
    const cats=computeStableCategoryHandicaps(undefined,real??undefined);
    setSelfHcp(computeEstimatedHandicap(cats));

    if(loading)return;
    if(!user){
      setFriends([]);
      setFriendsLoading(false);
      return;
    }

    let cancelled=false;
    setFriendsLoading(true);
    void listFriendships().then((result)=>{
      if(cancelled)return;
      setFriends(result.accepted);
      setFriendsLoading(false);
    });
    void supabase.from("profiles").select("display_name, avatar_url").eq("id",user.id).maybeSingle().then(({data})=>{
      if(cancelled)return;
      if(data?.display_name)setSelfName(data.display_name);
      if(data?.avatar_url)setSelfAvatar(data.avatar_url);
    });

    return()=>{cancelled=true};
  },[user,loading]);

  async function selectFriend(friend:Friendship){
    setSelectedFriend(friend);
    setFriendHcp(undefined);
    setPickerOpen(false);
    const snapshot=await fetchFriendSnapshot(friend.other.id);
    setFriendHcp(snapshot?.estHcp??snapshot?.realHcp??undefined);
  }

  function startMatch() {
    if (!matchCategory || !matchType || !selectedFriend) return;
    setHoles(Array.from({ length: holeCount }, () => ({ challenge: generateChallenge(matchCategory, matchType), winner: null })));
    setHoleIndex(0);
    setMatchStarted(true);
  }

  function setWinner(winner: Exclude<HoleWinner, null>) {
    const next = holes.map((hole, index) => index === holeIndex ? { ...hole, winner } : hole);
    setHoles(next);
    if (holeIndex < next.length - 1) setHoleIndex(holeIndex + 1);
  }

  const loadingSocial=loading||friendsLoading;
  const selectedType = matchCategory ? MATCH_TYPES[matchCategory].find((item)=>item.id===matchType) : null;
  const score = useMemo(() => holes.reduce((acc,hole)=>{
    if(hole.winner==="self")acc.self+=1;
    if(hole.winner==="friend")acc.friend+=1;
    return acc;
  },{self:0,friend:0}),[holes]);
  const finished = matchStarted && holes.length > 0 && holes.every((hole)=>hole.winner!==null);
  const matchDiff = score.self - score.friend;
  const matchStatus = finished
    ? matchDiff===0 ? "ALL SQUARE" : matchDiff>0 ? `${selfName} vinner ${score.self}–${score.friend}` : `${selectedFriend?.other.displayName ?? "Vän"} vinner ${score.friend}–${score.self}`
    : matchDiff===0 ? "ALL SQUARE" : matchDiff>0 ? `${matchDiff} UP` : `${Math.abs(matchDiff)} DN`;

  if(activeFriendId){
    return <CompareFriendContent userId={activeFriendId} onBack={()=>setActiveFriendId(null)}/>;
  }

  if(matchStarted && selectedFriend && matchCategory && selectedType){
    const current = holes[holeIndex];
    return <main className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <button onClick={()=>setMatchStarted(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/80 bg-white/70 backdrop-blur-xl"><ArrowLeft className="h-4 w-4"/></button>
        <span className="rounded-full border border-slate-300/80 bg-slate-100/75 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">SG4 Match</span>
      </header>

      <section className="mt-5 overflow-hidden rounded-[30px] border border-slate-300/80 bg-gradient-to-br from-slate-100/90 via-white/82 to-slate-100/72 p-5 shadow-[0_20px_48px_-32px_rgba(15,23,42,.42)] backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{MATCH_CATEGORIES.find(c=>c.id===matchCategory)?.title}</p><h1 className="mt-1 font-display text-3xl leading-none">{selectedType.title}</h1></div>
          <Flag className="h-6 w-6 text-slate-700"/>
        </div>
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-[3px] border-blue-500 bg-blue-500/10 font-display text-sm text-blue-600">{selfAvatar?<img src={selfAvatar} alt="" className="h-full w-full object-cover"/>:initials(selfName)}</span><p className="mt-2 truncate text-xs font-bold">{selfName}</p><p className="font-display text-2xl text-blue-600">{score.self}</p></div>
          <div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Match</p><p className="mt-1 rounded-xl bg-slate-900 px-3 py-2 font-display text-lg text-white">{matchStatus}</p></div>
          <div className="text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-[3px] border-red-500 bg-red-500/10 font-display text-sm text-red-600">{selectedFriend.other.avatarUrl?<img src={selectedFriend.other.avatarUrl} alt="" className="h-full w-full object-cover"/>:initials(selectedFriend.other.displayName)}</span><p className="mt-2 truncate text-xs font-bold">{selectedFriend.other.displayName}</p><p className="font-display text-2xl text-red-600">{score.friend}</p></div>
        </div>
      </section>

      {!finished && current ? <>
        <div className="mt-5 flex items-center justify-between"><h2 className="font-display text-2xl">Hål {holeIndex+1}</h2><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{holeIndex+1} / {holes.length}</span></div>
        <section className="mt-2 rounded-[28px] border border-blue-200/80 bg-gradient-to-br from-blue-50/90 via-white/82 to-slate-100/72 p-6 text-center shadow-[0_18px_44px_-32px_rgba(37,99,235,.4)] backdrop-blur-2xl">
          <Target className="mx-auto h-6 w-6 text-blue-600"/>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Utmaning</p>
          <h3 className="mt-1 font-display text-4xl leading-none">{current.challenge.title}</h3>
          <p className="mx-auto mt-3 max-w-[28ch] text-xs leading-relaxed text-slate-600">{current.challenge.detail}</p>
        </section>

        <section className="mt-5">
          <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Vem vann hålet?</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={()=>setWinner("self")} className="rounded-2xl border border-blue-300/80 bg-blue-500/[0.08] px-4 py-4 font-semibold text-blue-700 backdrop-blur-xl">{selfName}</button>
            <button onClick={()=>setWinner("friend")} className="rounded-2xl border border-red-300/80 bg-red-500/[0.08] px-4 py-4 font-semibold text-red-700 backdrop-blur-xl">{selectedFriend.other.displayName}</button>
          </div>
          <button onClick={()=>setWinner("tie")} className="mt-3 w-full rounded-2xl border border-slate-300/80 bg-white/70 py-3 text-sm font-semibold text-slate-600 backdrop-blur-xl">Delat hål</button>
        </section>
      </> : <section className="mt-6 rounded-[30px] border border-slate-300/80 bg-white/76 p-6 text-center shadow-[0_18px_44px_-32px_rgba(15,23,42,.4)] backdrop-blur-2xl">
        <Trophy className="mx-auto h-8 w-8 text-slate-800"/>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Match avslutad</p>
        <h2 className="mt-2 font-display text-4xl leading-none">{matchStatus}</h2>
        <p className="mt-3 text-xs text-slate-600">{selectedType.title} · {holes.length} hål</p>
        <button onClick={startMatch} className="mt-5 w-full rounded-2xl bg-slate-900 py-4 font-display text-xl text-white">Spela igen</button>
        <button onClick={()=>{setMatchStarted(false);setMatchCategory(null);setMatchType(null)}} className="mt-3 w-full rounded-2xl border border-slate-300 bg-white/70 py-3 text-sm font-semibold">Ny matchtyp</button>
      </section>}
    </main>;
  }

  return <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-10 pt-7">
    <header className="flex items-center justify-between">
      <Link to="/utveckling" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Tillbaka"><ArrowLeft className="h-4 w-4"/></Link>
      <div className="text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">SG4 Social</p><h1 className="font-display text-3xl">Head-to-head</h1></div>
      <span className="h-10 w-10"/>
    </header>

    <div className="mt-5 grid grid-cols-2 rounded-2xl border border-border bg-muted/55 p-1">
      <button type="button" onClick={()=>setMode("compare")} className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${mode==="compare"?"bg-background shadow-sm":"text-muted-foreground"}`}>Jämför</button>
      <button type="button" onClick={()=>setMode("match")} className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${mode==="match"?"bg-background shadow-sm":"text-muted-foreground"}`}>Match</button>
    </div>

    <section className="mt-7 text-center">
      <span className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${mode==="match"?"bg-gradient-to-br from-blue-600 to-red-600 text-white":"bg-foreground text-background"}`}>{mode==="match"?<Flag className="h-9 w-9"/>:<Users className="h-9 w-9"/>}</span>
      <h2 className="mt-4 font-display text-4xl">{mode==="match"?"Match Play":"Head-to-head"}</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{mode==="match"?"Välj kategori och matchtyp. SG4 skapar utmaningarna och ni spelar hål för hål.":"Jämför spelnivå, speldata, tränings-PB och personliga rekord med en vän."}</p>
    </section>

    <section className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div className="flex min-h-40 flex-col items-center justify-center rounded-3xl border border-blue-500/35 bg-blue-500/5 p-4 text-center shadow-sm">
        <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-[3px] border-blue-500 bg-blue-500/10 font-display text-xl text-blue-500">{selfAvatar?<img src={selfAvatar} alt="" className="h-full w-full object-cover"/>:initials(selfName)||<User className="h-7 w-7"/>}</span>
        <p className="mt-3 max-w-full truncate text-sm font-bold">{selfName}</p>
        <p className="mt-1 text-[11px] font-semibold text-blue-500">HCP {formatHcp(selfHcp)}</p>
      </div>

      <span className="rounded-xl bg-foreground px-2.5 py-2 font-display text-xl text-background">VS</span>

      <button type="button" disabled={loadingSocial||!user} onClick={()=>setPickerOpen(true)} className="flex min-h-40 flex-col items-center justify-center rounded-3xl border border-red-500/35 bg-red-500/5 p-4 text-center shadow-sm transition-colors active:bg-red-500/10 disabled:pointer-events-none disabled:opacity-70">
        <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-[3px] border-red-500 bg-red-500/10 font-display text-xl text-red-500">{selectedFriend?.other.avatarUrl?<img src={selectedFriend.other.avatarUrl} alt="" className="h-full w-full object-cover"/>:selectedFriend?initials(selectedFriend.other.displayName):<User className="h-7 w-7"/>}</span>
        <p className="mt-3 max-w-full truncate text-sm font-bold">{selectedFriend?.other.displayName??(loadingSocial?"Laddar vänner…":"Välj spelare")}</p>
        <p className="mt-1 text-[11px] font-semibold text-red-500">{selectedFriend?`HCP ${formatHcp(friendHcp)}`:loadingSocial?" ":`${friends.length} vänner`}</p>
      </button>
    </section>

    {!loadingSocial&&!user?<div className="mt-6 rounded-3xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">Logga in för att använda sociala funktioner.</div>:!loadingSocial&&user&&!friends.length?<div className="mt-6 rounded-3xl border border-border bg-card p-5 text-center"><p className="text-sm text-muted-foreground">Du har inga accepterade vänner ännu.</p><Link to="/vanner" className="mt-3 inline-flex rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary">Lägg till vänner</Link></div>:null}

    {mode==="compare" ? <button type="button" onClick={()=>selectedFriend&&setActiveFriendId(selectedFriend.other.id)} disabled={!selectedFriend} className={`relative z-10 mt-7 w-full touch-manipulation rounded-2xl py-4 font-display text-xl transition-transform ${selectedFriend?"cursor-pointer bg-foreground text-background shadow-sm active:scale-[0.99]":"cursor-not-allowed bg-muted text-muted-foreground opacity-35"}`}>Jämför</button> : <section className="mt-7">
      <div className="flex items-center justify-between"><h3 className="font-display text-2xl">Kategori</h3><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Ryder Cup-format</span></div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {MATCH_CATEGORIES.map((category)=><button key={category.id} type="button" onClick={()=>{setMatchCategory(category.id);setMatchType(null)}} className={`rounded-2xl border p-3 text-left transition-colors ${matchCategory===category.id?"border-slate-700 bg-slate-900 text-white":"border-border bg-card"}`}><span className="block text-sm font-bold">{category.title}</span><span className={`mt-1 block text-[10px] ${matchCategory===category.id?"text-white/65":"text-muted-foreground"}`}>{category.subtitle}</span></button>)}
      </div>

      {matchCategory ? <><div className="mt-6 flex items-center justify-between"><h3 className="font-display text-2xl">Matchtyp</h3><span className="text-[10px] font-semibold text-muted-foreground">{MATCH_TYPES[matchCategory].length} format</span></div><div className="mt-2 space-y-2">{MATCH_TYPES[matchCategory].map((type)=><button key={type.id} type="button" onClick={()=>setMatchType(type.id)} className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left ${matchType===type.id?"border-blue-400/60 bg-gradient-to-r from-blue-500/[0.08] to-red-500/[0.06]":"border-border bg-card"}`}><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{type.title}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{type.description}</span></span>{matchType===type.id?<Check className="h-4 w-4 text-blue-600"/>:<ChevronRight className="h-4 w-4 text-muted-foreground"/>}</button>)}</div></> : null}

      {matchType ? <div className="mt-5"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Matchlängd</p><div className="grid grid-cols-2 gap-2">{([5,9] as const).map(count=><button key={count} onClick={()=>setHoleCount(count)} className={`rounded-2xl border py-3 font-semibold ${holeCount===count?"border-slate-800 bg-slate-900 text-white":"border-border bg-card"}`}>{count} hål</button>)}</div></div> : null}

      <button type="button" onClick={startMatch} disabled={!selectedFriend||!matchCategory||!matchType} className={`mt-6 w-full rounded-2xl py-4 font-display text-xl ${selectedFriend&&matchCategory&&matchType?"bg-gradient-to-r from-blue-600 to-red-600 text-white":"bg-muted text-muted-foreground opacity-40"}`}>Starta match</button>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">Första versionen spelas på samma enhet · ett hål i taget.</p>
    </section>}

    <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
      <SheetContent side="bottom" className="mx-auto max-h-[78vh] max-w-md overflow-y-auto rounded-t-3xl px-5 pb-8">
        <SheetHeader><SheetTitle>Välj spelare</SheetTitle></SheetHeader>
        {loadingSocial ? <div className="mt-5 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">Laddar vänner …</div> : !user ? <div className="mt-5 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">Logga in för att välja en vän.</div> : friends.length ? <div className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border">{friends.map((friend)=>{
          const active=selectedFriend?.id===friend.id;
          return <button key={friend.id} type="button" onClick={()=>void selectFriend(friend)} className="flex w-full items-center gap-3 bg-card px-3.5 py-3.5 text-left">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-red-500/70 bg-red-500/10 text-xs font-bold text-red-500">{friend.other.avatarUrl?<img src={friend.other.avatarUrl} alt="" className="h-full w-full object-cover"/>:initials(friend.other.displayName)||<User className="h-4 w-4"/>}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{friend.other.displayName}</span>
            {active?<span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white"><Check className="h-4 w-4"/></span>:null}
          </button>;
        })}</div> : <div className="mt-5 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">Du har inga accepterade vänner ännu. <Link to="/vanner" onClick={()=>setPickerOpen(false)} className="font-semibold text-primary">Lägg till vänner ›</Link></div>}
      </SheetContent>
    </Sheet>
  </main>;
}
