import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type ActiveSession = {
  id: string;
  test_id: string;
  status: "active" | "completed" | "cancelled";
  current_step: number;
  total_steps: number;
  config?: Record<string, any>;
  members: Array<{ user_id: string; seat: number; display_name: string }>;
};

function titleFor(session: ActiveSession) {
  if (session.test_id === "match-play") {
    const category = session.config?.categoryTitle ?? session.config?.matchState?.categoryTitle ?? "Match";
    return `Match · ${category}`;
  }
  if (session.test_id === "eight-ball") return "8-bollar · Gruppspel";
  return "Pågående spel";
}

function peopleFor(session: ActiveSession) {
  return session.members.slice().sort((a, b) => a.seat - b.seat).map((m) => m.display_name).join(" · ");
}

function routeFor(session: ActiveSession) {
  if (session.test_id === "match-play") return `/match?session=${session.id}`;
  if (session.test_id === "eight-ball") return `/8-bollar-grupp/${session.id}`;
  return `/`;
}

export function ActiveMultiplayerBanner() {
  const { user } = useAuth();
  const location = useLocation();
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

  if (!session || session.status !== "active" || location.pathname.startsWith("/match")) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[5.8rem] z-40 mx-auto w-full max-w-md px-3">
      <Link
        to={routeFor(session) as any}
        className="pointer-events-auto flex items-center gap-3 rounded-[22px] border border-amber-300/90 bg-amber-50/95 px-3.5 py-3 shadow-[0_16px_38px_-20px_rgba(15,23,42,.45)] backdrop-blur-2xl transition-transform active:scale-[0.99]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-amber-300 shadow-sm">
          <Radio className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[9px] font-black uppercase tracking-[0.17em] text-amber-700">Pågående spel</span>
          <span className="mt-0.5 block truncate font-display text-lg leading-tight text-slate-950">{titleFor(session)}</span>
          <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-600">{peopleFor(session)}{progress ? ` · ${progress}` : ""}</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-700" />
      </Link>
    </div>
  );
}
