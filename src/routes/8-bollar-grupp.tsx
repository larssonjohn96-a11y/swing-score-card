import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listActiveEightBallGroupSessions } from "@/lib/group-eight-ball";
import { LIGHT_SURFACE } from "./8-bollar";

export const Route = createFileRoute("/8-bollar-grupp")({ component: GroupEntryRedirect });

function GroupEntryRedirect() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    void listActiveEightBallGroupSessions().then((sessions) => {
      if (!alive) return;
      const latest = sessions[0];
      if (latest?.id) {
        window.location.replace(`/8-bollar-grupp/${latest.id}`);
      } else {
        window.location.replace("/8-bollar");
      }
    }).catch(() => setFailed(true));
    return () => { alive = false; };
  }, []);

  return (
    <main style={LIGHT_SURFACE} className="mx-auto min-h-[100dvh] w-full max-w-md bg-background px-5 pt-10 text-foreground">
      {failed ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <p className="font-semibold">Kunde inte öppna spelet.</p>
          <Link to="/8-bollar" className="mt-3 inline-block text-sm font-semibold text-primary">Till 8-bollsövningen ›</Link>
        </div>
      ) : <p className="text-center text-sm text-muted-foreground">Öppnar spelet …</p>}
    </main>
  );
}
