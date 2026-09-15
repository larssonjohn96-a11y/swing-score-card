import { useEffect, useState } from "react";
import { CloudAlert } from "lucide-react";
import { getShotSyncStatus, retryShotSync, subscribeShotSyncStatus, type ShotSyncStatus as Status } from "@/lib/shot-bank";

export function ShotSyncStatus() {
  const [status, setStatus] = useState<Status>(() => getShotSyncStatus());

  useEffect(() => subscribeShotSyncStatus(setStatus), []);

  // Pending uploads are normal offline-first behaviour and should not compete
  // with the training UI. Surface sync only when the user needs to act.
  if (status.state !== "failed") return null;

  return (
    <button
      type="button"
      onClick={() => void retryShotSync()}
      className="fixed bottom-24 right-3 z-[80] inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50/95 px-3 py-1.5 text-[10px] font-bold text-red-700 shadow-sm backdrop-blur-xl"
      aria-label="Försök synka golfslag igen"
    >
      <CloudAlert className="h-3.5 w-3.5" /> Synkfel · försök igen
    </button>
  );
}
