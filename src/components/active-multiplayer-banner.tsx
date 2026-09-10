import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type ActiveSession = {
  id: string;
  test_id: string;
  status: "active" | "completed" | "cancelled";
  current_step: number;
  total_steps: number;
  config?: Record<string, unknown>;
  members: Array<{ user_id: string; seat: number; display_name: string }>;
};

function titleFor(session: ActiveSession) {
  const names = session.members.slice().sort((a, b) => a.seat - b.seat).map((m) => m.display_name);
  if (session.test_id === "match-play") return `Match Play · ${names.join(" vs ")}`;
  if (session.test_id === "eight-ball") return `8-bollar · ${names.join(" · ")}`;
  return `Pågående spel · ${names.join(" · ")}`;
}

function routeFor(session: ActiveSession) {
  if (session.test_id === "match-play") return `/match?session=${session.id}`;
  if (session.test_id === "eight-ball") return `/8-bollar-grupp/${session.id}`;
  return `/`;
}

export function ActiveMultiplayerBanner() {
  const { user } = useAuth();
  const [session, setSession] = useState<ActiveSession | null>(null);

  useEffect(() => {
    if (!user) { setSession(null); return; }
    let cancelled = false;
    const load = async () => {
      const { data, error } = await (supabase as any).rpc("get_my_active_multiplayer_session");
      if (!cancelled && !error) setSession((data as ActiveSession | null) ?? null);
    };
    void load();
    const channel = (supabase as any)
      .channel(`active-multiplayer-banner-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_session_members" }, load)
      .subscribe();
    return () => { cancelled = true; void (supabase as any).removeChannel(channel); };
  }, [user]);

  const progress = useMemo(() => {
    if (!session || !session.total_steps) return null;
    return `${Math.min(session.current_step + 1, session.total_steps)} av ${session.total_steps}`;
  }, [session]);

  if (!session || session.status !== "active") return null;

  return (
    <Link
      to={routeFor(session) as any}
      className="mt-4 flex items-center gap-3 rounded-3xl border border-emerald-300/70 bg-emerald-50/90 px-4 py-4 shadow-[0_12px_28px_-18px_rgba(16,185,129,.45)] transition-transform active:scale-[0.99] dark:border-emerald-700/60 dark:bg-emerald-950/30"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
        <Radio className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Pågående spel</span>
        <span className="mt-0.5 block truncate font-display text-xl leading-tight text-foreground">{titleFor(session)}</span>
        {progress ? <span className="mt-1 block text-xs text-muted-foreground">{progress}</span> : null}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
    </Link>
  );
}
