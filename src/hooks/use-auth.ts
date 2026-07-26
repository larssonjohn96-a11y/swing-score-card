import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const apply = (next: User | null) => {
      if (!active) return;
      setUser(next);
      setLoading(false);
      if (!next) {
        setDisplayName(null);
        return;
      }
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", next.id)
        .maybeSingle()
        .then(({ data }) => {
          if (active) setDisplayName(data?.display_name ?? null);
        });
    };

    supabase.auth.getSession().then(({ data }) => apply(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, displayName, loading };
}
