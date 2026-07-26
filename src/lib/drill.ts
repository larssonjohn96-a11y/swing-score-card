export const DISTANCES = [75, 125, 150] as const;
export const BALLS_PER_SESSION = 18;
export const HITS_TO_CLEAR = 2;

export type Shot = {
  distance: number;
  hit: boolean;
};

export type DrillState = {
  shots: Shot[];
  stageIndex: number; // 0..2 within current lap
  hitsInStage: number;
  stagesCleared: number; // total across session (max 9)
};

export const initialState: DrillState = {
  shots: [],
  stageIndex: 0,
  hitsInStage: 0,
  stagesCleared: 0,
};

export function currentDistance(state: DrillState) {
  return DISTANCES[state.stageIndex];
}

export function isFinished(state: DrillState) {
  return state.shots.length >= BALLS_PER_SESSION || state.stagesCleared >= 9;
}

export function registerShot(state: DrillState, hit: boolean): DrillState {
  if (isFinished(state)) return state;

  const shots = [...state.shots, { distance: currentDistance(state), hit }];
  if (!hit) return { ...state, shots };

  const hitsInStage = state.hitsInStage + 1;
  if (hitsInStage < HITS_TO_CLEAR) return { ...state, shots, hitsInStage };

  const stagesCleared = state.stagesCleared + 1;
  const stageIndex = (state.stageIndex + 1) % DISTANCES.length;
  return { shots, stageIndex, hitsInStage: 0, stagesCleared };
}

export function undoShot(state: DrillState): DrillState {
  if (state.shots.length === 0) return state;
  const shots = state.shots.slice(0, -1);
  return shots.reduce((acc, s) => registerShot(acc, s.hit), initialState);
}

/** 3 klarade avstånd = 1 varv. Max 3.0 */
export function score(state: DrillState) {
  return state.stagesCleared / DISTANCES.length;
}

export function formatScore(value: number) {
  return value.toFixed(1);
}

export type SessionRecord = {
  id: string;
  date: string; // ISO
  score: number;
  laps: number;
  stagesCleared: number;
  shots: Shot[];
};

const STORAGE_KEY = "golf-drill-sessions-v1";

export function loadSessions(): SessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSession(state: DrillState): SessionRecord {
  const record: SessionRecord = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    score: score(state),
    laps: Math.floor(state.stagesCleared / DISTANCES.length),
    stagesCleared: state.stagesCleared,
    shots: state.shots,
  };
  const all = [...loadSessions(), record];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return record;
}

export function deleteSession(id: string): SessionRecord[] {
  const all = loadSessions().filter((s) => s.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all;
}

export function distanceStats(shots: Shot[]) {
  return DISTANCES.map((d) => {
    const rows = shots.filter((s) => s.distance === d);
    return {
      distance: d,
      attempts: rows.length,
      hits: rows.filter((s) => s.hit).length,
    };
  });
}
