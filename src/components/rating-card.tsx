import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Award,
  Check,
  ChevronRight,
  Crown,
  Flag,
  Gauge,
  Medal,
  Pencil,
  Shield,
  Star,
  User,
  Zap,
} from "lucide-react";
import {
  CARD_TIERS,
  computeRatingCard,
  loadCardProfile,
  saveCardProfile,
  type CardProfile,
  type CardStat,
  type CardTier,
  type RatingCardData,
} from "@/lib/rating-card";
import { hcpLabel, loadRealHandicap, saveRealHandicap } from "@/lib/sg-handicap";
import { flagForCountry } from "@/lib/countries";

/**
 * Enkel, mjukt avrundad kortkontur med en subtil spets längst ned – en
 * förenklad, kompaktare släkting till den tidigare sköldformen. Definierad
 * i objectBoundingBox-enheter (0–1) så samma path funkar oavsett storlek.
 */
const CARD_PATH =
  "M 0.06 0 L 0.94 0 C 0.973 0 1 0.03 1 0.065 " +
  "L 1 0.86 C 1 0.90 0.98 0.93 0.95 0.945 L 0.52 0.99 C 0.51 1.0 0.49 1.0 0.48 0.99 " +
  "L 0.05 0.945 C 0.02 0.93 0 0.90 0 0.86 " +
  "L 0 0.065 C 0 0.03 0.027 0 0.06 0 Z";

const TIER_STYLES: Record<
  CardTier["key"],
  { accent: string; border: string; bg: string; icon: typeof Medal }
> = {
  bronze: {
    accent: "text-tier-bronze",
    border: "border-tier-bronze/50",
    bg: "bg-tier-bronze/10",
    icon: Shield,
  },
  silver: {
    accent: "text-tier-silver",
    border: "border-tier-silver/50",
    bg: "bg-tier-silver/10",
    icon: Shield,
  },
  gold: {
    accent: "text-tier-gold",
    border: "border-tier-gold/60",
    bg: "bg-tier-gold/10",
    icon: Medal,
  },
  elite: {
    accent: "text-tier-elite",
    border: "border-tier-elite/60",
    bg: "bg-tier-elite/10",
    icon: Star,
  },
  icon: {
    accent: "text-tier-icon",
    border: "border-tier-icon/60",
    bg: "bg-tier-icon/10",
    icon: Crown,
  },
};

const STAT_META: Record<CardStat["key"], { short: string; icon: typeof Zap }> = {
  speed: { short: "SPEED", icon: Zap },
  driving: { short: "DRIVING", icon: Flag },
  approach: { short: "APPROACH", icon: Gauge },
  "around-the-green": { short: "AROUND GREEN", icon: Flag },
  puttning: { short: "PUTTING", icon: Gauge },
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

  function saveHandicap(value: number) {
    saveRealHandicap(value);
    setData(computeRatingCard(value));
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

      <PlayerCard data={data} profile={profile} playerName={playerName} linkToDetail={false} />

      <PlayerCardDetails data={data} onSaveHandicap={saveHandicap} />

      {editing ? <ProfileForm profile={profile} onSave={save} /> : null}

      <TierLegend current={data.tier.key} />
    </section>
  );
}

/**
 * Kompakt spelarkort – FIFA-inspirerat men mycket mindre och luftigare än
 * tidigare version. Kommunicerar bara fyra saker: vem, vilken nivå (SG4
 * Rating), vilken typ av spelare, och var spelaren är stark/svag (5
 * kategorier i en rad). Real/Est HCP och annan detalj lever i detaljvyn
 * (PlayerCardDetails), inte på kortet självt.
 */
