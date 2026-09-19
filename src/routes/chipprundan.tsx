import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChipStationPractice } from "@/components/chip-station-practice";
import { useAuth } from "@/hooks/use-auth";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { supabase } from "@/integrations/supabase/client";
import { LIGHT_SURFACE } from "./8-bollar";

export const Route = createFileRoute("/chipprundan")({
  head: () => ({meta: [{title: "Chipprundan – Spela en runda | SG4"}]}),
  component: ChipRoundPage,
});
function ChipRoundPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("Du");
  useHideBottomNav(true);
  useEffect(() => {
    setName("Du");
    if (!user) return;
    let active = true;
    void supabase.from("profiles").select("display_name").eq("id",user.id).maybeSingle().then(({data}) => {if(active && data?.display_name)setName(data.display_name);});
    return () => {active=false;};
  }, [user?.id]);
  return <ChipStationPractice key={user?.id ?? "guest"} userId={user?.id ?? null} authLoading={loading} playerName={name} surface={LIGHT_SURFACE} onExit={() => void navigate({to:"/spela-runda"})} />;
}
