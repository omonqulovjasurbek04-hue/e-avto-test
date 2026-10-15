import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { studentService } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateTime } from "@/utils/money";
import { cn } from "@/utils/cn";

export default function Notifications() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useLoad(() => studentService.notifications(), []);

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("notifications.title")} {data && data.unread > 0 && <span className="text-primary-600">({data.unread})</span>}
        </h1>
        {data && data.unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => run(() => studentService.markAllRead())} leftIcon={<CheckCheck className="h-4 w-4" />}>
            {t("notifications.readAll")}
          </Button>
        )}
      </div>
      {loading && !data ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title={t("notifications.emptyTitle")} description={t("notifications.emptyDesc")} />
      ) : (
        <div className="space-y-3">
          {data.items.map((n) => (
            <Card key={n.id} className={cn(!n.readAt && "border-primary-300 dark:border-primary-700")}>
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{n.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{n.body}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(n.createdAt)}</p>
                </div>
                {!n.readAt && (
                  <Button size="sm" variant="ghost" onClick={() => run(() => studentService.markRead(n.id))}>
                    {t("notifications.markRead")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
