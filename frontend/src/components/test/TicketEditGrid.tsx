import { useNavigate } from "react-router-dom";
import { PenLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { teacherService } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { writeStored } from "@/hooks/useStoredState";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/utils/cn";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

/** Teacher's edit mode of the ticket grid: every ticket shows its question count and opens its editor. */
export function TicketEditGrid({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const { data, loading, error, reload } = useLoad(() => teacherService.tickets(courseId), [courseId]);

  if (loading && !data) return <Skeleton className="h-72 w-full rounded-2xl" />;
  if (error || !data) return <ErrorState message={error ?? undefined} onRetry={reload} />;

  return (
    <Card className="border-brand-200 dark:border-brand-500/30">
      <CardContent>
        <p className="mb-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <PenLine className="h-4 w-4 text-brand-600" aria-hidden /> {t("ticketEdit.gridHint")}
        </p>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10 xl:grid-cols-12">
          {data.tickets.map((tk) => (
            <button
              key={tk.ticket}
              type="button"
              onClick={() => {
                // The course goes to the browser's storage, the address shows only the ticket number.
                writeStored(userId, "tests.course", courseId);
                navigate(`/tests/manage/${tk.ticket}`);
              }}
              aria-label={t("tests.tickets.ticketLabel", { n: tk.ticket })}
              className={cn(
                "relative flex h-14 flex-col items-center justify-center rounded-lg border-2 border-dashed text-sm font-bold transition",
                tk.custom
                  ? "border-brand-500 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-200"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              )}
            >
              {tk.ticket}
              <span className="text-[11px] font-medium text-slate-500">{t("ticketEdit.questionsShort", { count: tk.questions })}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border-2 border-dashed border-brand-500 bg-brand-50" /> {t("ticketEdit.legendCustom")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border-2 border-dashed border-slate-300" /> {t("ticketEdit.legendAuto")}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
