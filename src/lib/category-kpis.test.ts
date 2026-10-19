import { afterEach, describe, expect, it, vi } from "vitest";
import { driveMetrics, latestAverage, loadAnalysisHistory, metricSeries } from "./analysis-history";
import { categoryKpis } from "./category-kpis";

const storage = (data: Record<string, unknown>) => {
  const localStorage = { getItem: (key: string) => JSON.stringify(data[key] ?? []) };
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", { localStorage });
};
afterEach(() => vi.unstubAllGlobals());

const tee = (at: number, distance: number, laterals: number[]) => ({
  at,
  shots: laterals.map((lateral) => ({ distance, lateral, side: "right" })),
});

describe("off-tee nyckeltal", () => {
  it("räknar fairway (≤16 m) och OB (>28 m) från uppmätt sidled", () => {
    const m = driveMetrics([
      { distance: 200, lateral: 16 },
      { distance: 220, lateral: -20 },
      { distance: 240, lateral: 28.5 },
    ])!;
    expect(m.avgDrive).toBe(220);
    expect(m.fairwayPct).toBeCloseTo(33.33, 1);
    expect(m.obPct).toBeCloseTo(33.33, 1);
  });

  it("använder bara de senaste fem testpassen, inte alla", () => {
    storage({
      "sg4-offtee-three-shot-v1": [1, 2, 3, 4, 5, 6].map((i) => tee(i * 1000, i === 1 ? 100 : 200, [0, 0, 0])),
    });
    const rows = loadAnalysisHistory("driving", null);
    expect(rows).toHaveLength(6);
    expect(latestAverage(rows, "avgDrive")).toEqual({ value: 200, count: 5 });
  });

  it("visar korrekt antal när färre än fem pass finns", () => {
    storage({ "sg4-offtee-three-shot-v1": [tee(1000, 210, [0, 30, 5]), tee(2000, 230, [0, 0, 0])] });
    const k = categoryKpis("driving", (kind) => loadAnalysisHistory(kind, null));
    expect(k.find((x) => x.def.id === "avgDrive")).toMatchObject({ value: 220, count: 2 });
  });
});

describe("tom data och mätvärdestyp", () => {
  it("ger inget värde (aldrig 0/NaN) när källan saknas", () => {
    storage({});
    for (const slug of ["driving", "approach", "around-the-green", "puttning"] as const)
      for (const kpi of categoryKpis(slug, (kind) => loadAnalysisHistory(kind, null)))
        expect(kpi).toMatchObject({ value: undefined, count: 0 });
  });

  it("Ball Speed-serien visar uppmätt fart i mph, inte HCP", () => {
    storage({
      "sg4-speed-course-v1:guest": {
        history: [{ id: "a", finishedAt: 5000, holes: [[{ ballSpeed: 150 }], [{ ballSpeed: 160 }], [{ ballSpeed: 170 }]], reference: 150 }],
      },
    });
    const rows = loadAnalysisHistory("speed", null);
    if (rows.length) expect(metricSeries(rows, "ballSpeed")).toEqual([{ time: 5000, value: 160 }]);
  });

  it("hoppar över pass som saknar valt mätvärde", () => {
    expect(metricSeries([{ time: 1, hcp: 5 }, { time: 2, hcp: 4, metrics: { pei: 7 } }], "pei")).toEqual([{ time: 2, value: 7 }]);
  });
});
