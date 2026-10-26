import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { testService, type TicketState } from "@/services/test.service";
import { useLoad } from "@/hooks/useLoad";
import { useStartTest } from "@/hooks/useStartTest";
import { useTestStore } from "@/store/test.store";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/utils/cn";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

const TONE: Record<TicketState["status"] | "new", string> = {
  passed: "bg-emerald-700 text-white hover:bg-emerald-800",
  retry: "bg-amber-500 text-white hover:bg-amber-600",
  active: "bg-brand-600 text-white ring-2 ring-brand-300 ring-offset-2 hover:bg-brand-700 dark:ring-offset-slate-900",
  new: "bg-brand-50 text-slate-700 hover:bg-brand-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
};

/** Tickets 1..60 of one course: a click starts that ticket's fixed question set (or returns to the running one). */
export function TicketMatrix({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useLoad(() => testService.tickets(courseId), [courseId]);
  const { startTest, starting } = useStartTest();
  const [startingTicket, setStartingTicket] = useState<number | null>(null);
  const running = useTestStore((s) => (s.status === "active" ? s.id : null));

  const open = async (ticket: number, state?: TicketState) => {
    // The attempt that runs in this browser continues; anything else starts the ticket again.
    if (state?.status === "active" && state.testId && state.testId === running) {
      navigate(ROUTES.testPage(state.testId));
      return;
    }
    setStartingTicket(ticket);
    await startTest(courseId, undefined, "EXAM", ticket);
    setStartingTicket(null);
  };

  if (loading && !data) return <Skeleton className="h-72 w-full rounded-2xl" />;
  if (error || !data) return <ErrorState message={error ?? undefined} onRetry={reload} />;

  const byTicket = new Map(data.tickets.map((s) => [s.ticket, s]));
  return (
    <Card>
      <CardContent>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10 xl:grid-cols-12">
          {Array.from({ length: data.count }, (_, i) => i + 1).map((n) => {
            const state = byTicket.get(n);
            const tone = state?.status ?? "new";
            const busy = starting && startingTicket === n;
            return (
              <button
                key={n}
                type="button"
                disabled={starting}
                onClick={() => open(n, state)}
                title={state?.score != null ? t("tests.tickets.scoreHint", { n, score: state.score }) : t("tests.tickets.ticketLabel", { n })}
                aria-label={t("tests.tickets.ticketLabel", { n })}
                className={cn(
                  "flex h-11 items-center justify-center gap-1 rounded-lg text-sm font-bold transition disabled:cursor-wait",
                  TONE[tone],
                  busy && "animate-pulse"
                )}
              >
                {n}
                {tone === "passed" && <Check className="h-4 w-4" aria-hidden />}
                {tone === "retry" && <RotateCw className="h-3.5 w-3.5" aria-hidden />}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
