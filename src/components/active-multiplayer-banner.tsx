"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Flame, Target } from "lucide-react";
import {
  buildChallenge,
  challengeStreaks,
  ensureTodayRecord,
  loadDailyChallengeState,
  type DailyChallengeRecord,
} from "@/lib/daily-challenge";

function getChallengeCopy(record: DailyChallengeRecord) {
  const streaks = challengeStreaks(loadDailyChallengeState());

  if (record.status === "won") {
    return {
      detail: "Klar för idag",
      badge: streaks.daily > 0 ? `🔥 ${streaks.daily}` : "Klar",
      completed: true,
    };
  }

  if (record.status === "lost") {
    return {
      detail: "Genomförd för idag",
      badge: streaks.daily > 0 ? `🔥 ${streaks.daily}` : "Klar",
      completed: true,
    };
  }

  if (record.selected) {
    const challenge = buildChallenge(record.selected);
    return {
      detail: `${challenge.label} · ${challenge.shortTask}`,
      badge: `${record.successes}/${record.target}`,
      completed: false,
    };
  }

  return {
    detail: "Välj 1 av 3 kategorier",
    badge: streaks.daily > 0 ? `🔥 ${streaks.daily}` : "Idag",
    completed: false,
  };
}

// The home page owns this card. The legacy root mount must not inject DOM
// into a route that may still be hydrating.
export function ActiveMultiplayerBanner({ inline = false }: { inline?: boolean }) {
  return inline ? <DailyChallengeHomeCard /> : null;
}
function DailyChallengeHomeCard() {
  const [record, setRecord] = useState<DailyChallengeRecord | null>(null);
  useEffect(() => {
    const refresh = () => setRecord(ensureTodayRecord().record);
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);

  const copy = useMemo(() => (record ? getChallengeCopy(record) : null), [record]);

  if (!copy) return null;

  return (
    <section className="mt-2.5">
      <Link
        to="/daily-challenge"
        className={`group flex min-h-[66px] items-center gap-3 rounded-[22px] border px-3.5 py-2.5 shadow-[0_10px_28px_-22px_rgba(15,23,42,.30)] transition-transform active:scale-[.99] ${
          copy.completed
            ? "border-emerald-200/80 bg-emerald-50/70"
            : "border-amber-200/80 bg-gradient-to-r from-amber-50/80 via-card to-emerald-50/55"
        }`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] border ${copy.completed ? "border-emerald-200 bg-emerald-100/80 text-emerald-700" : "border-amber-200 bg-amber-100/80 text-amber-700"}`}
        >
          {copy.completed ? (
            <Flame className="h-[18px] w-[18px]" />
          ) : (
            <Target className="h-[18px] w-[18px]" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">
            Dagens Challenge
          </span>
          <span className="mt-0.5 block truncate text-[13px] font-semibold text-foreground/78">
            {copy.detail}
          </span>
        </span>

        <span className="shrink-0 rounded-full border border-white/80 bg-white/72 px-2 py-1 text-[10px] font-black text-foreground/70 shadow-sm">
          {copy.badge}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-active:translate-x-0.5" />
      </Link>
    </section>
  );
}
