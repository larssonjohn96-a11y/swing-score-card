import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Pencil, ShieldCheck, Sparkles, User } from "lucide-react";
import {
  computeRatingCard,
  loadCardProfile,
  saveCardProfile,
  type CardProfile,
  type CardStat,
  type RatingCardData,
} from "@/lib/rating-card";
import { hcpLabel, loadRealHandicap, saveRealHandicap } from "@/lib/sg-handicap";
import { flagForCountry } from "@/lib/countries";

const STAT_SHORT: Record<CardStat["key"], string> = {
  driving: "TEE",
  approach: "APP",
  "around-the-green": "SHORT",
  puttning: "PUTT",
  speed: "SPEED",
};

const TIER_COPY: Record<RatingCardData["tier"]["key"], string> = {
  bronze: "Developing",
  silver: "Competitive",
  gold: "Advanced",
  elite: "Elite",
  icon: "Icon",
};

function toneFor(value?: number) {
  if (value === undefined) return "text-muted-foreground";
  if (value >= 80) return "text-primary";
  if (value >= 65) return "text-foreground";
  return "text-muted-foreground";
}

export function RatingCardSection({ playerName }: { playerName: string }) {
  const [data, setData] = useState<RatingCardData | null>(null);
  const [profile, setProfile] = useState<CardProfile>({});
  const [editingProfile, setEditingProfile] = useState(false);

  useEffect(() => {
    setData(computeRatingCard(loadRealHandicap()));
    setProfile(loadCardProfile());
  }, []);

  function saveProfile(next: CardProfile) {
    saveCardProfile(next);
    setProfile(next);
    setEditingProfile(false);
  }

  function saveOfficialHcp(value: number) {
    saveRealHandicap(value);
    setData(computeRatingCard(value));
  }

  if (!data) return null;

  return (
    <section className="mt-8 space-y-4">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Player identity</p>
          <h2 className="mt-1 font-display text-3xl leading-none">Ditt spelarkort</h2>
        </div>
        <button
          type="button"
          onClick={() => setEditingProfile((v) => !v)}
          className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground"
        >
          {editingProfile ? "Stäng" : "Redigera"}
        </button>
      </div>

      <PlayerCard data={data} profile={profile} playerName={playerName} />
      <CardMeta data={data} onSaveOfficialHcp={saveOfficialHcp} />
      {editingProfile ? <ProfileEditor profile={profile} onSave={saveProfile} /> : null}
    </section>
  );
}

