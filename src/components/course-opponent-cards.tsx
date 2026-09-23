import { Bot } from "lucide-react";
import { CoursePlayerPicker } from "./course-player-picker";
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
export function CourseOpponentCards({
  self,
  mode,
  friend,
  friendId,
  onFriend,
  bots,
  bot,
  onBot,
}: {
  self: string;
  mode: "friend" | "bot";
  friend: string;
  friendId?: string;
  onFriend: (p: { name: string; userId?: string }) => void;
  bots: { name: string; level: string }[];
  bot: number;
  onBot: (index: number) => void;
}) {
  const name = mode === "bot" ? bots[bot].name : friend;
  const opponent = (
    <span className="flex min-h-44 flex-col items-center justify-center rounded-[26px] border border-red-200 bg-gradient-to-br from-red-50 to-white px-2 py-5 text-center shadow-sm">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-500 bg-red-50 font-bold text-red-600">
        {mode === "bot" ? <Bot className="h-7 w-7" /> : name ? initials(name) : "+"}
      </span>
      <span className="mt-3 max-w-full break-words text-base font-bold text-slate-950">
        {name || "Välj kompis"}
      </span>
      <span className="mt-2 text-xs leading-relaxed text-red-600">
        {mode === "bot"
          ? `${bots[bot].level} · Ändra`
          : name
            ? "Byt kompis"
            : "Tryck för att välja"}{" "}
        ▾
      </span>
    </span>
  );
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] items-start gap-3 py-1">
      <div className="flex min-h-44 flex-col items-center justify-center rounded-[26px] border border-blue-200 bg-gradient-to-br from-blue-50 to-white px-2 py-5 text-center shadow-sm">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-blue-500 bg-blue-50 font-bold text-blue-600">
          {initials(self)}
        </span>
        <p className="mt-3 max-w-full break-words text-base font-bold text-slate-950">{self}</p>
        <p className="mt-2 text-xs text-blue-600">Du</p>
      </div>
      <span className="mt-[68px] flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-extrabold text-white">
        VS
      </span>
      {mode === "friend" ? (
        <CoursePlayerPicker
          label="Välj kompis eller gäst"
          name={friend}
          userId={friendId}
          onChange={onFriend}
        >
          {opponent}
        </CoursePlayerPicker>
      ) : (
        <label className="relative block focus-within:rounded-[26px] focus-within:ring-2 focus-within:ring-red-500">
          {opponent}
          <select
            aria-label="Välj bot"
            value={bot}
            onChange={(e) => onBot(Number(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            {bots.map((b, i) => (
              <option key={b.name} value={i}>
                {b.name} · {b.level}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
