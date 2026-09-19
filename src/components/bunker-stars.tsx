import { STAR_STEPS, starLevel, formatStars } from "@/lib/bunker-course";
import { Star } from "lucide-react";
export function BunkerStars({
  count = 0,
  large = false,
  zero = false,
}: {
  count?: number;
  large?: boolean;
  zero?: boolean;
}) {
  return (
    <span className="inline-flex gap-2" aria-label={`${formatStars(count)} av 3 stjärnor`}>
      {[0, 1, 2].map((i) => {
        const fill = Math.max(0, Math.min(1, count - i));
        return (
          <span key={i} className={`relative block ${large ? "h-11 w-11" : "h-5 w-5"}`}>
            <Star
              className={`h-full w-full ${zero ? "fill-slate-500 text-slate-600" : "fill-white text-slate-300"}`}
            />
            <Star
              className={`absolute inset-0 h-full w-full fill-amber-400 text-amber-500 transition-[clip-path] duration-500 motion-reduce:transition-none ${fill === 1 ? "bunker-star-pop" : ""}`}
              style={{
                clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)`,
                filter: count === 3 ? "drop-shadow(0 0 4px #fbbf24)" : undefined,
              }}
            />
          </span>
        );
      })}
    </span>
  );
}
export function BunkerMilestones({ stars, previous }: { stars: number; previous?: number }) {
  const next = STAR_STEPS.find((n) => n > stars);
  return (
    <section className="rounded-3xl border border-amber-100 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">
          {previous !== undefined ? `Ny nivå · ${starLevel(stars)} av 6!` : "Stjärntrappan"}
        </h2>
        <strong className="text-amber-600">{formatStars(stars)} / 6 ★</strong>
      </div>
      <div
        className="mt-3 flex items-end gap-2"
        aria-label="Milstolpar: 1, 2, 3, 4, 5 och 6 stjärnor"
      >
        {STAR_STEPS.map((n, i) => (
          <div
            key={n}
            className={`flex flex-1 items-center justify-center rounded-t-xl text-sm font-black ${previous !== undefined && previous < n && stars >= n ? "bunker-level-up" : ""} ${stars >= n ? "bg-amber-400 text-amber-950" : "bg-slate-100 text-slate-400"}`}
            style={{ height: 28 + i * 9, animationDelay: `${i * 130}ms` }}
          >
            {n} ★
          </div>
        ))}
      </div>
      <p className="mt-2 text-sm text-slate-500">
        {next
          ? `${formatStars(next - stars)} stjärnor till nästa steg`
          : "Full pott – alla 6 stjärnor!"}
      </p>
    </section>
  );
}
