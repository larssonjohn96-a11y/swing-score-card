import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, Gauge, Share2, User, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  computeBiggestOpportunity,
  computeEstimatedHandicap,
  hcpLabel,
  loadRealHandicap,
  type CategoryHandicap,
  type Opportunity,
} from "@/lib/sg-handicap";
import { computeStableCategoryHandicaps } from "@/lib/category-index";
import { useSessionsVersion } from "@/lib/sessions/use-sessions";
import { OpportunityCard } from "@/components/home-dashboard";
import { loadCardProfile } from "@/lib/rating-card";
import { AnalysisRadarSwitcher } from "@/components/analysis-radar-switcher";
import { StableCategoryStatsSection } from "@/components/stable-category-stats";
import { pushPlayerSnapshot, listFriendships, type Profile } from "@/lib/friends-cloud";
import { loadFriends } from "@/lib/friends";
import { AppStoryLauncher } from "@/components/app-story";
import { AgeInlinePrompt } from "@/components/age-inline-prompt";
import { ActiveMultiplayerBanner } from "@/components/active-multiplayer-banner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SG4 – Mät. Förbättra. Sänk ditt handicap." },
      { name: "description", content: "SG4 analyserar ditt golfspel och visar exakt vilka delar som kostar flest slag, så att du kan träna smartare och sänka ditt handicap." },
      { property: "og:title", content: "SG4 – Mät. Förbättra. Sänk ditt handicap." },
      { property: "og:description", content: "Din personliga golfprestanda-dashboard – handicap, kategorier och nästa mål." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

type HomeData = { real: number | null; cats: CategoryHandicap[]; estimated: number | undefined; opportunity: Opportunity | undefined };

function loadHomeData(): HomeData {
  const real = loadRealHandicap();
  const cats = computeStableCategoryHandicaps(undefined, real ?? undefined);
  return { real, cats, estimated: computeEstimatedHandicap(cats), opportunity: computeBiggestOpportunity(cats) };
}

function FriendAvatar({ profile, index }: { profile: Profile; index: number }) {
  const initials = profile.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-card bg-muted text-[10px] font-bold text-muted-foreground shadow-sm"
      style={{ marginLeft: index === 0 ? 0 : -10, zIndex: 10 - index }}
    >
      {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials || <User className="h-4 w-4" />}
    </span>
  );
}

function Home() {
  const { user, displayName } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [ageSaved, setAgeSaved] = useState(false);
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [friendProfiles, setFriendProfiles] = useState<Profile[]>([]);
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
    const shareData = {
      title: "SG4",
      text: `Följ min golfutveckling i SG4${data?.real !== null && data ? ` – HCP ${hcpLabel(data.real ?? data.estimated ?? 0)}` : ""}.`,
      url: typeof window !== "undefined" ? window.location.origin : undefined,
    };
    if (typeof navigator !== "undefined" && navigator.share) navigator.share(shareData).catch(() => {});
    else if (typeof navigator !== "undefined" && navigator.clipboard && shareData.url) void navigator.clipboard.writeText(shareData.url);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
      <div className="flex items-center justify-between">
        <span className="font-display text-2xl leading-none tracking-wide text-foreground">SG4</span>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <button type="button" onClick={shareProfile} aria-label="Dela" className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"><Share2 className="h-4 w-4" /></button>
          <Link to="/konto" className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{displayName ?? (user ? "Konto" : "Logga in")}</Link>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <Link to="/konto" aria-label="Din profil" className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-flag bg-muted">
          {profile.photo ? <img src={profile.photo} alt={`Profilbild för ${displayName ?? "Golfspelare"}`} className="h-full w-full object-cover" /> : <User className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />}
        </Link>
        <div className="min-w-0"><p className="text-sm text-muted-foreground">Låt oss spela,</p><h1 className="truncate font-[family-name:var(--font-display)] text-3xl leading-none">{displayName ?? "Golfspelare"}</h1></div>
      </div>

      <ActiveMultiplayerBanner />

      <div className="mt-5 grid grid-cols-[1.55fr_.8fr] gap-3">
        <Link to="/vanner" className="flex min-w-0 items-center gap-3 rounded-3xl border border-border bg-card px-4 py-4 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.32)] transition-transform active:scale-[0.99]">
          <span className="flex shrink-0 items-center pl-0.5">
            {friendProfiles.length ? friendProfiles.map((friend, index) => <FriendAvatar key={friend.id} profile={friend} index={index} />) : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><Users className="h-4 w-4" /></span>}
          </span>
          <span className="min-w-0">
            <span className="block font-display text-3xl leading-none text-primary">{friendCount ?? "–"}</span>
            <span className="mt-1 block truncate text-sm font-semibold">Vänner</span>
          </span>
        </Link>
        <div className="flex min-w-0 flex-col items-center justify-center rounded-3xl border border-border bg-card px-3 py-4 text-center shadow-[0_12px_28px_-18px_rgba(0,0,0,0.32)]">
          <span className="font-display text-3xl leading-none text-primary">{data ? hcpLabel(data.real ?? data.estimated ?? 0) : "–"}</span>
          <span className="mt-1 text-sm font-semibold text-muted-foreground">HCP</span>
        </div>
      </div>

      <AppStoryLauncher />

      {data && <div className="mt-4">
        {data.real === null && data.cats.every((c) => c.count === 0) && <Link to="/konto" className="mb-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Gauge className="h-4 w-4" strokeWidth={1.75} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-tight">Ange ditt officiella HCP</span><span className="block text-xs text-muted-foreground">Få en direkt baslinje i alla kategorier, helt utan att göra ett test</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Link>}
        {profile.age === undefined && !ageSaved && <div className="mb-4"><AgeInlinePrompt title="Ange din ålder" description="Se hur din ball speed i Speed Test står sig mot jämnåriga golfare" onSaved={() => setAgeSaved(true)} /></div>}
        <div className="mt-10"><AnalysisRadarSwitcher cats={data.cats} totalHandicap={data.estimated} /></div>
        <StableCategoryStatsSection />
        <OpportunityCard opportunity={data.opportunity} />
        <Link to="/tester" className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground">Gör ett test<ArrowRight className="h-5 w-5" /></Link>
      </div>}

      <p className="mt-8 text-center text-xs text-muted-foreground">Alla resultat sparas lokalt och på ditt konto.</p>
    </main>
  );
}
