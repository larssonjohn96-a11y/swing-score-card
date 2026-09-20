import { STAR_STEPS, starLevel } from "@/lib/driver-course";
import { Star } from "lucide-react";
export function DriverStars({
  count = 0,
  max = 3,
  large = false,
  zero = false,
}: {
  count?: number;
  max?: number;
  large?: boolean;
  zero?: boolean;
}) {
  return (
    <span
      className={`inline-flex justify-center ${large ? "gap-2" : "gap-0.5"}`}
      aria-label={`${count} av ${max} stjärnor`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`relative inline-block shrink-0 ${large ? "h-12 w-12" : "h-4 w-4"} ${i < count ? "driver-star" : ""}`}
          style={{
            animationDelay: `${i * 170}ms`,
            filter: count === max ? "drop-shadow(0 0 5px #fbbf24)" : undefined,
          }}
        >
          <Star
            aria-hidden
            className={`h-full w-full ${zero ? "fill-slate-500 text-slate-600" : "fill-white/70 text-slate-300"}`}
          />
          <span
            className="absolute inset-y-0 left-0 overflow-hidden"
            style={{ width: `${Math.max(0, Math.min(1, count - i)) * 100}%` }}
          >
            <Star
              aria-hidden
              className={`${large ? "h-12 w-12" : "h-4 w-4"} max-w-none fill-amber-400 text-amber-500`}
            />
          </span>
        </span>
      ))}
    </span>
  );
}
export function DriverMilestones({ stars, previous }: { stars: number; previous?: number }) {
  const next = STAR_STEPS.find((n) => n > stars);
  return (
    <section className="rounded-3xl border border-amber-100 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">
          {previous !== undefined ? `Ny nivå · ${starLevel(stars)} av 6!` : "Stjärntrappan"}
        </h2>
        <strong className="text-amber-600">{stars} / 18 ★</strong>
      </div>
      <div
        className="mt-3 flex items-end gap-2"
        aria-label="Milstolpar: 3, 6, 9, 12, 15 och 18 stjärnor"
      >
        {STAR_STEPS.map((n, i) => (
          <div
            key={n}
            className={`flex flex-1 items-center justify-center rounded-t-xl text-sm font-black ${previous !== undefined && previous < n && stars >= n ? "driver-level-up" : ""} ${stars >= n ? "bg-amber-400 text-amber-950" : "bg-slate-100 text-slate-400"}`}
            style={{ height: 28 + i * 9, animationDelay: `${i * 130}ms` }}
          >
            {n} ★
          </div>
        ))}
      </div>
      <p className="mt-2 text-sm text-slate-500">
        {next ? `${next - stars} stjärnor till nästa steg` : "Full pott – alla 18 stjärnor!"}
      </p>
    </section>
  );
}
