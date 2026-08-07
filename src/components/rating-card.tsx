import { useEffect, useState } from "react";
import { Award, Crown, Flag, Medal, Shield, Star, User } from "lucide-react";
import {
  CARD_TIERS,
  computeRatingCard,
  loadCardProfile,
  saveCardProfile,
  type CardProfile,
  type CardTier,
  type RatingCardData,
} from "@/lib/rating-card";
import { hcpLabel, loadRealHandicap } from "@/lib/sg-handicap";

const TIER_STYLES: Record<
  CardTier["key"],
  { shell: string; accent: string; ring: string; icon: typeof Medal }
> = {
  bronze: {
    shell: "from-tier-bronze-deep via-tier-bronze-deep to-tier-bronze/40",
    accent: "text-tier-bronze",
    ring: "border-tier-bronze/60",
    icon: Shield,
  },
  silver: {
    shell: "from-tier-silver-deep via-tier-silver-deep to-tier-silver/30",
    accent: "text-tier-silver",
    ring: "border-tier-silver/60",
    icon: Shield,
  },
  gold: {
    shell: "from-tier-gold-deep via-tier-gold-deep to-tier-gold/40",
    accent: "text-tier-gold",
    ring: "border-tier-gold/60",
    icon: Medal,
  },
  elite: {
    shell: "from-tier-elite-deep via-tier-elite-deep to-tier-elite/40",
    accent: "text-tier-elite",
    ring: "border-tier-elite/60",
    icon: Star,
  },
  icon: {
    shell: "from-tier-icon-deep via-tier-icon-deep to-tier-icon/40",
    accent: "text-tier-icon",
    ring: "border-tier-icon/60",
    icon: Crown,
  },
};

export function RatingCardSection({ playerName }: { playerName: string }) {
  const [data, setData] = useState<RatingCardData | null>(null);
  const [profile, setProfile] = useState<CardProfile>({});
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setData(computeRatingCard(loadRealHandicap()));
    setProfile(loadCardProfile());
  }, []);

  function save(next: CardProfile) {
    saveCardProfile(next);
    setProfile(next);
    setEditing(false);
  }

  if (!data) return null;

  return (
    <section className="mt-6 space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Rating card</p>
          <h2 className="text-3xl leading-none">Ditt spelarkort</h2>
        </div>
        <button
          onClick={() => setEditing((v) => !v)}
          className="rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {editing ? "Stäng" : "Redigera"}
        </button>
      </div>

      <PlayerCard data={data} profile={profile} playerName={playerName} />

      {editing ? <ProfileForm profile={profile} onSave={save} /> : null}

      <TierLegend current={data.tier.key} />
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
  const style = TIER_STYLES[data.tier.key];
  const TierIcon = style.icon;

  return (
    <article
      className={`relative overflow-hidden rounded-[1.75rem] border-2 bg-gradient-to-b p-5 text-card-ink shadow-glow ${style.shell} ${style.ring}`}
    >
      <div className="flex items-start justify-between">
        <div className="text-center">
          <p className="font-display text-5xl leading-none">{data.rating}</p>
          <p
            className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${style.accent}`}
          >
            {data.tier.label}
          </p>
          <TierIcon className={`mx-auto mt-3 h-6 w-6 ${style.accent}`} strokeWidth={1.5} />
        </div>

        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-card-ink/10">
          {profile.photo ? (
            <img
              src={profile.photo}
              alt={`Profilbild för ${playerName}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-12 w-12 opacity-70" strokeWidth={1.2} />
          )}
        </div>

        <div className="space-y-2 text-center text-[10px] font-semibold uppercase tracking-[0.15em]">
          {profile.country ? (
            <p>
              Land: <span className="opacity-80">{profile.country}</span>
            </p>
          ) : null}
          {profile.club ? (
            <p>
              Hemmaklubb: <span className="opacity-80">{profile.club}</span>
            </p>
          ) : null}
          {profile.ageClass ? <p className="opacity-80">{profile.ageClass}</p> : null}
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="font-display text-2xl uppercase tracking-[0.12em]">{playerName}</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.15em] opacity-80">
          HCP {data.handicap === undefined ? "–" : hcpLabel(data.handicap)} ·{" "}
          {data.verified ? "Verifierat" : "Uppskattat"}
        </p>
      </div>

      <div className={`mt-4 border-t pt-3 ${style.ring}`}>
        <p className="text-center text-[10px] uppercase tracking-[0.25em] opacity-70">
          Performance rating
        </p>
        <p className="mt-1 text-center font-display text-3xl leading-none">{data.rating}</p>
        <div className="mt-3 grid grid-cols-3 gap-y-3">
          {data.stats.map((s) => (
            <div key={s.key} className="text-center">
              <p className={`text-[10px] font-semibold tracking-[0.15em] ${style.accent}`}>
                {s.label}
              </p>
              <p className="font-display text-xl leading-none">{s.value ?? "–"}</p>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`mt-4 flex items-center justify-between border-t pt-3 text-[10px] uppercase tracking-[0.15em] opacity-80 ${style.ring}`}
      >
        <span>{data.testCount} tester</span>
        <span>
          {data.lastUpdated
            ? `Senast uppd. ${new Date(data.lastUpdated).toLocaleDateString("sv-SE")}`
            : "Inga tester än"}
        </span>
      </div>
    </article>
  );
}

