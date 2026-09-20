import { driverDistancePotential, DRIVER_POTENTIAL_SOURCE } from "@/lib/driver-distance-potential";
export function SpeedDistancePotential({ ballSpeed }: { ballSpeed: number }) {
  const potential = driverDistancePotential(ballSpeed);
  if (!potential) return null;
  return (
    <section
      aria-label="Din driverpotential"
      className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-left"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
        Din driverpotential
      </p>
      <h2 className="mt-1 text-lg font-bold text-slate-900">
        {ballSpeed.toFixed(1).replace(/\.0$/, "").replace(".", ",")} mph i bollhastighet
      </h2>
      <p className="mt-1 text-sm text-slate-600">Utifrån ditt snabbaste slag</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-700">Carry</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-blue-700">
            ≈ {potential.carry}
            <span className="ml-1 text-lg">m</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Längd i luften</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-700">Totalt</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-blue-700">
            ≈ {potential.total}
            <span className="ml-1 text-lg">m</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Inklusive rull</p>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-600">
        Uppskattad potential med optimerad bollflykt. Vind, boll och markförhållanden påverkar
        längden.
      </p>
      <details className="mt-2 text-xs text-slate-500">
        <summary className="cursor-pointer py-1">Så uppskattas potentialen</summary>
        <p className="mt-2 leading-relaxed">
          Vi räknar om bollhastigheten med riktvärden från TrackMans carry-optimering med
          uppåtgående träff. Värdena avrundas till 5 meter. Rullen är en modelluppskattning, inte en
          uppmätt längd.
          {potential.extrapolated
            ? " Din hastighet ligger utanför tabellens intervall, så uppskattningen är extra osäker."
            : ""}{" "}
          <a className="underline" href={DRIVER_POTENTIAL_SOURCE} target="_blank" rel="noreferrer">
            Se underlaget
          </a>
          .
        </p>
      </details>
    </section>
  );
}
