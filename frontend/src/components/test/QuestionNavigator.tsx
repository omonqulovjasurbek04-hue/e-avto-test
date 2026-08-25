import { cn } from "@/utils/cn";

interface QuestionNavigatorProps {
  total: number;
  current: number;
  answered: boolean[];
  marked: boolean[];
  onSelect: (index: number) => void;
}

export default function QuestionNavigator({
  total,
  current,
  answered,
  marked,
  onSelect,
}: QuestionNavigatorProps) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
      {Array.from({ length: total }, (_, i) => {
        const isAnswered = answered[i];
        const isMarked = marked[i];
        const isCurrent = i === current;
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            title={isMarked ? "Belgilangan" : undefined}
            className={cn(
              "relative flex h-9 items-center justify-center rounded-lg border text-sm font-medium transition",
              isCurrent
                ? "border-brand-600 bg-brand-600 text-white"
                : isAnswered
                ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
          >
            {i + 1}
            {isMarked && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}