export function PlayerCard({
  data,
  profile,
  playerName,
}: {
  data: RatingCardData;
  profile: CardProfile;
  playerName: string;
}) {
  const flag = flagForCountry(profile.country);
  const strongest = useMemo(
    () => [...data.stats].filter((s) => s.count > 0 && s.value !== undefined).sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0],
    [data.stats],
  );

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-border bg-card shadow-[0_18px_50px_-28px_rgba(0,0,0,0.35)]">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/[0.08] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-primary/[0.05] blur-3xl" />

      <div className="relative p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg tracking-wide">SG4</span>
            <span className="h-4 w-px bg-border" />
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Player Card</span>
          </div>
          <span className="rounded-full border border-primary/15 bg-primary/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            {data.tier.label}
          </span>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex h-[86px] w-[86px] shrink-0 items-center justify-center overflow-hidden rounded-[26px] border border-border bg-muted">
            {profile.photo ? (
              <img src={profile.photo} alt={`Profilbild för ${playerName}`} className="h-full w-full object-cover" />
            ) : (
              <User className="h-9 w-9 text-muted-foreground" strokeWidth={1.25} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {flag ? <span className="text-lg" aria-hidden>{flag}</span> : null}
              <h3 className="truncate font-display text-3xl leading-none">{playerName}</h3>
            </div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {data.playerType ?? TIER_COPY[data.tier.key]}
            </p>
            {profile.club ? <p className="mt-1 truncate text-xs text-muted-foreground">{profile.club}</p> : null}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-[1.35fr_.85fr] gap-3">
          <div className="rounded-[24px] bg-foreground px-5 py-4 text-background">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-60">SG4 HCP</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="font-display text-5xl leading-none">{data.handicap !== undefined ? hcpLabel(data.handicap) : "–"}</span>
            </div>
            <p className="mt-2 text-[10px] leading-snug opacity-60">Din testade nivå · best 8 av senaste 20</p>
          </div>

          <div className="rounded-[24px] border border-border bg-background/70 px-4 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">SG4 Rating</p>
            <p className="mt-1 font-display text-5xl leading-none text-primary">{data.rating}</p>
            <p className="mt-2 text-[10px] text-muted-foreground">av 99</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-5 gap-1.5">
          {data.stats.map((stat) => (
            <div key={stat.key} className="rounded-2xl border border-border/80 bg-background/65 px-1.5 py-3 text-center">
              <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{STAT_SHORT[stat.key]}</p>
              <p className={`mt-1.5 font-display text-2xl leading-none ${toneFor(stat.value)}`}>{stat.value ?? "–"}</p>
              <p className="mt-1 text-[8px] text-muted-foreground">
                {stat.handicap !== undefined ? `HCP ${hcpLabel(stat.handicap)}` : "Ej testad"}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>{data.testedCategories}/5 områden testade</span>
          </div>
          {strongest ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>{strongest.label}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CardMeta({ data, onSaveOfficialHcp }: { data: RatingCardData; onSaveOfficialHcp: (value: number) => void }) {
  const [editingHcp, setEditingHcp] = useState(false);
  const [draft, setDraft] = useState(data.real !== null ? String(data.real) : "");

  function save() {
    const n = Number(draft.replace(",", "."));
    if (Number.isFinite(n)) onSaveOfficialHcp(Math.round(n * 10) / 10);
    setEditingHcp(false);
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3.5">
        <div>
          <p className="text-xs font-semibold">Officiellt HCP</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Referens · påverkar inte kortets rating direkt</p>
        </div>
        {editingHcp ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              step="0.1"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="w-16 rounded-xl border border-border bg-background px-2 py-1.5 text-right text-sm outline-none focus:border-primary"
            />
            <button type="button" onClick={save} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-label="Spara HCP"><Check className="h-4 w-4" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => setEditingHcp(true)} className="flex items-center gap-1.5 font-display text-xl">
            {data.real !== null ? hcpLabel(data.real) : "–"}<Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 border-t border-border">
        <div className="px-4 py-3.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Tester</p>
          <p className="mt-1 font-display text-2xl leading-none">{data.testCount}</p>
        </div>
        <div className="border-l border-border px-4 py-3.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Senast uppdaterad</p>
          <p className="mt-1 text-sm font-semibold">
            {data.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }) : "–"}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProfileEditor({ profile, onSave }: { profile: CardProfile; onSave: (profile: CardProfile) => void }) {
  const [draft, setDraft] = useState(profile);

  useEffect(() => setDraft(profile), [profile]);

  function handlePhoto(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => ({ ...current, photo: typeof reader.result === "string" ? reader.result : current.photo }));
    reader.readAsDataURL(file);
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(draft); }}
      className="rounded-3xl border border-border bg-card p-4"
    >
      <div className="flex items-center justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Kortprofil</p><h3 className="mt-1 font-display text-2xl">Gör kortet till ditt</h3></div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label="Klubb" value={draft.club ?? ""} onChange={(value) => setDraft((p) => ({ ...p, club: value }))} placeholder="Jönköpings GK" />
        <Field label="Land" value={draft.country ?? ""} onChange={(value) => setDraft((p) => ({ ...p, country: value }))} placeholder="Sweden" />
      </div>

      <label className="mt-3 block rounded-2xl border border-dashed border-border px-4 py-3 text-sm">
        <span className="font-semibold">Profilbild</span>
        <span className="ml-2 text-xs text-muted-foreground">Välj bild</span>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhoto(e.target.files?.[0])} />
      </label>

      <button type="submit" className="mt-4 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground">Spara kortprofil</button>
    </form>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
