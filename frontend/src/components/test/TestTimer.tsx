import { Clock } from "lucide-react";
import { formatTime } from "@/utils/formatTime";
import { cn } from "@/utils/cn";

export default function TestTimer({ seconds }: { seconds: number }) {
  const danger = seconds <= 60;
  const warning = seconds <= 300 && seconds > 60;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold tabular-nums",
        danger
          ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
          : warning
          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
      )}
    >
      <Clock className="h-4 w-4" />
      {formatTime(seconds)}
    </div>
  );
}
