import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { listFriendships, type Friendship } from "@/lib/friends-cloud";
import { loadCardProfile } from "@/lib/rating-card";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/jamfor")({
  head: () => ({ meta: [{ title: "Jämför med vänner | SG4" }] }),
  component: ComparePickerPage,
});

function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]?.toUpperCase()).join("")}
function Avatar({name,url}:{name:string;url?:string|null}){return <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-primary/10 font-display text-xl text-primary">{url?<img src={url} alt="" className="h-full w-full object-cover"/>:initials(name)||<User className="h-7 w-7"/>}</span>}

function ComparePickerPage(){
  const {user,loading}=useAuth();
  const [friends,setFriends]=useState<Friendship[]>([]);
  const [selfName,setSelfName]=useState("Du");
  const [selfAvatar,setSelfAvatar]=useState<string|null>(()=>loadCardProfile().photo??null);

  useEffect(()=>{
    if(!user)return;
    void listFriendships().then((result)=>setFriends(result.accepted));
    void supabase.from("profiles").select("display_name, avatar_url").eq("id",user.id).maybeSingle().then(({data})=>{
      if(data?.display_name)setSelfName(data.display_name);
      if(data?.avatar_url)setSelfAvatar(data.avatar_url);
    });
  },[user]);

  return <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-7">
    <header className="flex items-center justify-between">
      <Link to="/utveckling" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Tillbaka"><ArrowLeft className="h-4 w-4"/></Link>
      <div className="text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">SG4 Social</p><h1 className="font-display text-3xl">Jämför</h1></div>
      <span className="h-10 w-10"/>
    </header>

    <section className="mt-8 text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground"><Users className="h-9 w-9"/></span>
      <h2 className="mt-4 font-display text-4xl">Head-to-head</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">Jämför spelnivå, speldata, tränings-PB och personliga rekord med en vän.</p>
    </section>

    <section className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div className="flex min-h-44 flex-col items-center justify-center rounded-3xl border border-border bg-card p-4 text-center"><Avatar name={selfName} url={selfAvatar}/><p className="mt-3 max-w-full truncate text-sm font-bold">{selfName}</p><p className="mt-1 text-[11px] text-muted-foreground">Du</p></div>
      <span className="rounded-xl bg-foreground px-2.5 py-2 font-display text-xl text-background">VS</span>
      <div className="flex min-h-44 flex-col items-center justify-center rounded-3xl border border-dashed border-primary/45 bg-primary/5 p-4 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground"><User className="h-7 w-7"/></span><p className="mt-3 text-sm font-bold">Välj spelare</p><p className="mt-1 text-[11px] text-muted-foreground">{friends.length} vänner</p></div>
    </section>

    {loading?<p className="mt-6 text-center text-sm text-muted-foreground">Laddar …</p>:!user?<div className="mt-6 rounded-3xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">Logga in för att jämföra med vänner.</div>:friends.length?<section className="mt-6 overflow-hidden rounded-3xl border border-border bg-card"><div className="px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Välj vän</p></div>{friends.map((friend,index)=><Link key={friend.id} to="/jamfor/$userId" params={{userId:friend.other.id}} className={`flex items-center gap-3 px-4 py-3.5 ${index?"border-t border-border/70":""}`}><span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-bold text-primary">{friend.other.avatarUrl?<img src={friend.other.avatarUrl} alt="" className="h-full w-full object-cover"/>:initials(friend.other.displayName)||<User className="h-4 w-4"/>}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{friend.other.displayName}</span><ChevronRight className="h-4 w-4 text-primary"/></Link>)}</section>:<div className="mt-6 rounded-3xl border border-border bg-card p-5 text-center"><p className="text-sm text-muted-foreground">Du har inga accepterade vänner ännu.</p><Link to="/vanner" className="mt-3 inline-flex rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary">Lägg till vänner</Link></div>}
  </main>;
}
