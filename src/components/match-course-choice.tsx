import { Flag, Check } from "lucide-react";
export function MatchCourseChoice({
  selected,
  onSelect,
}: {
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-sm font-bold text-slate-600">På banan</h2>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={`relative flex w-full items-center gap-4 overflow-hidden rounded-[26px] border p-5 text-left ${selected ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/30" : "border-slate-200 bg-white"}`}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
          <Flag className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xl font-bold">Spela på bana</span>
          <span className="mt-1 block text-sm leading-relaxed text-slate-600">
            Hela hål på korthålsbana eller vanlig bana.
          </span>
        </span>
        {selected && <Check className="h-5 w-5 shrink-0 text-blue-600" />}
      </button>
    </section>
  );
}
