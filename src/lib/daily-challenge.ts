export type DailyChallengeCategory = "putting" | "chipping" | "driver" | "bunker" | "approach";

export type DailyChallengeStatus = "not-started" | "active" | "won" | "lost";

export type DailyChallengeRecord = {
  date: string;
  offered: DailyChallengeCategory[];
  selected?: DailyChallengeCategory;
  status: DailyChallengeStatus;
  successes: number;
  misses: number;
  target: number;
  maxAttempts: number;
  baseline: number;
  updatedAt: number;
};

type DailyChallengeState = {
  records: Record<string, DailyChallengeRecord>;
  skill: Record<DailyChallengeCategory, number>;
};

export type DailyChallengeDefinition = {
  category: DailyChallengeCategory;
  label: string;
  eyebrow: string;
  task: string;
  shortTask: string;
  target: number;
  maxAttempts: number;
  baseline: number;
  estimatedWinChance: number;
};

const STORAGE_KEY = "sg4-daily-challenge-v1";

const DEFAULT_SKILL: Record<DailyChallengeCategory, number> = {
  putting: 0.55,
  chipping: 0.50,
  driver: 0.50,
  bunker: 0.45,
  approach: 0.50,
};

const CATEGORY_LABELS: Record<DailyChallengeCategory, string> = {
  putting: "Putting",
  chipping: "Chipping",
  driver: "Driver",
  bunker: "Bunker",
  approach: "Inspel",
};

const ROTATIONS: DailyChallengeCategory[][] = [
  ["putting", "chipping", "driver"],
  ["bunker", "chipping", "approach"],
  ["driver", "putting", "approach"],
  ["chipping", "bunker", "putting"],
  ["approach", "driver", "bunker"],
];

function emptyState(): DailyChallengeState {
  return { records: {}, skill: { ...DEFAULT_SKILL } };
}

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function dayIndex(key: string) {
  const date = parseDateKey(key);
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

export function loadDailyChallengeState(): DailyChallengeState {
  if (typeof window === "undefined") return emptyState();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as Partial<DailyChallengeState> | null;
    if (!parsed) return emptyState();
    return {
      records: parsed.records ?? {},
      skill: { ...DEFAULT_SKILL, ...(parsed.skill ?? {}) },
    };
  } catch {
    return emptyState();
  }
}

function save(state: DailyChallengeState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function offeredCategories(dateKey = todayKey()) {
  return ROTATIONS[Math.abs(dayIndex(dateKey)) % ROTATIONS.length];
}

function combination(n: number, k: number) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i += 1) result = (result * (n - (k - i))) / i;
  return result;
}

function binomialTail(n: number, k: number, p: number) {
  let total = 0;
  for (let x = k; x <= n; x += 1) {
    total += combination(n, x) * p ** x * (1 - p) ** (n - x);
  }
  return total;
}

function targetForBaseline(p: number) {
  let best = { target: 3, maxAttempts: 5, chance: binomialTail(5, 3, p), delta: Infinity };
  for (let target = 2; target <= 6; target += 1) {
    const maxAttempts = target + 2;
    const chance = binomialTail(maxAttempts, target, p);
    const delta = Math.abs(chance - 0.5);
    if (delta < best.delta) best = { target, maxAttempts, chance, delta };
  }
  return best;
}

function taskFor(category: DailyChallengeCategory, target: number, maxAttempts: number) {
  if (category === "putting") return {
    task: `Sätt ${target} av ${maxAttempts} puttar från 1,5 m`,
    shortTask: `${target}/${maxAttempts} från 1,5 m`,
  };
  if (category === "chipping") return {
    task: `Få ${target} av ${maxAttempts} chippar inom 2 m från 15 m`,
    shortTask: `${target}/${maxAttempts} inom 2 m`,
  };
  if (category === "driver") return {
    task: `Träffa fairwaykorridoren ${target} av ${maxAttempts} drives`,
    shortTask: `${target}/${maxAttempts} i korridoren`,
  };
  if (category === "bunker") return {
    task: `Få ${target} av ${maxAttempts} bunkerslag på green inom 3 m`,
    shortTask: `${target}/${maxAttempts} inom 3 m`,
  };
  return {
    task: `Få ${target} av ${maxAttempts} inspel inom 12 m från 100 m`,
    shortTask: `${target}/${maxAttempts} inom 12 m`,
  };
}

