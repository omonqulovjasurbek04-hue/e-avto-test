import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Car, Check, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/cn";

export interface PickerCourse {
  id: string;
  title: string;
  category?: string | null;
  /** Small text on the right of the item (e.g. how many students a group has). */
  meta?: string;
}

/**
 * One button showing the chosen course; it opens a list of the courses grouped by category.
 * Closes on a click outside or Escape. `label`, `icon` and `total` let it pick other things (e.g. groups).
 */
export function CoursePicker({
  courses,
  value,
  onChange,
  label,
  icon,
  total,
}: {
  courses: PickerCourse[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  icon?: ReactNode;
  total?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = courses.find((c) => c.id === value) ?? courses[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Courses by category, in the order they arrive.
  const groups = useMemo(() => {
    const map = new Map<string, PickerCourse[]>();
    for (const c of courses) {
      const key = c.category ?? t("coursePicker.other");
      map.set(key, [...(map.get(key) ?? []), c]);
    }
    return [...map.entries()];
  }, [courses, t]);

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div ref={root} className="relative w-full max-w-xl">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left shadow-sm transition dark:bg-slate-900",
          open ? "border-brand-500 ring-4 ring-brand-100 dark:ring-brand-500/20" : "border-slate-200 hover:border-brand-400 dark:border-slate-700"
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          {icon ?? <Car className="h-5 w-5" aria-hidden />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-slate-500">{label ?? t("coursePicker.label")}</span>
          <span className="block truncate font-semibold text-slate-900 dark:text-white">{current?.title}</span>
        </span>
        <span className="hidden text-xs text-slate-400 sm:inline">{total ?? t("coursePicker.count", { count: courses.length })}</span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <ul role="listbox" aria-label={label ?? t("coursePicker.label")} className="max-h-80 overflow-y-auto p-2">
              {groups.map(([category, items]) => (
                <li key={category}>
                  <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{category}</p>
                  <ul>
                    {items.map((c) => {
                      const active = c.id === current?.id;
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => choose(c.id)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                              active ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                            )}
                          >
                            <span className="flex-1">{c.title}</span>
                            {c.meta && <span className="shrink-0 text-xs font-normal text-slate-400">{c.meta}</span>}
                            {active && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
