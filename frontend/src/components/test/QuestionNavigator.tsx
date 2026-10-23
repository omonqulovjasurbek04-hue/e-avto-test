import { cn } from "@/utils/cn";

interface QuestionNavigatorProps {
  total: number;
  current: number;
  answered: boolean[];
  marked: boolean[];
  onSelect: (index: number) => void;
  className?: string;
}

export default function QuestionNavigator({
  total,
  current,
  answered,
  marked,
  onSelect,
  className,
}: QuestionNavigatorProps) {
  return (
    <div className={cn("grid grid-cols-6 gap-2 sm:grid-cols-10 lg:grid-cols-[repeat(15,minmax(0,1fr))]", className)}>
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
              "relative flex h-10 min-w-0 items-center justify-center rounded-lg border text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
              isCurrent
                ? "border-brand-600 bg-brand-600 text-white"
                : isAnswered
                ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
            aria-current={isCurrent ? "step" : undefined}
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
