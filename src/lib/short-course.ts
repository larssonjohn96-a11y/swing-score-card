export type ShortHole = { par: number; metres: number | null };
export type ShortCourse = { id: string; name: string; holes: ShortHole[] };
export type ShortScore = { you: number | null; other: number | null };
export type ShortRound = {
  id: string;
  course: ShortCourse;
  mode: "solo" | "friend" | "bot";
  format: "stroke" | "match";
  names: [string, string];
  botLevel: number;
  botScores: number[];
  scores: ShortScore[];
  started: string;
  finished?: string;
};
export type ShortCourseStore = {
  courses: ShortCourse[];
  history: ShortRound[];
  active: ShortRound | null;
};
export const emptyShortCourses = (): ShortCourseStore => ({
  courses: [],
  history: [],
  active: null,
});
export function courseKey(course: ShortCourse) {
  return JSON.stringify([course.id, course.holes]);
}
export function validCourse(c: ShortCourse) {
  return (
    !!c &&
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    c.name.trim().length > 0 &&
    Array.isArray(c.holes) &&
    c.holes.length >= 1 &&
    c.holes.length <= 18 &&
    c.holes.every(
      (h) =>
        h &&
        Number.isInteger(h.par) &&
        h.par >= 3 &&
        h.par <= 5 &&
        (h.metres === null || (Number.isInteger(h.metres) && h.metres >= 20 && h.metres <= 600)),
    )
  );
}
export function validRound(r: ShortRound) {
  const score = (n: unknown) =>
    n === null || (typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 30);
  return (
    !!r &&
    typeof r.id === "string" &&
    validCourse(r.course) &&
    ["solo", "friend", "bot"].includes(r.mode) &&
    ["stroke", "match"].includes(r.format) &&
    Array.isArray(r.names) &&
    r.names.length === 2 &&
    r.names.every((n) => typeof n === "string") &&
    Array.isArray(r.scores) &&
    r.scores.length <= r.course.holes.length &&
    r.scores.every((s) => s && score(s.you) && score(s.other)) &&
    Array.isArray(r.botScores) &&
    (r.mode !== "bot" ||
      (r.botScores.length === r.course.holes.length &&
        r.botScores.every((n) => typeof n === "number" && score(n))))
  );
}
export function parseShortCourses(raw: string | null): ShortCourseStore {
  if (!raw) return emptyShortCourses();
  const data = JSON.parse(raw);
  if (
    !Array.isArray(data.courses) ||
    !data.courses.every(validCourse) ||
    !Array.isArray(data.history) ||
    !data.history.every(validRound) ||
    (data.active !== null && !validRound(data.active))
  )
    throw new Error("Invalid short-course data");
  return data;
}
export function completeTotal(round: ShortRound, side: "you" | "other" = "you"): number | null {
  if (
    round.scores.length !== round.course.holes.length ||
    round.scores.some((s) => s[side] === null)
  )
    return null;
  return round.scores.reduce((sum, s) => sum + s[side]!, 0);
}
export function personalBest(history: ShortRound[], course: ShortCourse) {
  const rounds = history.filter(
    (r) => r.finished && courseKey(r.course) === courseKey(course) && completeTotal(r) !== null,
  );
  return rounds.sort((a, b) => completeTotal(a)! - completeTotal(b)!)[0] ?? null;
}
export function holeWinner(s: ShortScore): "you" | "other" | "tie" {
  if (s.you === s.other) return "tie";
  if (s.you === null) return "other";
  if (s.other === null) return "you";
  return s.you < s.other ? "you" : "other";
}
export function matchStatus(round: ShortRound) {
  const diff = round.scores.reduce(
    (n, s) => n + (holeWinner(s) === "you" ? 1 : holeWinner(s) === "other" ? -1 : 0),
    0,
  );
  const left = round.course.holes.length - round.scores.length;
  return {
    diff,
    left,
    decided: Math.abs(diff) > left,
    leader: diff > 0 ? round.names[0] : diff < 0 ? round.names[1] : null,
  };
}
/** Virtual opponent: pre-generated independently of the player's scores. */
export function shortBotScores(course: ShortCourse, level: number, random = Math.random): number[] {
  return course.holes.map((h) => {
    const roll = random();
    const offset =
      level === 0
        ? roll < 0.1
          ? 0
          : roll < 0.4
            ? 1
            : roll < 0.8
              ? 2
              : 3
        : level === 1
          ? roll < 0.12
            ? -1
            : roll < 0.55
              ? 0
              : roll < 0.9
                ? 1
                : 2
          : roll < 0.25
            ? -1
            : roll < 0.85
              ? 0
              : 1;
    const longer = h.metres !== null && h.par === 3 && h.metres > 150 && random() < 0.35 ? 1 : 0;
    return Math.max(1, h.par + offset + longer);
  });
}
