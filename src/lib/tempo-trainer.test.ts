import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPO, TEMPO_CYCLES, TEMPO_SOUND_PRESETS, matchingSoundPreset, scheduledSoundCues, formatTempoRatio, nextTempoRatio, normalizeTempo, tempoProfile, tempoTiming } from "./tempo-trainer";

describe("SG4 tempoträning", () => {

  it("erbjuder alla tre signalerna eller bara start och toppen", () => {
    const all = TEMPO_SOUND_PRESETS.find(p => p.id === "all")!;
    const bottomTop = TEMPO_SOUND_PRESETS.find(p => p.id === "bottom-top")!;
    expect(scheduledSoundCues(all.cues, .8, 1.07)).toEqual([
      { cue: "start", offset: 0 },
      { cue: "top", offset: .8 },
      { cue: "impact", offset: 1.07 },
    ]);
    expect(scheduledSoundCues(bottomTop.cues, .8, 1.07)).toEqual([
      { cue: "start", offset: 0 },
      { cue: "top", offset: .8 },
    ]);
    expect(matchingSoundPreset(bottomTop.cues)).toBe("bottom-top");
  });
  it("stödjer bara toppen, bara impact och egna ljudkombinationer", () => {
    const topOnly = TEMPO_SOUND_PRESETS.find(p => p.id === "top-only")!;
    expect(scheduledSoundCues(topOnly.cues, .8, 1.07)).toEqual([{ cue: "top", offset: .8 }]);
    expect(scheduledSoundCues({start: false, top: false, impact: true}, .8, 1.07))
      .toEqual([{cue: "impact", offset: 1.07}]);
    const custom = { start: true, top: false, impact: true };
    expect(matchingSoundPreset(custom)).toBe(null);
    expect(scheduledSoundCues(custom, .8, 1.07)).toEqual([
      { cue: "start", offset: 0 },
      { cue: "impact", offset: 1.07 },
    ]);
    expect(scheduledSoundCues({ start: false, top: false, impact: false }, .8, 1.07)).toEqual([]);
  });
  it("sparar ljudpunkter, återläser gamla inställningar och normaliserar felaktiga värden", () => {
    const chosen = normalizeTempo({
      mode: "short", soundCues: { start: false, top: true, impact: false },
      countdownSound: false, sound: "digital",
    });
    expect(chosen.soundCues).toEqual({ start: false, top: true, impact: false });
    expect(chosen.countdownSound).toBe(false);
    expect(normalizeTempo(chosen).soundCues).toEqual(chosen.soundCues);
    const legacy = normalizeTempo({ sound: "soft" });
    expect(legacy.soundCues).toEqual(DEFAULT_TEMPO.soundCues);
    expect(legacy.countdownSound).toBe(true);
    const malformed = normalizeTempo({ soundCues: { start: "false", top: false, impact: 0 } });
    expect(malformed.soundCues).toEqual({ start: true, top: false, impact: true });
    const fresh = normalizeTempo(null);
    fresh.soundCues.start = false;
    expect(DEFAULT_TEMPO.soundCues.start).toBe(true);
  });

  it("växlar med ett tryck mellan fullsvingens vanliga rytmer och går runt", () => {
    let ratio = 3;
    const visited = [ratio];
    for (let i = 0; i < TEMPO_CYCLES.full.length; i++) {
      ratio = nextTempoRatio("full", ratio);
      visited.push(ratio);
    }
    expect(visited).toEqual([3, 2.5, 3.5, 2, 4, 3]);
  });
  it("har puttning och närspel med 2:1 som utgångsläge", () => {
    expect(nextTempoRatio("short", 2)).toBe(1.5);
    expect(nextTempoRatio("putt", 3)).toBe(2);
    expect(formatTempoRatio(2.5)).toBe("2,5:1");
  });
  it("visar relevant profilbeskrivning när tempot växlas", () => {
    expect(tempoProfile("full", 3).title).toContain("Tourpro");
    expect(tempoProfile("short", 2).title).toContain("närspel");
    expect(tempoProfile("putt", 2).title).toContain("puttrytm");
    expect(tempoProfile("full", 4).title).toContain("Utdragen");
  });
  it("byter bara förhållandet utan att ändra hela svingtiden", () => {
    const initial = tempoTiming("full", 1.07, 3);
    const subsequent = tempoTiming("full", 1.07, nextTempoRatio("full", 3));
    expect(initial.total).toBe(subsequent.total);
    expect(initial.back).not.toEqual(subsequent.back);
  });

  it("skiljer tempo (3:1) från hastighet (total tid) för full sving", () => {
    const t = tempoTiming("full", 1.2, 3);
    expect(t.ratio).toBe(3);
    expect(t.back).toBeCloseTo(.9, 8);
    expect(t.down).toBeCloseTo(.3, 8);
    expect(t.total).toBeCloseTo(1.2, 8);
  });
  it("tempoändring bibehåller total svingtid", () => {
    const slowTransition = tempoTiming("full", 1.07, 2);
    const traditional = tempoTiming("full", 1.07, 3);
    const fastTransition = tempoTiming("full", 1.07, 4);
    expect(slowTransition.total).toBe(traditional.total);
    expect(fastTransition.total).toBe(traditional.total);
    expect(slowTransition.down).toBeGreaterThan(fastTransition.down);
  });
  it("hastighetsändring behåller tempoförhållandet", () => {
    const a = tempoTiming("putt", 1.35, 2);
    const b = tempoTiming("putt", .85, 2);
    expect(a.ratio).toBe(b.ratio);
    expect(a.back / a.down).toBeCloseTo(2, 8);
    expect(b.back / b.down).toBeCloseTo(2, 8);
  });
  it("har visuell follow-through efter impact", () => {
    const t = tempoTiming("full", 1.07);
    expect(t.follow).toBeGreaterThan(0);
    expect(t.total + t.follow).toBeGreaterThan(t.total);
  });
  it("migrerar v1 baksvingstider till total tid utan att tappa inställningarna", () => {
    const cfg = normalizeTempo({ mode: "putt", speeds: { putt: .7, full: .8 }, sound: "click", volume: .5 });
    expect(cfg.mode).toBe("putt");
    expect(cfg.durations.full).toBe(1.07);
    expect(cfg.durations.putt).toBe(1.05);
    expect(cfg.ratios.full).toBe(3);
    expect(cfg.ratios.putt).toBe(2);
    expect(cfg.sound).toBe("click");
    expect(cfg.volume).toBe(.5);
  });
  it("normaliserar ofullständiga och ogiltiga inställningar", () => {
    const cfg = normalizeTempo({ mode: "putt", durations: { putt: 400, full: .8 },
      ratios: { full: 99, putt: 2.5 }, volume: 9, sound: "broken", count: 123, delay: 15 });
    expect(cfg.durations.putt).toBe(DEFAULT_TEMPO.durations.putt);
    expect(cfg.durations.full).toBe(.8);
    expect(cfg.ratios.putt).toBe(2.5);
    expect(cfg.ratios.full).toBe(3);
    expect(cfg.volume).toBe(1);
    expect(cfg.sound).toBe("soft");
    expect(cfg.count).toBe(10);
    expect(cfg.delay).toBe(3);
    expect(cfg.haptics).toBe(false);
  });
  it("ger separata kopior av standardinställningarna", () => {
    const cfg = normalizeTempo(null);
    cfg.durations.full = .8;
    cfg.ratios.full = 2;
    expect(DEFAULT_TEMPO.durations.full).toBe(1.07);
    expect(DEFAULT_TEMPO.ratios.full).toBe(3);
  });
});
