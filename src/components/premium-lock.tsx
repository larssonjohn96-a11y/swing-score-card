import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

/**
 * "Preview before paywall": visar en dämpad/nedtonad förhandsgranskning av
 * premiuminnehållet (children) med en gradient-fade nedåt, plus en diskret
 * SG4+-rad som länkar till paywallen. Aldrig en full, blockerande skärm.
 */
export function PremiumLock({
  label,
  children,
}: {
  /** t.ex. "Se hela din utveckling" */
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none max-h-28 overflow-hidden opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]">
        {children}
      </div>
      <Link
        to="/premium"
        className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary"
      >
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
          SG4+
        </span>
        {label}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/** Kompakt inline-variant utan förhandsvisat innehåll, för korta rader. */
export function PremiumLockLine({ label }: { label: string }) {
  return (
    <Link to="/premium" className="flex items-center gap-1.5 text-xs font-semibold text-primary">
      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
        SG4+
      </span>
      {label}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

/** Liten badge att sätta bredvid rubriker på premiumfunktioner. */
export function PlusBadge() {
  return (
    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
      SG4+
    </span>
  );
}
