import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const DISPLAY_NAME_CACHE_KEY = "sg4-auth-display-name-v1";
let cachedUser: User | null | undefined;
let cachedDisplayName: string | null | undefined;
let cachedLoading = true;

function readCachedDisplayName() {
  if (cachedDisplayName !== undefined) return cachedDisplayName;
  if (typeof window === "undefined") return null;
  cachedDisplayName = window.localStorage.getItem(DISPLAY_NAME_CACHE_KEY);
  return cachedDisplayName;
}

function writeCachedDisplayName(value: string | null) {
  cachedDisplayName = value;
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(DISPLAY_NAME_CACHE_KEY, value);
  else window.localStorage.removeItem(DISPLAY_NAME_CACHE_KEY);
}

function metadataDisplayName(user: User | null) {
  if (!user) return null;
  const value = user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => cachedUser ?? null);
  const [displayName, setDisplayName] = useState<string | null>(() => readCachedDisplayName());
  const [loading, setLoading] = useState(() => cachedLoading && cachedUser === undefined);

  useEffect(() => {
    let active = true;

    const setIdentity = (nextUser: User | null, nextDisplayName?: string | null) => {
      if (!active) return;
      cachedUser = nextUser;
      cachedLoading = false;
      setUser(nextUser);
      setLoading(false);
      if (nextDisplayName !== undefined) {
        writeCachedDisplayName(nextDisplayName);
        setDisplayName(nextDisplayName);
      }
    };

    const apply = (next: User | null) => {
      if (!active) return;

      if (!next) {
        setIdentity(null, null);
        return;
      }

      const immediateName = cachedDisplayName ?? readCachedDisplayName() ?? metadataDisplayName(next);
      setIdentity(next, immediateName);

      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", next.id)
        .maybeSingle()
        .then(
          ({ data }) => {
            if (!active) return;
            const resolved = data?.display_name ?? metadataDisplayName(next) ?? cachedDisplayName ?? null;
            writeCachedDisplayName(resolved);
            setDisplayName(resolved);
          },
          () => {
            if (!active) return;
            const fallbackName = metadataDisplayName(next) ?? cachedDisplayName ?? null;
            if (fallbackName !== cachedDisplayName) writeCachedDisplayName(fallbackName);
            setDisplayName(fallbackName);
          },
        );
    };

    if (cachedUser !== undefined) {
      const immediateName = cachedDisplayName ?? readCachedDisplayName() ?? metadataDisplayName(cachedUser);
      setUser(cachedUser);
      setDisplayName(immediateName);
      setLoading(cachedLoading);
    }

    let settled = false;
    const fallback = window.setTimeout(() => {
      if (!settled && cachedUser === undefined) apply(null);
    }, 6000);

    supabase.auth.getSession()
      .then(({ data }) => {
        settled = true;
        window.clearTimeout(fallback);
        apply(data.session?.user ?? null);
      })
      .catch(() => {
        settled = true;
        window.clearTimeout(fallback);
        if (cachedUser === undefined) apply(null);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      settled = true;
      window.clearTimeout(fallback);
      apply(session?.user ?? null);
    });

    return () => {
      active = false;
      window.clearTimeout(fallback);
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, displayName, loading };
}