export function buildChallenge(category: DailyChallengeCategory, state = loadDailyChallengeState()): DailyChallengeDefinition {
  const baseline = Math.max(0.25, Math.min(0.85, state.skill[category] ?? DEFAULT_SKILL[category]));
  const target = targetForBaseline(baseline);
  const task = taskFor(category, target.target, target.maxAttempts);
  return {
    category,
    label: CATEGORY_LABELS[category],
    eyebrow: "Challenge Point",
    ...task,
    target: target.target,
    maxAttempts: target.maxAttempts,
    baseline,
    estimatedWinChance: target.chance,
  };
}

export function getTodayRecord(state = loadDailyChallengeState(), dateKey = todayKey()) {
  return state.records[dateKey] ?? null;
}

export function ensureTodayRecord(dateKey = todayKey()) {
  const state = loadDailyChallengeState();
  if (!state.records[dateKey]) {
    state.records[dateKey] = {
      date: dateKey,
      offered: [...offeredCategories(dateKey)],
      status: "not-started",
      successes: 0,
      misses: 0,
      target: 0,
      maxAttempts: 0,
      baseline: 0,
      updatedAt: Date.now(),
    };
    save(state);
  }
  return { state, record: state.records[dateKey] };
}

export function selectDailyChallenge(category: DailyChallengeCategory, dateKey = todayKey()) {
  const { state, record } = ensureTodayRecord(dateKey);
  if (record.selected) return record;
  if (!record.offered.includes(category)) return record;
  const challenge = buildChallenge(category, state);
  const next: DailyChallengeRecord = {
    ...record,
    selected: category,
    status: "active",
    successes: 0,
    misses: 0,
    target: challenge.target,
    maxAttempts: challenge.maxAttempts,
    baseline: challenge.baseline,
    updatedAt: Date.now(),
  };
  state.records[dateKey] = next;
  save(state);
  return next;
}

export function recordDailyAttempt(hit: boolean, dateKey = todayKey()) {
  const state = loadDailyChallengeState();
  const current = state.records[dateKey];
  if (!current?.selected || current.status !== "active") return current ?? null;

  const successes = current.successes + (hit ? 1 : 0);
  const misses = current.misses + (hit ? 0 : 1);
  const attempts = successes + misses;
  const won = successes >= current.target;
  const cannotStillWin = misses >= 3 || attempts >= current.maxAttempts;
  const status: DailyChallengeStatus = won ? "won" : cannotStillWin ? "lost" : "active";

  const next = { ...current, successes, misses, status, updatedAt: Date.now() };
  state.records[dateKey] = next;

  if (status === "won" || status === "lost") {
    const observed = attempts ? successes / attempts : current.baseline;
    const old = state.skill[current.selected] ?? DEFAULT_SKILL[current.selected];
    state.skill[current.selected] = Math.max(0.25, Math.min(0.85, old * 0.8 + observed * 0.2));
  }

  save(state);
  return next;
}

function diffDays(a: string, b: string) {
  return Math.round((dayIndex(a) - dayIndex(b)));
}

export function challengeStreaks(state = loadDailyChallengeState(), dateKey = todayKey()) {
  const completed = Object.values(state.records)
    .filter((record) => record.status === "won" || record.status === "lost")
    .sort((a, b) => b.date.localeCompare(a.date));

  let daily = 0;
  let cursor = dateKey;
  const today = state.records[dateKey];
  if (!today || (today.status !== "won" && today.status !== "lost")) {
    const d = parseDateKey(dateKey);
    d.setDate(d.getDate() - 1);
    cursor = todayKey(d);
  }
  const completeDates = new Set(completed.map((record) => record.date));
  while (completeDates.has(cursor)) {
    daily += 1;
    const d = parseDateKey(cursor);
    d.setDate(d.getDate() - 1);
    cursor = todayKey(d);
  }

  let wins = 0;
  for (let i = 0; i < completed.length; i += 1) {
    const record = completed[i];
    if (i > 0 && diffDays(completed[i - 1].date, record.date) !== 1) break;
    if (record.status !== "won") break;
    wins += 1;
  }

  return { daily, wins };
}

export function recentChallengeHistory(state = loadDailyChallengeState(), limit = 30) {
  return Object.values(state.records)
    .filter((record) => record.status === "won" || record.status === "lost")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}
