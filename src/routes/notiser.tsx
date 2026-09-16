import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Settings, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { listFriendships, type Friendship } from "@/lib/friends-cloud";

export const Route = createFileRoute("/notiser")({
  head: () => ({ meta: [{ title: "Notifikationer | SG4" }] }),
  component: NotificationsPage,
});

type NotificationItem = {
  id: string;
  name: string;
  avatarUrl: string | null;
  text: string;
  createdAt: string;
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function toNotification(friendship: Friendship, direction: "incoming" | "outgoing" | "accepted"): NotificationItem {
  const text = direction === "incoming"
    ? "vill bli vän med dig."
    : direction === "outgoing"
      ? "har fått din vänförfrågan."
      : "är nu din vän.";
  return {
    id: `${direction}-${friendship.id}`,
    name: friendship.other.displayName,
    avatarUrl: friendship.other.avatarUrl,
    text,
    createdAt: friendship.createdAt,
  };
}

function NotificationsPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!user) { setItems([]); return; }
    void listFriendships().then((result) => {
      const next = [
        ...result.incoming.map((item) => toNotification(item, "incoming")),
        ...result.outgoing.map((item) => toNotification(item, "outgoing")),
        ...result.accepted.map((item) => toNotification(item, "accepted")),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(next);
    });
  }, [user]);

  const recent = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return items.filter((item) => new Date(item.createdAt).getTime() >= sevenDaysAgo);
  }, [items]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-28 pt-[max(18px,env(safe-area-inset-top))]">
      <header className="grid grid-cols-[56px_1fr_56px] items-center">
        <Link to="/" aria-label="Tillbaka" className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-white/65 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_8px_24px_-18px_rgba(15,23,42,.5)] backdrop-blur-2xl">
          <ArrowLeft className="h-7 w-7" />
        </Link>
        <h1 className="text-center text-[23px] font-black uppercase tracking-[-.03em] text-foreground">Notifikationer</h1>
        <button type="button" aria-label="Notisinställningar" className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-white/65 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_8px_24px_-18px_rgba(15,23,42,.5)] backdrop-blur-2xl">
          <Settings className="h-6 w-6" />
        </button>
      </header>

      <section className="mt-10">
        <h2 className="text-[25px] font-black tracking-[-.035em] text-foreground">Senaste 7 dagarna</h2>

        {loading ? <p className="mt-8 text-sm text-muted-foreground">Laddar …</p> : !user ? (
          <div className="mt-7 rounded-[24px] border border-border bg-card p-5 text-sm text-muted-foreground">Logga in för att se notifikationer.</div>
        ) : recent.length ? (
          <div className="mt-5 divide-y divide-border/70">
            {recent.map((item) => (
              <article key={item.id} className="flex gap-4 py-5 first:pt-2">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dbe5df] text-sm font-black text-primary">
                  {item.avatarUrl ? <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(item.name) || <User className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[17px] leading-[1.35] text-foreground">
                    <span className="font-black text-[#20a95a]">{item.name}</span>{" "}{item.text}
                  </p>
                  <p className="mt-1.5 text-[14px] text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-[24px] border border-border bg-card px-5 py-8 text-center">
            <p className="text-base font-bold text-foreground">Inga nya notifikationer</p>
            <p className="mt-1 text-sm text-muted-foreground">Nya vänförfrågningar och social aktivitet visas här.</p>
          </div>
        )}
      </section>
    </main>
  );
}
