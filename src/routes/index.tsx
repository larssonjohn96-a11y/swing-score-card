import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Bot, ChevronDown, ChevronRight, Flame, Gauge, Share2, Swords, Trophy, User, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { computeEstimatedHandicap, hcpLabel, loadRealHandicap, type CategoryHandicap } from "@/lib/sg-handicap";
import { computeStableCategoryHandicaps } from "@/lib/category-index";
import { useSessionsVersion } from "@/lib/sessions/use-sessions";
import { loadCardProfile } from "@/lib/rating-card";
import { pushPlayerSnapshot, listFriendships, type Profile } from "@/lib/friends-cloud";
import { loadFriends } from "@/lib/friends";
import { AppStoryLauncher } from "@/components/app-story";
import { AgeInlinePrompt } from "@/components/age-inline-prompt";
import { ActiveMultiplayerBanner } from "@/components/active-multiplayer-banner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SG4 – Spela. Tävla. Bli bättre." },
      { name: "description", content: "Spela golfutmaningar, möt vänner och bottar och bli bättre medan du tävlar." },
      { property: "og:title", content: "SG4 – Spela. Tävla. Bli bättre." },
      { property: "og:description", content: "Golfträning som spel – matcher, challenges, bottar och progression." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

type HomeData = { real: number | null; cats: CategoryHandicap[]; estimated: number | undefined };

function loadHomeData(): HomeData {
  const real = loadRealHandicap();
  const cats = computeStableCategoryHandicaps(undefined, real ?? undefined);
  return { real, cats, estimated: computeEstimatedHandicap(cats) };
}

function FriendAvatar({ profile, index }: { profile: Profile; index: number }) {
  const initials = profile.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-card bg-muted text-[10px] font-bold text-muted-foreground shadow-sm" style={{ marginLeft: index === 0 ? 0 : -9, zIndex: 10 - index }}>{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials || <User className="h-4 w-4" />}</span>;
}

function Home() {
  const { user, displayName } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [ageSaved, setAgeSaved] = useState(false);
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [friendProfiles, setFriendProfiles] = useState<Profile[]>([]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const sessionsVersion = useSessionsVersion();
  const profile = loadCardProfile();

  useEffect(() => {
    setData(loadHomeData());
    setFriendCount(loadFriends().length);
    setFriendProfiles([]);
    if (user) {
      void pushPlayerSnapshot();
      void listFriendships().then((f) => {
        setFriendCount(loadFriends().length + f.accepted.length);
        setFriendProfiles(f.accepted.slice(0, 3).map((friendship) => friendship.other));
      });
    }
  }, [user, sessionsVersion]);

  function shareProfile() {
    const shareData = { title: "SG4", text: `Spela mot mig i SG4${data?.real !== null && data ? ` · HCP ${hcpLabel(data.real ?? data.estimated ?? 0)}` : ""}.`, url: typeof window !== "undefined" ? window.location.origin : undefined };
    if (typeof navigator !== "undefined" && navigator.share) navigator.share(shareData).catch(() => {});
    else if (typeof navigator !== "undefined" && navigator.clipboard && shareData.url) void navigator.clipboard.writeText(shareData.url);
  }

  return <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
    <div className="flex items-center justify-between">
      <span className="font-display text-2xl leading-none tracking-wide text-foreground">SG4</span>
      <div className="flex shrink-0 items-center gap-2"><ThemeToggle /><button type="button" onClick={shareProfile} aria-label="Dela" className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground"><Share2 className="h-4 w-4" /></button>{user ? <div className="relative"><button type="button" onClick={() => setProfileMenuOpen((open) => !open)} className="flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground">{displayName ?? "Konto"}<ChevronDown className={`h-3.5 w-3.5 ${profileMenuOpen ? "rotate-180" : ""}`} /></button>{profileMenuOpen ? <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl"><Link to="/konto" onClick={() => setProfileMenuOpen(false)} className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm text-muted-foreground">Konto</Link></div> : null}</div> : <Link to="/konto" className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground">Logga in</Link>}</div>
    </div>

    <div className="mt-6 flex items-center gap-4"><Link to="/konto" className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-flag bg-muted">{profile.photo ? <img src={profile.photo} alt="" className="h-full w-full object-cover" /> : <User className="h-6 w-6 text-muted-foreground" />}</Link><div className="min-w-0"><p className="text-sm text-muted-foreground">Låt oss spela,</p><h1 className="truncate font-[family-name:var(--font-display)] text-3xl leading-none">{displayName ?? "Golfspelare"}</h1></div></div>

    <ActiveMultiplayerBanner />

    <section className="mt-5 overflow-hidden rounded-[30px] border border-border bg-card shadow-[0_18px_40px_-28px_rgba(0,0,0,.42)]">
      <div className="px-5 pt-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-muted-foreground">Spela nu</p><h2 className="mt-1 font-display text-3xl">Välj motståndare</h2></div>
      <div className="mt-4 grid grid-cols-2 gap-3 px-4 pb-4">
        <Link to="/match" className="flex min-h-32 flex-col justify-between rounded-[24px] border border-blue-500/20 bg-gradient-to-br from-blue-500/[.10] via-card to-red-500/[.07] p-4 active:scale-[.99]"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white"><Swords className="h-5 w-5" /></span><span><span className="block font-display text-2xl">Mot vän</span><span className="mt-1 block text-xs text-muted-foreground">Head-to-head eller lagmatch</span></span></Link>
        <Link to="/match-bot" className="flex min-h-32 flex-col justify-between rounded-[24px] border border-primary/20 bg-primary/[.06] p-4 active:scale-[.99]"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Bot className="h-5 w-5" /></span><span><span className="block font-display text-2xl">Mot bot</span><span className="mt-1 block text-xs text-muted-foreground">Välj HCP-nivå och spela direkt</span></span></Link>
      </div>
    </section>

    <Link to="/tester" className="mt-3 flex items-center gap-4 rounded-[26px] border border-border bg-card p-4 shadow-[0_12px_28px_-22px_rgba(0,0,0,.35)]"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600"><Flame className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase tracking-[.15em] text-amber-600">Dagens challenge</span><span className="mt-1 block font-semibold">Slå din nivå</span><span className="block text-xs text-muted-foreground">Välj ett SG4-test och jaga nytt PB.</span></span><ChevronRight className="h-5 w-5 text-muted-foreground" /></Link>

    <div className="mt-3 grid grid-cols-3 gap-2">
      <Link to="/vanner" className="rounded-2xl border border-border bg-card p-3 text-center"><div className="flex justify-center">{friendProfiles.length ? friendProfiles.map((friend, index) => <FriendAvatar key={friend.id} profile={friend} index={index} />) : <Users className="h-5 w-5 text-primary" />}</div><p className="mt-2 font-display text-2xl text-primary">{friendCount ?? "–"}</p><p className="text-[10px] font-bold uppercase text-muted-foreground">Vänner</p></Link>
      <Link to="/utveckling" className="rounded-2xl border border-border bg-card p-3 text-center"><Gauge className="mx-auto h-5 w-5 text-primary" /><p className="mt-2 font-display text-2xl text-primary">{data ? hcpLabel(data.real ?? data.estimated ?? 0) : "–"}</p><p className="text-[10px] font-bold uppercase text-muted-foreground">HCP</p></Link>
      <Link to="/trophy" className="rounded-2xl border border-border bg-card p-3 text-center"><Trophy className="mx-auto h-5 w-5 text-amber-500" /><p className="mt-2 font-display text-2xl text-foreground">PB</p><p className="text-[10px] font-bold uppercase text-muted-foreground">Trophy</p></Link>
    </div>

    <AppStoryLauncher />

    {data && data.real === null && data.cats.every((c) => c.count === 0) ? <Link to="/konto" className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4"><Gauge className="h-5 w-5 text-primary" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Ange ditt officiella HCP</span><span className="block text-xs text-muted-foreground">Få en direkt baslinje för SG4.</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link> : null}
    {profile.age === undefined && !ageSaved ? <div className="mt-4"><AgeInlinePrompt title="Ange din ålder" description="Jämför din ball speed med jämnåriga golfare" onSaved={() => setAgeSaved(true)} /></div> : null}
  </main>;
}
