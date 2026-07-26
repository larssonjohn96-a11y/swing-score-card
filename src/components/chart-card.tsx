import { useEffect, useState, type ReactNode } from "react";
import { Maximize2, X } from "lucide-react";

/** Kort med graf som kan expanderas till helskärm. */
export function ChartCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [full]);

  return (
    <>
      <section className="mt-6 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">{title}</h2>
          <button
            type="button"
            onClick={() => setFull(true)}
            aria-label="Visa grafen i helskärm"
            className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setFull(true)}
          aria-label="Visa grafen i helskärm"
          className="mt-4 block h-56 w-full cursor-zoom-in"
        >
          {children}
        </button>
        {footer ? <div className="mt-3">{footer}</div> : null}
      </section>

      {full ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">{title}</h2>
            <button
              type="button"
              onClick={() => setFull(false)}
              aria-label="Stäng helskärm"
              className="rounded-full border border-border p-2 text-muted-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 min-h-0 flex-1">{children}</div>
          {footer ? <div className="mt-3 shrink-0">{footer}</div> : null}
        </div>
      ) : null}
    </>
  );
}
