import { Star } from "lucide-react";
export function PuttStars({
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
        <Star
          key={i}
          aria-hidden
          className={`${large ? "h-12 w-12" : "h-4 w-4"} ${i < count ? "putt-star fill-amber-400 text-amber-500" : zero ? "fill-slate-500 text-slate-600" : "fill-white/70 text-slate-300"}`}
          style={
            i < count
              ? {
                  animationDelay: `${i * 170}ms`,
                  filter: count === max ? "drop-shadow(0 0 5px #fbbf24)" : undefined,
                }
              : undefined
          }
        />
      ))}
    </span>
  );
}
export function PuttMilestones({ stars }: { stars: number }) {
  const next = [4, 8, 12, 16].find((n) => n > stars);
  return (
    <section className="rounded-3xl border border-amber-100 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">Stjärntrappan</h2>
        <strong className="text-amber-600">{stars} / 16 ★</strong>
      </div>
      <div className="mt-3 flex items-end gap-2" aria-label="Milstolpar: 4, 8, 12 och 16 stjärnor">
        {[4, 8, 12, 16].map((n, i) => (
          <div
            key={n}
            className={`flex flex-1 items-center justify-center rounded-t-xl font-black ${stars >= n ? "bg-amber-400 text-amber-950" : "bg-slate-100 text-slate-400"}`}
            style={{ height: 28 + i * 12 }}
          >
            {n} ★
          </div>
        ))}
      </div>
      <p className="mt-2 text-sm text-slate-500">
        {next ? `${next - stars} stjärnor till nästa steg` : "Full pott – alla 16 stjärnor!"}
      </p>
    </section>
  );
}
