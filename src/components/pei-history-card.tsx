import { precisionScoreFromPei } from "@/lib/precision-score";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { peiHistoryRows } from "@/lib/approach-history";
import type { FocusKind, PeiSession } from "@/lib/pei-ranking";
const fmt = (value: number | null, unit: string) =>
  value === null ? "–" : `${value.toFixed(1).replace(".", ",")} ${unit}`;
export function PeiHistoryCard({
  sessions,
  kind,
  preview = false,
}: {
  sessions: PeiSession[];
  kind: FocusKind;
  preview?: boolean;
}) {
  const [limit, setLimit] = useState(10);
  const rows = peiHistoryRows(sessions).sort((a, b) => b.date.localeCompare(a.date));
  const recentTen = rows.slice(0, 10);
  const topCount = recentTen.length < 5 ? 1 : recentTen.length < 8 ? 2 : 3;
  const topIds = new Set(
    [...recentTen]
      .sort((a, b) => (a.pei ?? Infinity) - (b.pei ?? Infinity))
      .slice(0, topCount)
      .map((r) => r.id),
  );
  return (
    <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white text-slate-950 shadow-sm">
      <div className="flex items-center justify-between border-b border-blue-100 p-4">
        <div>
          <h2 className="text-lg font-black">Historik</h2>
          <p className="text-sm text-slate-500">Snitt från flaggan · Precision Score</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
          {rows.length}
        </span>
      </div>
      {rows.length ? (
        <>
          <div className="grid grid-cols-[56px_minmax(0,1fr)_80px] gap-2 border-b border-slate-100 px-4 py-2.5 text-[10px] font-black uppercase tracking-[.12em] text-slate-400">
            <span>Datum</span>
            <span>Resultat</span>
            <span className="text-right">Score</span>
          </div>
          {rows.slice(0, preview ? 5 : limit).map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[56px_minmax(0,1fr)_80px] items-center gap-2 border-b border-slate-100 px-4 py-3.5 last:border-0"
            >
              <span className="text-[12px] font-semibold text-slate-500">
                {new Date(row.date).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
              </span>
              <div className="min-w-0">
                <strong className="text-[17px] tabular-nums">{fmt(row.meters, "m")}</strong>
                {topIds.has(row.id) && (
                  <span className="mt-1 block w-fit rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">
                    Toppresultat
                  </span>
                )}
              </div>
              <strong className="text-right text-sm tabular-nums text-blue-600">
                {fmt(row.pei === null ? null : precisionScoreFromPei(row.pei), "/100")}
              </strong>
            </div>
          ))}
        </>
      ) : (
        <p className="px-4 py-7 text-center text-sm text-slate-500">
          Genomför ditt första test så visas resultaten här.
        </p>
      )}
      {preview && rows.length > 0 ? (
        <Link
          to={kind === "wedge" ? "/approach-pei-wedge-historik" : "/approach-pei-iron-historik"}
          className="block border-t border-slate-100 p-3 text-center text-xs font-bold text-blue-600"
        >
          Se alla resultat →
        </Link>
      ) : rows.length > limit && !preview ? (
        <button
          onClick={() => setLimit((n) => n + 20)}
          className="w-full border-t border-slate-100 p-3 text-sm font-bold text-slate-600"
        >
          Se fler
        </button>
      ) : null}
    </section>
  );
}
