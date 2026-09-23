import { type ReactNode, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { listFriendships } from "@/lib/friends-cloud";
const field =
  "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950";
export function CoursePlayerPicker({
  label,
  children,
  name,
  userId,
  excludedIds = [],
  onChange,
}: {
  label: string;
  children?: ReactNode;
  name: string;
  userId?: string;
  excludedIds?: string[];
  onChange: (player: { name: string; userId?: string }) => void;
}) {
  const { user, loading } = useAuth();
  const [guest, setGuest] = useState(!userId && !!name);
  const friends = useQuery({
    queryKey: ["course-player-friends", user?.id],
    enabled: !!user && !loading,
    queryFn: () => listFriendships(true),
    staleTime: 30_000,
    retry: 1,
  });
  const options = (friends.data?.accepted ?? [])
    .map((f) => f.other)
    .filter((p) => p.id === userId || !excludedIds.includes(p.id));
  return (
    <div className="space-y-2">
      <label className={children ? "relative block" : "block space-y-2 font-semibold"}>
        {children || <span>{label}</span>}
        <select
          aria-label={label}
          className={children ? "absolute inset-0 h-full w-full cursor-pointer opacity-0" : field}
          value={userId || (guest ? "guest" : "")}
          onChange={(e) => {
            if (e.target.value === "guest") {
              setGuest(true);
              onChange({ name: "" });
            } else {
              const selected = options.find((p) => p.id === e.target.value);
              setGuest(false);
              onChange(
                selected ? { name: selected.displayName, userId: selected.id } : { name: "" },
              );
            }
          }}
        >
          <option value="" disabled>
            Välj en vän eller gäst
          </option>
          {userId && !options.some((p) => p.id === userId) && (
            <option value={userId}>{name}</option>
          )}
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
          <option value="guest">Lägg till gäst</option>
        </select>
      </label>
      {guest && !userId && (
        <label className="block space-y-1 text-sm font-semibold">
          <span>Gästens namn</span>
          <input
            className={field}
            value={name}
            maxLength={40}
            placeholder="Namn"
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </label>
      )}
      {user && friends.isPending && <p className="text-sm text-slate-500">Hämtar dina vänner…</p>}
      {user && friends.isError && (
        <p role="alert" className="text-sm text-red-700">
          Vänlistan kunde inte hämtas.{" "}
          <button className="min-h-11 underline" onClick={() => friends.refetch()}>
            Försök igen
          </button>
        </p>
      )}
      {user && friends.isSuccess && !friends.data.accepted.length && (
        <p className="text-sm text-slate-500">
          Du har inga tillagda vänner ännu. Du kan spela med en gäst.
        </p>
      )}
      {!user && !loading && (
        <p className="text-sm text-slate-500">
          Logga in för att välja bland dina vänner, eller lägg till en gäst.
        </p>
      )}
    </div>
  );
}