export function PlayerCard({
  data,
  profile,
  playerName,
  linkToDetail = true,
}: {
  data: RatingCardData;
  profile: CardProfile;
  playerName: string;
  /** Om sant (default): hela kortet är en länk till detaljvyn (/konto). */
  linkToDetail?: boolean;
}) {
  const style = TIER_STYLES[data.tier.key];
  const TierIcon = style.icon;
  const flag = flagForCountry(profile.country);

  const card = (
    <div className="relative mx-auto w-full" style={{ maxWidth: 360 }}>
      <svg width="0" height="0" className="absolute">
        <defs>
          <clipPath id="sg4-card-shape" clipPathUnits="objectBoundingBox">
            <path d={CARD_PATH} />
          </clipPath>
        </defs>
      </svg>

      <div
        className={`border bg-card px-5 pb-6 pt-4 shadow-sm transition-colors ${style.border}`}
        style={{ clipPath: "url(#sg4-card-shape)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
            {profile.photo ? (
              <img
                src={profile.photo}
                alt={`Profilbild för ${playerName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate font-[family-name:var(--font-display)] text-lg leading-none">
              {flag && <span aria-hidden>{flag}</span>}
              {playerName}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              HCP {data.real !== null ? hcpLabel(data.real) : hcpLabel(data.estimated ?? 0)}
            </p>
          </div>
          {linkToDetail && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </div>

        <div className="mt-3 border-t border-border pt-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            SG4 Rating
          </p>
          <p className="font-[family-name:var(--font-display)] text-6xl leading-none text-primary">
            {data.rating}
          </p>
          {data.playerType && (
            <p
              className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${style.bg} ${style.accent}`}
            >
              <TierIcon className="h-3 w-3" strokeWidth={2} />
              {data.playerType}
            </p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-5 gap-1 border-t border-border pt-3">
          {data.stats.map((s) => {
            const meta = STAT_META[s.key];
            const Icon = meta.icon;
            return (
              <div key={s.key} className="flex flex-col items-center gap-0.5">
                <Icon className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                <p className="font-[family-name:var(--font-display)] text-xl leading-none">
                  {s.value ?? "–"}
                </p>
                <p className="text-center text-[7px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
                  {meta.short}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (!linkToDetail) return card;

  return (
    <Link to="/konto" className="block transition-opacity active:opacity-80">
      {card}
    </Link>
  );
}

/** Detaljraderna som tidigare låg inne i kortet – Real/Est HCP m.m. – nu en
 *  egen sektion under det kompakta kortet, bara på detaljvyn (/konto). */
function PlayerCardDetails({
  data,
  onSaveHandicap,
}: {
  data: RatingCardData;
  onSaveHandicap: (value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.real !== null ? String(data.real) : "");

  function save() {
    const n = Number(draft.replace(",", "."));
    if (Number.isFinite(n)) onSaveHandicap(Math.round(n * 10) / 10);
    setEditing(false);
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <div className="flex items-center justify-between py-1.5">
        <p className="text-xs text-muted-foreground">Official HCP</p>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="w-16 rounded-lg border border-border bg-background px-2 py-0.5 text-right font-[family-name:var(--font-display)] text-base leading-none outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={save}
              aria-label="Spara"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(data.real !== null ? String(data.real) : "");
              setEditing(true);
            }}
            className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-base"
          >
            {data.real !== null ? hcpLabel(data.real) : "–"}
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-border py-1.5">
        <p className="text-xs text-muted-foreground">SG4 HCP (est.)</p>
        <p className="font-[family-name:var(--font-display)] text-base">
          {data.estimated !== undefined ? hcpLabel(data.estimated) : "–"}
        </p>
      </div>
      <div className="flex items-center justify-between border-t border-border py-1.5">
        <p className="text-xs text-muted-foreground">Senaste test</p>
        <p className="text-sm">
          {data.lastUpdated
            ? new Date(data.lastUpdated).toLocaleDateString("sv-SE", {
                day: "2-digit",
                month: "short",
              })
            : "–"}
        </p>
      </div>
    </div>
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
        Ratingen bygger på dina testresultat: Speed, Driving, Approach, Around the Green och
        Putting.
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
