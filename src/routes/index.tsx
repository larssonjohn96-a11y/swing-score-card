import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Flag, Gauge, ListChecks, Share2, Swords, Target, Trophy, User, Users } from "lucide-react";
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
      { name: "description", content: "Spela, tävla, träna, testa din nivå och följ din utveckling i SG4." },
      { property: "og:title", content: "SG4 – Spela. Tävla. Bli bättre." },
      { property: "og:description", content: "Golf som spel – matcher, turneringar, challenges, tester och progression." },
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

const ACTIVITIES = [
  { to: "/spela", title: "Spela", detail: "Bot, vän eller HCP-utmaning", icon: Swords, tone: "primary" },
  { to: "/turneringar", title: "Turneringar", detail: "Events, ranking och leaderboard", icon: Trophy, tone: "gold" },
  { to: "/utmaningar", title: "Utmaningar", detail: "Streaks, scoring och PB-jakt", icon: Flag, tone: "flag" },
  { to: "/traning", title: "Träning", detail: "Övningar och träningspass", icon: Target, tone: "neutral" },
  { to: "/tester", title: "Tester", detail: "Mät din nivå och benchmark", icon: ListChecks, tone: "neutral" },
  { to: "/utveckling", title: "Progression", detail: "Utveckling, styrkor och svagheter", icon: Gauge, tone: "neutral" },
] as const;

function activityTone(tone: string) {
  if (tone === "primary") return "border-primary/25 bg-primary/[.07]";
  if (tone === "gold") return "border-amber-500/25 bg-amber-500/[.07]";
  if (tone === "flag") return "border-red-500/20 bg-gradient-to-br from-blue-500/[.05] via-card to-red-500/[.06]";
  return "border-border bg-card";
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

    <div className="mt-6 flex items-center gap-4"><Link to="/konto" className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-flag bg-muted">{profile.photo ? <img src={profile.photo} alt="" className="h-full w-full object-cover" /> : <User className="h-6 w-6 text-muted-foreground" />}</Link><div className="min-w-0"><p className="text-sm text-muted-foreground">Vad vill du göra?</p><h1 className="truncate font-display text-3xl leading-none">{displayName ?? "Golfspelare"}</h1></div></div>

    <ActiveMultiplayerBanner />

    <section className="mt-5">
      <div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-muted-foreground">SG4</p><h2 className="mt-1 font-display text-3xl">Välj aktivitet</h2></div></div>
      <div className="grid grid-cols-2 gap-3">
        {ACTIVITIES.map((item) => <Link key={item.to} to={item.to} search={item.to === "/traning" ? { category: undefined } : undefined as never} className={`flex min-h-[138px] flex-col justify-between rounded-[27px] border p-4 shadow-[0_12px_30px_-24px_rgba(0,0,0,.4)] active:scale-[.99] ${activityTone(item.tone)}`}>
          <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.tone === "primary" ? "bg-primary text-primary-foreground" : item.tone === "gold" ? "bg-amber-500/15 text-amber-600" : item.tone === "flag" ? "bg-slate-950 text-white" : "bg-muted text-foreground"}`}><item.icon className="h-5 w-5" /></span>
          <span><span className="block font-display text-2xl">{item.title}</span><span className="mt-1 block text-xs leading-snug text-muted-foreground">{item.detail}</span></span>
        </Link>)}
      </div>
    </section>

    <div className="mt-4 grid grid-cols-3 gap-2">
      <Link to="/vanner" className="rounded-2xl border border-border bg-card p-3 text-center"><div className="flex justify-center">{friendProfiles.length ? friendProfiles.map((friend, index) => <FriendAvatar key={friend.id} profile={friend} index={index} />) : <Users className="h-5 w-5 text-primary" />}</div><p className="mt-2 font-display text-2xl text-primary">{friendCount ?? "–"}</p><p className="text-[10px] font-bold uppercase text-muted-foreground">Vänner</p></Link>
      <Link to="/utveckling" className="rounded-2xl border border-border bg-card p-3 text-center"><Gauge className="mx-auto h-5 w-5 text-primary" /><p className="mt-2 font-display text-2xl text-primary">{data ? hcpLabel(data.real ?? data.estimated ?? 0) : "–"}</p><p className="text-[10px] font-bold uppercase text-muted-foreground">HCP</p></Link>
      <Link to="/trophy" className="rounded-2xl border border-border bg-card p-3 text-center"><Trophy className="mx-auto h-5 w-5 text-amber-500" /><p className="mt-2 font-display text-2xl text-foreground">PB</p><p className="text-[10px] font-bold uppercase text-muted-foreground">Trophy</p></Link>
    </div>

    <AppStoryLauncher />

    {data && data.real === null && data.cats.every((c) => c.count === 0) ? <Link to="/konto" className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4"><Gauge className="h-5 w-5 text-primary" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Ange ditt officiella HCP</span><span className="block text-xs text-muted-foreground">Få en direkt baslinje för SG4.</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link> : null}
    {profile.age === undefined && !ageSaved ? <div className="mt-4"><AgeInlinePrompt title="Ange din ålder" description="Jämför din ball speed med jämnåriga golfare" onSaved={() => setAgeSaved(true)} /></div> : null}
  </main>;
}
