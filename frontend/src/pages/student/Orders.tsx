import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { shopService, type Order } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateTime, formatMoney } from "@/utils/money";

const VARIANT: Record<Order["status"], "success" | "warning" | "danger" | "neutral"> = {
  PENDING: "warning",
  PAID: "success",
  CANCELLED: "danger",
  EXPIRED: "neutral",
  REFUNDED: "neutral",
};

export default function Orders() {
  const { t } = useTranslation();
  const { data: orders, loading, error, reload } = useLoad(() => shopService.orders(), []);

  // The page only reads status; payment is confirmed by the provider -> server, never by this page.
  const hasPending = orders?.some((o) => o.status === "PENDING") ?? false;
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => void reload(), 8000);
    return () => clearInterval(timer);
  }, [hasPending, reload]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">{t("orders.title")}</h1>
      {loading && !orders ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          title={t("orders.emptyTitle")}
          description={t("orders.emptyDesc")}
          action={<Link to="/pricing"><Button>{t("orders.toPricing")}</Button></Link>}
        />
      ) : (
        <div className="space-y-4">
          {hasPending && <Alert variant="info">{t("orders.waiting")}</Alert>}
          {orders.map((o) => (
            <Card key={o.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{o.items.map((i) => i.title).join(", ")}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(o.createdAt)} · №{o.id.slice(0, 8)}</p>
                  {o.discountTotal > 0 && <p className="text-xs text-emerald-600">{t("orders.discount")}: {formatMoney(o.discountTotal, o.currency)}</p>}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{formatMoney(o.total, o.currency)}</span>
                  <Badge variant={VARIANT[o.status]}>{t(`orders.status.${o.status}`)}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
