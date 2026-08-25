import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 dark:border-slate-700"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            "h-9 w-9 rounded-lg border text-sm font-medium",
            p === page
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
          )}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 dark:border-slate-700"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
