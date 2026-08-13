/** Runda, platta kategoriikoner för kategorilistan – samma illustrations-
 *  språk som testernas hero-illustrationer, men förenklade till en cirkel. */

export function DrivingCategoryIcon({ className = "h-14 w-14" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Utslag">
      <circle cx="32" cy="32" r="32" className="fill-primary/12" />
      <path d="M32 46 Q26 30 40 18" fill="none" className="stroke-foreground" strokeWidth="2.5" />
      <ellipse
        cx="41"
        cy="16"
        rx="7"
        ry="5"
        transform="rotate(-25 41 16)"
        className="fill-foreground"
      />
      <ellipse cx="32" cy="48" rx="3.5" ry="1.6" className="fill-foreground/30" />
      <circle cx="45" cy="24" r="2.2" className="fill-background" />
    </svg>
  );
}

export function ApproachCategoryIcon({ className = "h-14 w-14" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Inspel">
      <circle cx="32" cy="32" r="32" className="fill-primary/12" />
      <ellipse cx="36" cy="34" rx="20" ry="14" className="fill-primary/25" />
      <ellipse cx="36" cy="34" rx="12" ry="8" className="fill-primary/40" />
      <circle
        cx="20"
        cy="46"
        r="4"
        className="fill-background stroke-foreground/60"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function AroundGreenCategoryIcon({ className = "h-14 w-14" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Närspel">
      <circle cx="32" cy="32" r="32" className="fill-primary/12" />
      <ellipse cx="32" cy="30" rx="22" ry="15" className="fill-primary/30" />
      <path d="M14 40 Q24 30 20 44 Q34 50 44 40" className="fill-sand" />
      <line x1="34" y1="28" x2="34" y2="14" className="stroke-foreground" strokeWidth="1.6" />
      <path d="M34 14 L44 18 L34 22 Z" className="fill-flag" />
    </svg>
  );
}

export function PuttingCategoryIcon({ className = "h-14 w-14" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Puttning">
      <circle cx="32" cy="32" r="32" className="fill-primary/12" />
      <ellipse cx="32" cy="34" rx="21" ry="15" className="fill-primary/30" />
      <line x1="34" y1="30" x2="34" y2="16" className="stroke-foreground" strokeWidth="1.6" />
      <path d="M34 16 L44 20 L34 24 Z" className="fill-flag" />
      <circle cx="34" cy="30" r="2" className="fill-foreground" />
      <circle
        cx="20"
        cy="42"
        r="3.2"
        className="fill-background stroke-foreground/60"
        strokeWidth="1.2"
      />
    </svg>
  );
}
