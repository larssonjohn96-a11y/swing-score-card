import { loadPrecisionSessions } from "@/lib/precision-store";
import { LEGACY_KEYS } from "@/lib/sessions/keys";

export type ApproachShotRecord = {
  source: "approach-hcp" | "pei-wedge" | "pei-iron";
  date: string;
  target: number;
  actual: number;
  lateral: number;
};

type PeiStoredSession = {
  date?: string;
  shots?: Array<{ target?: number; actual?: number; lateral?: number }>;
};

function safeRead(key: string): PeiStoredSession[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function validShot(shot: Partial<ApproachShotRecord>) {
  return (
    Number.isFinite(shot.target) &&
    Number.isFinite(shot.actual) &&
    Number.isFinite(shot.lateral) &&
    (shot.target ?? 0) > 0
  );
}

export function collectApproachShots(): ApproachShotRecord[] {
  const rows: ApproachShotRecord[] = [];

  for (const session of loadPrecisionSessions()) {
    for (const shot of session.shots.filter((s) => s.filled)) {
      const row: ApproachShotRecord = {
        source: "approach-hcp",
        date: session.date,
        target: shot.target,
        actual: shot.carry,
        lateral: Math.abs(shot.lateral),
      };
      if (validShot(row)) rows.push(row);
    }
  }

  const peiSources: Array<[string, ApproachShotRecord["source"]]> = [
    [LEGACY_KEYS.peiWedge, "pei-wedge"],
    [LEGACY_KEYS.peiIron, "pei-iron"],
  ];

  for (const [key, source] of peiSources) {
    for (const session of safeRead(key)) {
      if (!Array.isArray(session.shots)) continue;
      for (const shot of session.shots) {
        const row: ApproachShotRecord = {
          source,
          date: session.date ?? "",
          target: Number(shot.target),
          actual: Number(shot.actual),
          lateral: Math.abs(Number(shot.lateral)),
        };
        if (validShot(row)) rows.push(row);
      }
    }
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export function approachProximity(shot: ApproachShotRecord) {
  return Math.hypot(shot.actual - shot.target, shot.lateral);
}

export function approachProximityPct(shot: ApproachShotRecord) {
  return (approachProximity(shot) / shot.target) * 100;
}

export function approachLengthErrorPct(shot: ApproachShotRecord) {
  return (Math.abs(shot.actual - shot.target) / shot.target) * 100;
}

export function approachLateralErrorPct(shot: ApproachShotRecord) {
  return (shot.lateral / shot.target) * 100;
}
