import { useState } from "react";
import { Bot } from "lucide-react";
import { CoursePlayerPicker } from "./course-player-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
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
  const [open, setOpen] = useState(false);
  const name = mode === "bot" ? bots[bot].name : friend;
  return (
    <>
      <div className="relative grid grid-cols-2 gap-10 py-1">
        <div className="flex min-h-44 flex-col items-center justify-center rounded-[26px] border border-blue-200 bg-gradient-to-br from-blue-50 to-white px-3 py-6 text-center shadow-sm">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-blue-500 bg-blue-50 font-bold text-blue-600">
            {initials(self)}
          </span>
          <p className="mt-3 break-words font-bold text-slate-950">{self}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-blue-600">
            Du · Blue
          </p>
        </div>
        <span className="absolute left-1/2 top-1/2 z-10 flex h-11 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-950 font-display text-xl text-white">
          VS
        </span>
        <button
          onClick={() => setOpen(true)}
          aria-label={mode === "bot" ? "Välj bot" : "Välj kompis"}
          className="flex min-h-44 flex-col items-center justify-center rounded-[26px] border border-red-200 bg-gradient-to-br from-red-50 to-white px-3 py-6 text-center shadow-sm"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500 bg-red-50 font-bold text-red-600">
            {mode === "bot" ? <Bot className="h-7 w-7" /> : name ? initials(name) : "+"}
          </span>
          <p className="mt-3 break-words font-bold text-slate-950">{name || "Välj kompis"}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-red-600">
            {mode === "bot"
              ? `${bots[bot].level} · Tryck för att ändra`
              : name
                ? "Red · Tryck för att ändra"
                : "Tryck för att välja"}
          </p>
        </button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl uppercase">
              {mode === "bot" ? "Välj bot" : "Välj kompis"}
            </DialogTitle>
            <DialogDescription>
              {mode === "bot"
                ? "Välj vem du vill möta."
                : "Välj bland dina vänner eller lägg till en gäst."}
            </DialogDescription>
          </DialogHeader>
          {mode === "friend" ? (
            <>
              <CoursePlayerPicker
                label="Kompis eller gäst"
                name={friend}
                userId={friendId}
                onChange={(p) => {
                  onFriend(p);
                  if (p.userId) setOpen(false);
                }}
              />
              <button
                disabled={!friend.trim()}
                onClick={() => setOpen(false)}
                className="min-h-12 rounded-2xl bg-blue-600 font-bold text-white disabled:opacity-40"
              >
                Klar
              </button>
            </>
          ) : (
            <div className="grid gap-3">
              {bots.map((b, i) => (
                <button
                  key={b.name}
                  aria-pressed={bot === i}
                  onClick={() => {
                    onBot(i);
                    setOpen(false);
                  }}
                  className={`flex min-h-16 items-center justify-between rounded-2xl border-2 p-4 ${bot === i ? "border-red-500 bg-red-50" : "border-slate-200 bg-white"}`}
                >
                  <span className="font-display text-2xl">{b.name}</span>
                  <span className="text-sm font-semibold text-slate-500">{b.level}</span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