function TierLegend({ current }: { current: CardTier["key"] }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        Kortnivåer baserat på handicap
      </p>
      <ul className="mt-3 space-y-3">
        {CARD_TIERS.map((tier) => {
          const style = TIER_STYLES[tier.key];
          const Icon = style.icon;
          return (
            <li
              key={tier.key}
              className={`flex gap-3 rounded-2xl p-3 ${tier.key === current ? "bg-secondary" : ""}`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.accent}`} strokeWidth={1.5} />
              <div>
                <p className="text-sm font-semibold">{tier.label}</p>
                <p className={`text-xs font-medium ${style.accent}`}>{tier.range}</p>
                <p className="mt-1 text-xs text-muted-foreground">{tier.blurb}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Award className="h-4 w-4" strokeWidth={1.5} />
        Ratingen bygger på dina testresultat: SPD, DRV, APP, SGM, PUT och CON.
      </p>
    </div>
  );
}

function ProfileForm({
  profile,
  onSave,
}: {
  profile: CardProfile;
  onSave: (p: CardProfile) => void;
}) {
  const [draft, setDraft] = useState<CardProfile>(profile);

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraft((d) => ({ ...d, photo: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
      className="space-y-3 rounded-3xl border border-border bg-card p-5"
    >
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Flag className="h-4 w-4" strokeWidth={1.5} />
        Alla fält är valfria.
      </p>
      <CardField
        label="Hemmaklubb"
        value={draft.club ?? ""}
        onChange={(v) => setDraft({ ...draft, club: v })}
        placeholder="Växjö Golf"
      />
      <CardField
        label="Land"
        value={draft.country ?? ""}
        onChange={(v) => setDraft({ ...draft, country: v })}
        placeholder="Sverige"
      />
      <CardField
        label="Åldersklass"
        value={draft.ageClass ?? ""}
        onChange={(v) => setDraft({ ...draft, ageClass: v })}
        placeholder="Senior / Junior"
      />
      <label className="block">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Profilbild
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => pickPhoto(e.target.files?.[0])}
          className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
        />
      </label>
      <div className="flex gap-2">
        {draft.photo ? (
          <button
            type="button"
            onClick={() => setDraft({ ...draft, photo: undefined })}
            className="flex-1 rounded-2xl border border-border py-3 text-sm text-muted-foreground"
          >
            Ta bort bild
          </button>
        ) : null}
        <button
          type="submit"
          className="flex-1 rounded-2xl bg-primary py-3 text-sm font-medium text-primary-foreground"
        >
          Spara kort
        </button>
      </div>
    </form>
  );
}

function CardField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        value={value}
        maxLength={40}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-primary"
      />
    </label>
  );
}
