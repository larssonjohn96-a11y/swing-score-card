export type TempoMode = "full" | "short" | "putt";
export type TempoSound = "soft" | "digital" | "click" | "off";
export type TempoCount = 5 | 10 | 20 | "unlimited";
export type TempoSoundCue = "start" | "top" | "impact";
export type TempoSoundCues = Record<TempoSoundCue, boolean>;

/** Start = address/bottom, top = transition, impact = bottom at the ball. */
export const TEMPO_SOUND_PRESETS: ReadonlyArray<{
  id: "all" | "bottom-top" | "top-only" | "impact-only";
  label: string;
  cues: TempoSoundCues;
}> = [
  { id: "all", label: "Alla tre", cues: { start: true, top: true, impact: true } },
  { id: "bottom-top", label: "Botten + topp", cues: { start: true, top: true, impact: false } },
  { id: "top-only", label: "Bara toppen", cues: { start: false, top: true, impact: false } },
  { id: "impact-only", label: "Bara impact", cues: { start: false, top: false, impact: true } },
];
export const TEMPO_SOUND_CUE_KEYS: readonly TempoSoundCue[] = ["start", "top", "impact"];

export function matchingSoundPreset(cues: TempoSoundCues) {
  return TEMPO_SOUND_PRESETS.find(preset =>
    TEMPO_SOUND_CUE_KEYS.every(key => preset.cues[key] === cues[key]))?.id ?? null;
}
export function scheduledSoundCues(cues: TempoSoundCues, back: number, total: number): Array<{ cue: TempoSoundCue; offset: number }> {
  const candidates: Array<{ cue: TempoSoundCue; offset: number }> = [
    { cue: "start", offset: 0 },
    { cue: "top", offset: back },
    { cue: "impact", offset: total },
  ];
  return candidates.filter(point => cues[point.cue]);
}
function normalizeSoundCues(raw: unknown): TempoSoundCues {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_TEMPO.soundCues };
  const values = raw as Partial<Record<TempoSoundCue, unknown>>;
  return {
    start: typeof values.start === "boolean" ? values.start : true,
    top: typeof values.top === "boolean" ? values.top : true,
    impact: typeof values.impact === "boolean" ? values.impact : true,
  };
}

export const TEMPO_RATIOS: Record<TempoMode, readonly number[]> = {
  full: [2, 2.5, 3, 3.5, 4],
  short: [1.5, 2, 2.5, 3],
  putt: [1.5, 2, 2.5, 3],
};
export const PRESETS: Record<TempoMode, readonly number[]> = {
  // Total elapsed time between swing start and impact, not backswing time.
  full: [1.33, 1.2, 1.07, .93, .8],
  short: [1.35, 1.2, 1.05, .9, .75],
  putt: [1.35, 1.2, 1.05, .9, .75],
};

export type TempoSettings = {
  mode: TempoMode;
  /** Total start-to-impact time in seconds. Independent of tempo ratio. */
  durations: Record<TempoMode, number>;
  /** Backswing/downswing ratio, stored per swing type. */
  ratios: Record<TempoMode, number>;
  single: boolean;
  count: TempoCount;
  delay: 3 | 5 | 10;
  rest: 3 | 5 | 8;
  sound: TempoSound;
  /** Independently selectable sound/haptic timing. Motion never stops following all phases. */
  soundCues: TempoSoundCues;
  /** Separate from the three swing cue points, so "top only" really sounds top only. */
  countdownSound: boolean;
  volume: number;
  haptics: boolean;
};
export type TempoSession = {
  at: string;
  mode: TempoMode;
  speed: number; // Historical field; stores backswing seconds in legacy sessions.
  ratio?: number;
  sequences: number;
  complete: boolean;
};

/**
 * Common training ratios, ordered for a single-tap cycle starting at the default.
 * 2.5:1–3.5:1 spans the range observed among playing pros; other ratios are
 * alternatives for experimentation, not claims about every player's measured motion.
 */
export const TEMPO_CYCLES: Record<TempoMode, readonly number[]> = {
  full: [3, 2.5, 3.5, 2, 4],
  short: [2, 1.5, 2.5, 3],
  putt: [2, 1.5, 2.5, 3],
};

export type TempoProfile = {
  title: string;
  description: string;
};

export function nextTempoRatio(mode: TempoMode, ratio: number): number {
  const ratios = TEMPO_CYCLES[mode];
  const position = ratios.indexOf(ratio);
  return ratios[(position + 1) % ratios.length] ?? ratios[0]!;
}

export function formatTempoRatio(ratio: number): string {
  return `${ratio.toString().replace(".", ",")}:1`;
}

export function tempoProfile(mode: TempoMode, ratio: number): TempoProfile {
  if (mode === "full") {
    if (ratio === 3) return {
      title: "Tourpro-tempo",
      description: "Klassiskt riktvärde för full sving hos tourspelare.",
    };
    if (ratio === 2.5) return {
      title: "Tourpro-variation",
      description: "Relativt kortare baksving, nära nedre delen av uppmätt tourintervall.",
    };
    if (ratio === 3.5) return {
      title: "Tourpro-variation",
      description: "Relativt längre baksving, nära övre delen av uppmätt tourintervall.",
    };
    if (ratio === 2) return {
      title: "Närspelslik rytm",
      description: "Vanligare riktvärde vid chip och putt än vid full sving.",
    };
    return {
      title: "Utdragen baksving",
      description: "Längre baksving i förhållande till nedsvingen än typiskt tourtempo.",
    };
  }
  if (ratio === 2) return mode === "putt" ? {
    title: "Tourinspirerad puttrytm",
    description: "2:1 används som vanligt riktvärde för puttning.",
  } : {
    title: "Tourinspirerat närspel",
    description: "2:1 används som vanligt riktvärde för chip och pitch.",
  };
  if (ratio === 1.5) return {
    title: "Kortare bakrörelse",
    description: "Närmare lika tid bakåt och framåt än standardrytmen.",
  };
  if (ratio === 2.5) return {
    title: "Längre bakrörelse",
    description: "Något mer tid bakåt i förhållande till framrörelsen.",
  };
  return {
    title: "Fullsvingslik rytm",
    description: "3:1 är det klassiska riktvärdet för fulla slag.",
  };
}

