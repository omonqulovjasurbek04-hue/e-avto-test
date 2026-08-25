import { Check, X } from "lucide-react";
import { cn } from "@/utils/cn";

interface QuestionCardProps {
  index: number;
  total: number;
  text: string;
  options: string[];
  imageUrl?: string;
  selected?: number | null;
  onSelect?: (index: number) => void;
  disabled?: boolean;
  review?: { correctIndex: number };
}

export default function QuestionCard({
  index,
  total,
  text,
  options,
  imageUrl,
  selected,
  onSelect,
  disabled,
  review,
}: QuestionCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
          Savol {index + 1} / {total}
        </span>
      </div>

      <h3 className="break-words text-base font-semibold leading-7 text-slate-800 dark:text-slate-100 sm:text-lg">
        {text}
      </h3>

      {imageUrl && (
        <img src={imageUrl} alt="Savol rasmi" className="mt-4 max-h-48 rounded-lg object-contain" />
      )}

      <div className="mt-5 flex flex-col gap-3">
        {options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = review?.correctIndex === i;
          const showWrong = review && isSelected && !isCorrect;
          const state = review
            ? isCorrect
              ? "correct"
              : showWrong
              ? "wrong"
              : ""
            : isSelected
            ? "selected"
            : "";

          return (
            <button
              key={i}
              onClick={() => !disabled && onSelect?.(i)}
              disabled={disabled}
              className={cn(
                "flex min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left text-sm transition sm:px-4",
                state === "selected" &&
                  "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200",
                state === "correct" &&
                  "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
                state === "wrong" &&
                  "border-red-500 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                state === "" && "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              )}
            >
              <span className="min-w-0 break-words">{opt}</span>
              {state === "correct" && <Check className="h-5 w-5 text-emerald-600" />}
              {state === "wrong" && <X className="h-5 w-5 text-red-600" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
