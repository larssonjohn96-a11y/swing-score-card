import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { findCategory, type Category } from "@/lib/categories";
import { findProgressTest, summarize, type ProgressSummary } from "@/lib/progress";
import { ChartCard } from "@/components/chart-card";

export const Route = createFileRoute("/framsteg/$slug/$test")({
  loader: ({ params }) => {
    const category = findCategory(params.slug);
    const test = findProgressTest(params.slug, params.test);
    if (!category || !test) throw notFound();
    return { category, testId: test.id, testTitle: test.title };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Testet hittades inte" }, { name: "robots", content: "noindex" }] };
    }
    return {
      meta: [
        { title: `Framsteg – ${loaderData.testTitle} | SG4` },
        {
          name: "description",
          content: `Följ dina resultat i ${loaderData.testTitle} över tid med graf, bästa resultat och utveckling.`,
        },
        { property: "og:title", content: `Framsteg – ${loaderData.testTitle}` },
        {
          property: "og:description",
          content: `Resultatutveckling för ${loaderData.testTitle}.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: TestNotFound,
  component: TestProgressPage,
});

function TestNotFound() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-16">
      <h1 className="font-display text-4xl">Testet finns inte</h1>
      <Link
        to="/framsteg"
        className="mt-6 inline-block rounded-full border border-border px-4 py-2 text-sm"
      >
        Till framsteg
      </Link>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl leading-none">{value}</p>
    </div>
  );
}

function TestProgressPage() {
  const { category, testId } = Route.useLoaderData() as { category: Category; testId: string };
  const [data, setData] = useState<ProgressSummary | null>(null);

  useEffect(() => {
    const test = findProgressTest(category.slug, testId);
    if (test) setData(summarize(test));
  }, [category.slug, testId]);

  const test = data?.test ?? findProgressTest(category.slug, testId)!;
  const points = data?.points ?? [];
  const fmt = (n: number) => `${n.toFixed(test.decimals)} ${test.unit}`.trim();

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-10">
      <Link
        to="/framsteg/$slug"
        params={{ slug: category.slug }}
        className="text-xs uppercase tracking-[0.25em] text-muted-foreground"
      >
        ← {category.title}
      </Link>
      <h1 className="mt-3 font-display text-4xl leading-none">{test.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {test.metric} · {test.higherIsBetter ? "högre är bättre" : "lägre är bättre"}
      </p>

      {points.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Inga resultat än. Kör testet så dyker grafen upp här.
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="Senast" value={fmt(data!.latest!)} />
            <Stat label="Bästa" value={fmt(data!.best!)} />
            <Stat
              label="Sedan start"
              value={`${data!.delta! >= 0 ? "+" : ""}${data!.delta!.toFixed(test.decimals)}`}
            />
          </div>

          <ChartCard title={`${test.metric} över tid`}>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => fmt(v)}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ul className="mt-6 space-y-2">
            {[...points].reverse().map((p, i) => (
              <li
                key={`${p.date}-${i}`}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm"
              >
                <span className="text-muted-foreground">{p.date}</span>
                <span className="font-display text-lg leading-none">{fmt(p.value)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <Link
        to={test.to}
        className="mt-8 inline-block rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
      >
        Kör testet
      </Link>
    </main>
  );
}
