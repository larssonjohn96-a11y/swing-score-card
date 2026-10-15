import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useState } from "react";
import { loadPeiSessions, type FocusKind, type PeiSession } from "@/lib/pei-ranking";
import { peiHistoryRows } from "@/lib/approach-history";
import { ApproachLevelSummary } from "@/components/approach-level-summary";
import { PeiHistoryCard } from "@/components/pei-history-card";
import { SESSIONS_CHANGED_EVENT } from "@/lib/sessions/sync";
export function PeiFocusHistory({ kind }: { kind: FocusKind }) {
  const title = kind === "wedge" ? "Korta inspel" : "Inspel järn";
  const [sessions, setSessions] = useState<PeiSession[]>([]);
  useEffect(() => {
    const refresh = () =>
      setSessions(loadPeiSessions(kind).sort((a, b) => a.date.localeCompare(b.date)));
    refresh();
    window.addEventListener(SESSIONS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SESSIONS_CHANGED_EVENT, refresh);
  }, [kind]);
  const data = sessions.map((s, i) => ({ n: i + 1, pei: Number(s.pei.toFixed(2)) }));
  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-4 bg-slate-50 px-4 pb-16 pt-4 text-slate-950">
      <Link
        to={kind === "wedge" ? "/approach-pei-wedge" : "/approach-pei-iron"}
        data-local-navigation
        aria-label={`Tillbaka till ${title}`}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-[.15em] text-blue-600">{title}</p>
        <h1 className="mt-1 text-3xl font-black">Resultat över tid</h1>
      </div>
      <ApproachLevelSummary rows={peiHistoryRows(sessions)} />
      <PeiHistoryCard sessions={sessions} kind={kind} />
      {sessions.length > 0 && (
        <section className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
          <h2 className="font-black">PEI-utveckling</h2>
          <p className="mt-1 text-xs text-slate-500">Lägre procent är bättre</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="n" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                <Tooltip
                  formatter={(v) => [`${Number(v).toFixed(1).replace(".", ",")} %`, "PEI"]}
                />
                <Line
                  type="monotone"
                  dataKey="pei"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </main>
  );
}
