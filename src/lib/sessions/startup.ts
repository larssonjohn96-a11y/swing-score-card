/**
 * Central app-start-koppling för sessionslagret (körs enbart i webbläsaren).
 *
 * - Inloggad användare vid start → import + restore (syncForUser).
 * - SIGNED_IN senare → samma sak för den nya användaren.
 * - Nätet kommer tillbaka → skicka väntande kö.
 * - Utloggad/gäst → ingenting; appen är fortsatt helt lokal.
 */
import { supabase } from "@/integrations/supabase/client";
import { flushOutbox, syncForUser } from "./sync";

let started = false;

export function startSessionSync(): () => void {
  if (typeof window === "undefined" || started) return () => undefined;
  started = true;

  let active = true;
  const run = (userId: string | undefined) => {
    if (!active || !userId) return;
    void syncForUser(userId).catch(() => undefined);
  };

  supabase.auth
    .getSession()
    .then(({ data }) => run(data.session?.user.id))
    .catch(() => undefined);

  const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "USER_UPDATED") {
      run(session?.user.id);
    }
  });

  const onOnline = () => {
    void flushOutbox().catch(() => undefined);
  };
  window.addEventListener("online", onOnline);

  return () => {
    active = false;
    started = false;
    sub.subscription.unsubscribe();
    window.removeEventListener("online", onOnline);
  };
}
