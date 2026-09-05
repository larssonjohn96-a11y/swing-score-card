/**
 * Alla localStorage-nycklar som innehåller genomförda testsessioner.
 *
 * Detta är den enda källan för nyckelnamnen – legacy-modulerna importerar
 * härifrån så att adapter-lagret (src/lib/sessions/adapters.ts) och de
 * befintliga läsarna aldrig kan glida isär. Byt ALDRIG värdet på en nyckel
 * här: det skulle göra befintlig lokal historik osynlig.
 */
export const LEGACY_KEYS = {
  // HCP-grundande tester
  precision: "golf-precision-sessions-v1",
  offtee: "golf-offtee-sessions-v1",
  shortgame: "golf-shortgame-sessions-v1",
  bunker: "golf-bunker-sessions-v3",
  shortputt: "golf-shortputt-sessions-v4",
  lagputtHcp: "golf-lagputt-sessions-v3",
  speed: "golf-speed-sessions-v2",

  // Träningstester med egna moduler
  eightBall: "sg4-8-bollar-v1",
  lagputt18: "sg4-lagputt-18-v1",
  fiftyPutt: "sg4:fifty-putt-sessions:v1",
  tutor: "sg4-tutor-test-v1",
  approachPei: "sg4-approach-pei-v2",
  peiWedge: "sg4-pei-wedge-v1",
  peiIron: "sg4-pei-iron-v1",

  // Äldre tester som fortfarande har routes/läsare
  tornado: "golf-tornado-sessions-v1",
  pitch: "golf-pitch-sessions-v1",
  chip: "golf-chip-sessions-v1",
  combine: "golf-combine-sessions-v1",
  fairway: "golf-fairway-sessions-v1",
  longdrive: "golf-longdrive-sessions-v1",
  teeshot: "golf-teeshot-sessions-v3",
} as const;

/** Generiska träningstester (src/lib/training/core.ts). */
export function trainingKey(testId: string) {
  return `sg4-training-${testId}-v1`;
}

/** Interna nycklar för sessionslagret självt. */
export const SESSION_LAYER_KEYS = {
  outbox: "sg4-sessions-outbox-v1",
  syncState: "sg4-sessions-sync-v1",
} as const;
