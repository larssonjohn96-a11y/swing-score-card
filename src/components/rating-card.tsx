import { useEffect, useState } from "react";
import { Award, Check, Crown, Flag, Medal, Pencil, Shield, Star, User } from "lucide-react";
import {
  CARD_TIERS,
  computeRatingCard,
  loadCardProfile,
  saveCardProfile,
  type CardProfile,
  type CardTier,
  type RatingCardData,
} from "@/lib/rating-card";
import { hcpLabel, loadRealHandicap, saveRealHandicap } from "@/lib/sg-handicap";
import { flagForCountry } from "@/lib/countries";

/**
 * Sköldformad kortkontur (som ett samlarkort), definierad i objectBoundingBox-
 * enheter (0–1) så samma path funkar oavsett kortets faktiska pixelstorlek.
 * Används både på ramen (tier-färgad) och innehållsytan (pärmfärgad), där
 * innehållsytan är något mindre (via padding) för att skapa ram-effekten.
 */
const SHIELD_PATH =
  "M 0.5 0.02 C 0.36 0.02 0.32 0.09 0.18 0.09 C 0.06 0.09 0.02 0.14 0.02 0.20 " +
  "L 0.02 0.78 C 0.02 0.86 0.05 0.90 0.10 0.93 L 0.5 1.0 L 0.90 0.93 " +
  "C 0.95 0.90 0.98 0.86 0.98 0.78 " +
  "L 0.98 0.20 C 0.98 0.14 0.94 0.09 0.82 0.09 C 0.68 0.09 0.64 0.02 0.5 0.02 Z";

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

      <PlayerCard
        data={data}
        profile={profile}
        playerName={playerName}
        onSaveHandicap={saveHandicap}
      />

      {editing ? <ProfileForm profile={profile} onSave={save} /> : null}

      <TierLegend current={data.tier.key} />
    </section>
  );
}

export function PlayerCard({
  data,
  profile,
  playerName,
  onSaveHandicap,
}: {
  data: RatingCardData;
  profile: CardProfile;
  playerName: string;
  /** Om satt: gör Real HCP redigerbar direkt i kortet (pennikon bredvid talet). */
  onSaveHandicap?: (value: number) => void;
}) {
  const style = TIER_STYLES[data.tier.key];
  const TierIcon = style.icon;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.real !== null ? String(data.real) : "");
  const flag = flagForCountry(profile.country);

  function save() {
    const n = Number(draft.replace(",", "."));
    if (Number.isFinite(n)) onSaveHandicap?.(Math.round(n * 10) / 10);
    setEditing(false);
  }

  return (
    <div className="relative mx-auto" style={{ maxWidth: 320 }}>
      {/* Delad sköld-klippbana, definieras en gång och återanvänds på ram + innehåll. */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <clipPath id="sg4-shield" clipPathUnits="objectBoundingBox">
            <path d={SHIELD_PATH} />
          </clipPath>
        </defs>
      </svg>

      <div
        className={`bg-gradient-to-b p-[7px] shadow-glow ${style.shell}`}
        style={{ clipPath: "url(#sg4-shield)" }}
      >
        <div
          className="flex flex-col items-center bg-[#f7f2e4] px-5 pb-10 pt-9 text-[#2b2213]"
          style={{ clipPath: "url(#sg4-shield)" }}
        >
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-[#2b2213]/10">
            {profile.photo ? (
              <img
                src={profile.photo}
                alt={`Profilbild för ${playerName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 opacity-60" strokeWidth={1.2} />
            )}
          </div>
          <p className="mt-3 flex items-center gap-1.5 font-display text-xl uppercase tracking-[0.1em]">
            {flag && <span aria-hidden>{flag}</span>}
            {playerName}
          </p>
          {profile.club && (
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.15em] opacity-70">
              Hemmaklubb: {profile.club}
            </p>
          )}
          {(profile.country || profile.ageClass) && (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] opacity-60">
              {[profile.country ? `Land: ${profile.country}` : null, profile.ageClass]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          <div className="mt-3 flex items-center justify-center gap-6 border-t border-[#2b2213]/15 pt-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] opacity-60">
                  Real HCP
                </p>
                {onSaveHandicap && !editing && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(data.real !== null ? String(data.real) : "");
                      setEditing(true);
                    }}
                    aria-label="Redigera verkligt handicap"
                    className="opacity-60 transition-opacity hover:opacity-100"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
              {editing ? (
                <div className="mt-1 flex items-center justify-center gap-1.5">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && save()}
                    className="w-16 rounded-lg border border-[#2b2213]/30 bg-transparent px-2 py-0.5 text-center font-display text-2xl leading-none outline-none focus:border-[#2b2213]"
                  />
                  <button
                    type="button"
                    onClick={save}
                    aria-label="Spara"
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${style.accent} bg-[#2b2213]/10`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <p className="mt-0.5 font-display text-5xl leading-none">
                  {data.real !== null ? hcpLabel(data.real) : "–"}
                </p>
              )}
            </div>
            {data.estimated !== undefined && (
              <div className="text-center">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] opacity-60">
                  Est. HCP
                </p>
                <p className="mt-0.5 font-display text-xl leading-none opacity-70">
                  {hcpLabel(data.estimated)}
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-col items-center border-t border-[#2b2213]/15 pt-3">
            <div className="flex items-center gap-1.5">
              <TierIcon className={`h-4 w-4 ${style.accent}`} strokeWidth={1.5} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">
                Rating · {data.tier.label}
              </p>
            </div>
            <p className="font-display text-6xl leading-none">{data.rating}</p>
          </div>

          <div className="mt-3 w-[80%] space-y-2 border-t border-[#2b2213]/15 pt-3 pb-1">
            {data.stats.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-xs">
                <span className="opacity-70">{s.label}</span>
                <span className="font-display text-base leading-none">{s.value ?? "–"}</span>
              </div>
            ))}
          </div>
        </div>
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
