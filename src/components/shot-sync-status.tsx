import { useEffect, useState } from "react";
import { CloudAlert, CloudUpload } from "lucide-react";
import { getShotSyncStatus, retryShotSync, subscribeShotSyncStatus, type ShotSyncStatus as Status } from "@/lib/shot-bank";

export function ShotSyncStatus() {
  const [status, setStatus] = useState<Status>(() => getShotSyncStatus());

  useEffect(() => subscribeShotSyncStatus(setStatus), []);

  if (status.state === "synced") return null;

  if (status.state === "failed") {
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

  return (
    <div
      className="fixed bottom-24 right-3 z-[80] inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/95 px-3 py-1.5 text-[10px] font-bold text-amber-800 shadow-sm backdrop-blur-xl"
      role="status"
    >
      <CloudUpload className="h-3.5 w-3.5" />
      {status.pending} slag väntar på synk
    </div>
  );
}
