export type TempoMode = "full" | "short" | "putt";
export type TempoSound = "soft" | "digital" | "click" | "off";
export type TempoCount = 5 | 10 | 20 | "unlimited";
export type TempoSettings = {
  mode: TempoMode;
  speeds: Record<TempoMode, number>;
  single: boolean;
  count: TempoCount;
  delay: 3 | 5 | 10;
  rest: 3 | 5 | 8;
  sound: TempoSound;
  volume: number;
  haptics: boolean;
};
export type TempoSession = {
  at: string;
  mode: TempoMode;
  speed: number;
  sequences: number;
  complete: boolean;
};
export const PRESETS: Record<TempoMode, readonly number[]> = {
  full: [1, .9, .8, .7, .6],
  short: [.9, .8, .7, .6, .5],
  putt: [.9, .8, .7, .6, .5],
};
export const DEFAULT_TEMPO: TempoSettings = {
  mode: "full",
  speeds: { full: .8, short: .7, putt: .7 },
  single: false,
  count: 10,
  delay: 3,
  rest: 5,
  sound: "soft",
  volume: .7,
  haptics: false,
};
const SETTINGS_KEY = "sg4-tempo-settings-v1";
const HISTORY_KEY = "sg4-tempo-history-v1";
function validSpeed(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= .45 && value <= 1.1
    ? Math.round(value * 100) / 100 : fallback;
}
export function tempoTiming(mode: TempoMode, back: number) {
  const ratio = mode === "full" ? 3 : 2;
  return { ratio, back, down: back / ratio, total: back * (1 + 1 / ratio) };
}
export function normalizeTempo(raw: unknown): TempoSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_TEMPO, speeds: { ...DEFAULT_TEMPO.speeds } };
  const row = raw as Partial<TempoSettings>;
  return {
    mode: row.mode === "short" || row.mode === "putt" ? row.mode : "full",
    speeds: {
      full: validSpeed(row.speeds?.full, DEFAULT_TEMPO.speeds.full),
      short: validSpeed(row.speeds?.short, DEFAULT_TEMPO.speeds.short),
      putt: validSpeed(row.speeds?.putt, DEFAULT_TEMPO.speeds.putt),
    },
    single: row.single === true,
    count: row.count === 5 || row.count === 20 || row.count === "unlimited" ? row.count : 10,
    delay: row.delay === 5 || row.delay === 10 ? row.delay : 3,
    rest: row.rest === 3 || row.rest === 8 ? row.rest : 5,
    sound: row.sound === "digital" || row.sound === "click" || row.sound === "off" ? row.sound : "soft",
    volume: typeof row.volume === "number" && Number.isFinite(row.volume) ? Math.max(0, Math.min(1, row.volume)) : .7,
    haptics: row.haptics === true,
  };
}
export function loadTempo(): TempoSettings {
  if (typeof window === "undefined") return normalizeTempo(null);
  try { return normalizeTempo(JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "null")); }
  catch { return normalizeTempo(null); }
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
