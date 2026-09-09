import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fetchFriendSnapshot, listFriendships, type Friendship } from "@/lib/friends-cloud";
import { loadCardProfile } from "@/lib/rating-card";
import { computeStableCategoryHandicaps } from "@/lib/category-index";
import { computeEstimatedHandicap, loadRealHandicap } from "@/lib/sg-handicap";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/jamfor")({
  head: () => ({ meta: [{ title: "Jämför med vänner | SG4" }] }),
  component: ComparePickerPage,
});

function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]?.toUpperCase()).join("")}
function formatHcp(value:number|undefined|null){if(value===undefined||value===null||!Number.isFinite(value))return "–";const abs=Math.abs(value).toFixed(1).replace(".0","").replace(".",",");return value<0?`+${abs}`:abs}

function ComparePickerPage(){
  useHideBottomNav(true);
  const navigate = useNavigate();
  const {user,loading}=useAuth();
  const [friends,setFriends]=useState<Friendship[]>([]);
  const [selfName,setSelfName]=useState("Du");
  const [selfAvatar,setSelfAvatar]=useState<string|null>(()=>loadCardProfile().photo??null);
  const [selfHcp,setSelfHcp]=useState<number|undefined>();
  const [pickerOpen,setPickerOpen]=useState(false);
  const [selectedFriend,setSelectedFriend]=useState<Friendship|null>(null);
  const [friendHcp,setFriendHcp]=useState<number|undefined>();

  useEffect(()=>{
    const real=loadRealHandicap();
    const cats=computeStableCategoryHandicaps(undefined,real??undefined);
    setSelfHcp(computeEstimatedHandicap(cats));
    if(!user)return;
    void listFriendships().then((result)=>setFriends(result.accepted));
    void supabase.from("profiles").select("display_name, avatar_url").eq("id",user.id).maybeSingle().then(({data})=>{
      if(data?.display_name)setSelfName(data.display_name);
      if(data?.avatar_url)setSelfAvatar(data.avatar_url);
    });
  },[user]);

  async function selectFriend(friend:Friendship){
    setSelectedFriend(friend);
    setFriendHcp(undefined);
    setPickerOpen(false);
    const snapshot=await fetchFriendSnapshot(friend.other.id);
    setFriendHcp(snapshot?.estHcp??snapshot?.realHcp??undefined);
  }

  function openComparison(){
    if(!selectedFriend)return;
    void navigate({to:"/jamfor/$userId",params:{userId:selectedFriend.other.id}});
  }

  return <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-10 pt-7">
    <header className="flex items-center justify-between">
      <Link to="/utveckling" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Tillbaka"><ArrowLeft className="h-4 w-4"/></Link>
      <div className="text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">SG4 Social</p><h1 className="font-display text-3xl">Jämför</h1></div>
      <span className="h-10 w-10"/>
    </header>

    <section className="mt-8 text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-foreground text-background"><Users className="h-9 w-9"/></span>
      <h2 className="mt-4 font-display text-4xl">Head-to-head</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">Jämför spelnivå, speldata, tränings-PB och personliga rekord med en vän.</p>
    </section>

    <section className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div className="flex min-h-44 flex-col items-center justify-center rounded-3xl border border-blue-500/35 bg-blue-500/5 p-4 text-center shadow-sm">
        <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-[3px] border-blue-500 bg-blue-500/10 font-display text-xl text-blue-500">{selfAvatar?<img src={selfAvatar} alt="" className="h-full w-full object-cover"/>:initials(selfName)||<User className="h-7 w-7"/>}</span>
        <p className="mt-3 max-w-full truncate text-sm font-bold">{selfName}</p>
        <p className="mt-1 text-[11px] font-semibold text-blue-500">HCP {formatHcp(selfHcp)}</p>
      </div>

      <span className="rounded-xl bg-foreground px-2.5 py-2 font-display text-xl text-background">VS</span>

      <button type="button" onClick={()=>setPickerOpen(true)} className="flex min-h-44 flex-col items-center justify-center rounded-3xl border border-red-500/35 bg-red-500/5 p-4 text-center shadow-sm transition-colors active:bg-red-500/10">
        <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-[3px] border-red-500 bg-red-500/10 font-display text-xl text-red-500">{selectedFriend?.other.avatarUrl?<img src={selectedFriend.other.avatarUrl} alt="" className="h-full w-full object-cover"/>:selectedFriend?initials(selectedFriend.other.displayName):<User className="h-7 w-7"/>}</span>
        <p className="mt-3 max-w-full truncate text-sm font-bold">{selectedFriend?.other.displayName??"Välj spelare"}</p>
        <p className="mt-1 text-[11px] font-semibold text-red-500">{selectedFriend?`HCP ${formatHcp(friendHcp)}`:`${friends.length} vänner`}</p>
      </button>
    </section>

    {loading?<p className="mt-6 text-center text-sm text-muted-foreground">Laddar …</p>:!user?<div className="mt-6 rounded-3xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">Logga in för att jämföra med vänner.</div>:!friends.length?<div className="mt-6 rounded-3xl border border-border bg-card p-5 text-center"><p className="text-sm text-muted-foreground">Du har inga accepterade vänner ännu.</p><Link to="/vanner" className="mt-3 inline-flex rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary">Lägg till vänner</Link></div>:null}

    <button type="button" onClick={openComparison} disabled={!selectedFriend} className={`mt-7 w-full rounded-2xl py-4 font-display text-xl transition-all ${selectedFriend?"bg-foreground text-background shadow-sm active:scale-[0.99]":"cursor-not-allowed bg-muted text-muted-foreground opacity-35"}`}>Jämför</button>

    <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
      <SheetContent side="bottom" className="mx-auto max-h-[78vh] max-w-md overflow-y-auto rounded-t-3xl px-5 pb-8">
        <SheetHeader><SheetTitle>Välj spelare</SheetTitle></SheetHeader>
        {!user ? <div className="mt-5 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">Logga in för att välja en vän.</div> : friends.length ? <div className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border">{friends.map((friend)=>{
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
