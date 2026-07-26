"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Home, Play, X } from "lucide-react";

import { CATEGORIES } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const START_TEST_CATEGORIES = CATEGORIES.filter((c) => c.tests.length > 0).slice(
  0,
  4,
);

export function BottomNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-full w-full max-w-md items-center justify-around px-2">
          <Link
            to="/"
            className="flex flex-col items-center gap-0.5 px-4 py-2 text-muted-foreground transition-colors hover:text-foreground active:scale-95"
            activeProps={{ className: "text-foreground" }}
            activeOptions={{ exact: true }}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">
              Hem
            </span>
          </Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="relative -mt-7 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_-6px_var(--primary)] transition-transform active:scale-95"
                aria-label="Starta test"
              >
                <Play className="h-5 w-5 fill-current" />
                <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide leading-none">
                  Test
                </span>
              </button>
            </SheetTrigger>

            <SheetContent side="bottom" className="rounded-t-3xl pb-8 pt-6">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-center text-lg font-display tracking-wide">
                  Välj kategori
                </SheetTitle>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-3">
                {START_TEST_CATEGORIES.map((c) => (
                  <Link
                    key={c.slug}
                    to="/kategori/$slug"
                    params={{ slug: c.slug }}
                    onClick={() => setOpen(false)}
                    className="flex flex-col rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary active:scale-95"
                  >
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                      {c.subtitle}
                    </span>
                    <span className="mt-1 font-display text-2xl leading-none">
                      {c.title}
                    </span>
                    <span className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {c.description}
                    </span>
                  </Link>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="mx-auto mt-6 flex items-center gap-1 text-muted-foreground"
              >
                <X className="h-4 w-4" />
                Stäng
              </Button>
            </SheetContent>
          </Sheet>

          {/* Spacer to keep home and start button balanced */}
          <div className="w-14" />
        </div>
      </nav>
    </>
  );
}
