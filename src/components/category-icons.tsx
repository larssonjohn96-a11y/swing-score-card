/**
 * Platta, handritade kategoriikoner för Tester-sidan.
 * Samma geometri i alla fyra: 64x64-ruta, blek grön cirkel som botten,
 * mörkgröna siluetter, samma stroke-bredd (2.4) och samma detaljnivå.
 */

type IconProps = { className?: string };

const S = 2.4;

function IconFrame({ className, label, children }: IconProps & { label: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={label}>
      <circle cx="32" cy="32" r="32" className="fill-primary/10" />
      <g
        className="stroke-primary"
        strokeWidth={S}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {children}
      </g>
    </svg>
  );
}

/** Approach: green med flagga + boll. */
export function ApproachCategoryIcon({ className = "h-14 w-14" }: IconProps) {
  return (
    <IconFrame className={className} label="Approach – inspel mot green">
      <ellipse cx="32" cy="42" rx="19" ry="9" />
      <path d="M32 42V16" />
      <path d="M32 17h11l-3.5 5 3.5 5H32" className="fill-primary" />
      <circle cx="20" cy="47" r="3.2" />
    </IconFrame>
  );
}

/** Putting: putterhuvud + boll på green. */
export function PuttingCategoryIcon({ className = "h-14 w-14" }: IconProps) {
  return (
    <IconFrame className={className} label="Putting – på greenen">
      <ellipse cx="32" cy="44" rx="19" ry="8" />
      <path d="M38 14v20" />
      <path d="M26 34h13v5H26z" className="fill-primary" />
      <circle cx="17" cy="44" r="3.2" />
    </IconFrame>
  );
}

/** Off the Tee: driverhuvud + boll på tee. */
export function DrivingCategoryIcon({ className = "h-14 w-14" }: IconProps) {
  return (
    <IconFrame className={className} label="Off the Tee – utslag">
      <path d="M41 13L30 31" />
      <path d="M24 30c5-4 11-2 12 4s-4 10-9 8-7-8-3-12z" className="fill-primary" />
      <circle cx="45" cy="41" r="3.2" />
      <path d="M45 45v5" />
      <path d="M36 50h18" />
    </IconFrame>
  );
}

/** Shortgame: wedge + boll med bunkerkant. */
export function AroundGreenCategoryIcon({ className = "h-14 w-14" }: IconProps) {
  return (
    <IconFrame className={className} label="Shortgame – runt greenen">
      <path d="M40 13L31 30" />
      <path d="M24 29h13l-2 9H22z" className="fill-primary" />
      <circle cx="18" cy="43" r="3.2" />
      <path d="M10 52c5-6 12-6 16-2s11 3 15-3" />
    </IconFrame>
  );
}