export const DEFAULT_TEMPO: TempoSettings = {
  mode: "full",
  durations: { full: 1.07, short: 1.05, putt: 1.05 },
  ratios: { full: 3, short: 2, putt: 2 },
  single: false,
  count: 10,
  delay: 3,
  rest: 5,
  sound: "soft",
  soundCues: { start: true, top: true, impact: true },
  countdownSound: true,
  volume: .7,
  haptics: false,
};
const SETTINGS_KEY = "sg4-tempo-settings-v2";
const LEGACY_SETTINGS_KEY = "sg4-tempo-settings-v1";
const HISTORY_KEY = "sg4-tempo-history-v1";

const roundHundredth = (value: number) => Math.round(value * 100) / 100;
const validDuration = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= .6 && value <= 1.8
    ? roundHundredth(value) : fallback;
const defaultRatio = (mode: TempoMode) => DEFAULT_TEMPO.ratios[mode];
const validRatio = (mode: TempoMode, value: unknown) =>
  typeof value === "number" && TEMPO_RATIOS[mode].includes(value) ? value : defaultRatio(mode);

/** Tempo is the ratio; speed is the independent total start-to-impact duration. */
export function tempoTiming(mode: TempoMode, duration: number, chosenRatio?: number) {
  const ratio = validRatio(mode, chosenRatio ?? defaultRatio(mode));
  const back = duration * ratio / (ratio + 1);
  const down = duration / (ratio + 1);
  const follow = mode === "full" ? Math.max(.42, down * 1.75)
    : mode === "short" ? Math.max(.35, down * 1.1)
    : Math.max(.3, down * 1.1);
  return { ratio, back, down, total: duration, follow };
}
export function normalizeTempo(raw: unknown): TempoSettings {
  if (!raw || typeof raw !== "object")
    return { ...DEFAULT_TEMPO, durations: { ...DEFAULT_TEMPO.durations }, ratios: { ...DEFAULT_TEMPO.ratios }, soundCues: { ...DEFAULT_TEMPO.soundCues } };
  const row = raw as Partial<TempoSettings> & { speeds?: Partial<Record<TempoMode, number>> };
  const durationFor = (mode: TempoMode): number => {
    const existing = row.durations?.[mode];
    if (typeof existing === "number") return validDuration(existing, DEFAULT_TEMPO.durations[mode]);
    // Non-destructive migration: v1 persisted backswing seconds instead of total swing time.
    const old = row.speeds?.[mode];
    if (typeof old === "number" && Number.isFinite(old) && old >= .45 && old <= 1.1) {
      const ratio = defaultRatio(mode);
      return validDuration(old * (1 + 1 / ratio), DEFAULT_TEMPO.durations[mode]);
    }
    return DEFAULT_TEMPO.durations[mode];
  };
  return {
    mode: row.mode === "short" || row.mode === "putt" ? row.mode : "full",
    durations: { full: durationFor("full"), short: durationFor("short"), putt: durationFor("putt") },
    ratios: {
      full: validRatio("full", row.ratios?.full),
      short: validRatio("short", row.ratios?.short),
      putt: validRatio("putt", row.ratios?.putt),
    },
    single: row.single === true,
    count: row.count === 5 || row.count === 20 || row.count === "unlimited" ? row.count : 10,
    delay: row.delay === 5 || row.delay === 10 ? row.delay : 3,
    rest: row.rest === 3 || row.rest === 8 ? row.rest : 5,
    sound: row.sound === "digital" || row.sound === "click" || row.sound === "off" ? row.sound : "soft",
    soundCues: normalizeSoundCues(row.soundCues),
    countdownSound: row.countdownSound !== false,
    volume: typeof row.volume === "number" && Number.isFinite(row.volume) ? Math.max(0, Math.min(1, row.volume)) : .7,
    haptics: row.haptics === true,
  };
}
export function loadTempo(): TempoSettings {
  if (typeof window === "undefined") return normalizeTempo(null);
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY) ?? window.localStorage.getItem(LEGACY_SETTINGS_KEY);
    return normalizeTempo(JSON.parse(raw || "null"));
  } catch { return normalizeTempo(null); }
}
export function storeTempo(settings: TempoSettings) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* private mode */ }
}
export function loadTempoSessions(): TempoSession[] {
  if (typeof window === "undefined") return [];
  try {
    const rows: unknown = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]");
    if (!Array.isArray(rows)) return [];
    return rows.filter((r): r is TempoSession => Boolean(r && typeof r === "object"
      && typeof r.at === "string" && ["full", "short", "putt"].includes(r.mode)
      && typeof r.speed === "number" && Number.isFinite(r.speed)
      && typeof r.sequences === "number" && Number.isInteger(r.sequences)
      && r.sequences > 0 && typeof r.complete === "boolean")).slice(0, 12);
  } catch { return []; }
}
export function storeTempoSession(record: TempoSession): TempoSession[] {
  const next = [record, ...loadTempoSessions()].slice(0, 12);
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  }
  return next;
}
