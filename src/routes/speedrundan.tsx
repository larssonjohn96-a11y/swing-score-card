import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SpeedRoundGame } from "@/components/speed-round-game";
import { useAuth } from "@/hooks/use-auth";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/speedrundan")({
  head: () => ({ meta: [{ title: "Ball Speed Challenge | SG4" }] }),
  component: SpeedRoundPage,
});
function SpeedRoundPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("Du");
  useHideBottomNav(true);
  useEffect(() => {
    setName("Du");
    if (!user) return;
    let active = true;
    void supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.display_name) setName(data.display_name);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);
  return (
    <SpeedRoundGame
      key={user?.id ?? "guest"}
      userId={user?.id ?? null}
      authLoading={loading}
      playerName={name}
      onExit={() => void navigate({ to: "/spela-runda" })}
    />
  );
}
