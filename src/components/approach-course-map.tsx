import { Coffee, Flag, TreePine } from "lucide-react";
import { COURSE_DISTANCES, holeStars, maxStars } from "@/lib/approach-course";
import { ApproachStars as Stars } from "./approach-stars";
const positions = [
  [16, 27],
  [48, 25],
  [83, 27],
  [83, 73],
  [49, 75],
  [16, 73],
];
export function ApproachCourseMap({
  holes,
  distances = COURSE_DISTANCES,
  cursor,
}: {
  holes: import("@/lib/approach-course").CourseShot[][];
  distances?: readonly number[];
  cursor: number | "halfway" | null;
}) {
  const point =
    cursor === "halfway" ? [12, 50] : typeof cursor === "number" ? positions[cursor] : null;
  return (
    <div
      className="relative my-4 h-[240px] overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-100 via-green-50 to-emerald-100"
      aria-label="Golfbanan: första tre, Halfway House, sista tre"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 320 310"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path
          d="M51 68 C73 87 101 25 154 43 S237 40 266 78 Q305 121 232 139 L160 155 L228 177 Q308 204 266 236 C234 218 207 282 157 264 S86 206 51 233"
          fill="none"
          stroke="#86b899"
          strokeWidth="25"
          strokeLinecap="round"
          opacity=".25"
        />
        <path
          d="M51 68 C73 87 101 25 154 43 S237 40 266 78 Q305 121 232 139 L160 155 L228 177 Q308 204 266 236 C234 218 207 282 157 264 S86 206 51 233"
          fill="none"
          stroke="#fffdf0"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="2 9"
        />
      </svg>
      <TreePine
        aria-hidden="true"
        className="absolute left-[5%] top-[44%] h-8 w-8 fill-emerald-300 text-emerald-700"
      />
      <TreePine
        aria-hidden="true"
        className="absolute right-[3%] top-[43%] h-10 w-10 fill-emerald-400/60 text-emerald-700"
      />
      {distances.map((d, i) => (
        <div
          key={i}
          className="approach-map-hole absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
          style={{ left: `${positions[i][0]}%`, top: `${positions[i][1]}%` }}
        >
          <span
            aria-label={`Hål ${i + 1}, ${d} meter`}
            className={`relative flex h-8 w-16 items-center justify-center gap-1 ${cursor === i ? "text-emerald-900" : "text-emerald-700"}`}
          >
            <Flag className="h-7 w-7 fill-yellow-400 text-yellow-600" />
            <strong className="text-lg">{i + 1}</strong>
          </span>
          <span className="whitespace-nowrap rounded-full bg-white/75 px-2 text-sm font-bold text-emerald-950">
            {d} m
          </span>
          <Stars
            count={holeStars(holes[i] ?? [], i, distances)}
            max={maxStars(i)}
            zero={holes[i]?.length === 1 && holeStars(holes[i], i, distances) === 0}
          />
        </div>
      ))}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-xl border border-emerald-200 bg-white/95 px-2 py-1 shadow-sm">
        <Coffee className="h-4 w-4 shrink-0 text-amber-700" />
        <span className="text-xs font-bold">Halfway House</span>
      </div>
      {point && (
        <div
          className="approach-map-golfer pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full transition-[left,top] duration-700 ease-in-out motion-reduce:transition-none"
          style={{
            left: `calc(${point[0]}% + 24px)`,
            top: `calc(${point[1]}% - 16px)`,
          }}
          aria-label={
            cursor === "halfway" ? "Du är vid Halfway House" : `Du är vid hål ${Number(cursor) + 1}`
          }
        >
          <svg
            role="img"
            aria-label="Golfare"
            width="32"
            height="38"
            viewBox="0 0 32 38"
            className="drop-shadow-sm"
          >
            <circle cx="13" cy="7" r="4" fill="#f4c7a1" />
            <path d="M8 5q1-6 8-2l3 3H8" fill="#2563eb" />
            <path d="M12 13l6 7-4 7-7-4 1-9z" fill="#2563eb" />
            <path
              d="M15 15l7 9M10 16l10 9"
              stroke="#f4c7a1"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path d="M9 25l-3 10m8-9 2 9" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
            <path d="M21 24l7 10h-5" fill="none" stroke="#475569" strokeWidth="1.5" />
            <circle cx="24" cy="36" r="1.5" fill="white" stroke="#94a3b8" />
          </svg>
        </div>
      )}
    </div>
  );
}
