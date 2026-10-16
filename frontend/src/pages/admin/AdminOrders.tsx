import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, Receipt, RotateCcw, Tag, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { adminPlatformService as api, type AdminOrder } from "@/services/platform.service";
import { useAuthStore } from "@/store/auth.store";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useLoad } from "@/hooks/useLoad";
import { useDebounce } from "@/hooks/useDebounce";
import StatCard from "@/components/common/StatCard";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateTime, formatMoney, fromSom, toSom } from "@/utils/money";

const STATUS: Record<AdminOrder["status"], "success" | "warning" | "danger" | "neutral"> = {
  PENDING: "warning",
  PAID: "success",
  CANCELLED: "danger",
  EXPIRED: "neutral",
  REFUNDED: "neutral",
};

const RANGES = ["7", "30", "365"];

export default function AdminOrders() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [days, setDays] = useState("30");
  const q = useDebounce(search, 400);
  const canRefund = can(useAuthStore((st) => st.user?.role), "payments:manage");
  const [refunding, setRefunding] = useState<AdminOrder | null>(null);
  const [rf, setRf] = useState({ som: "", reason: "" });
  const [rfBusy, setRfBusy] = useState(false);
  const [rfErr, setRfErr] = useState<string | null>(null);
  const pendingRefunds = useLoad(() => (canRefund ? api.refunds() : Promise.resolve([])), [canRefund]);

  const summary = useLoad(() => api.financeSummary(new Date(Date.now() - Number(days) * 86_400_000).toISOString(), new Date(Date.now() + 1000).toISOString()), [days]);
  const orders = useLoad(() => api.orders({ page, status: status || undefined, search: q || undefined }), [page, status, q]);

  const s = summary.data;
  const paidPayment = (o: AdminOrder) => o.payments.find((p) => p.status === "PAID" || p.status === "PARTIALLY_REFUNDED");

  const submitRefund = async () => {
    const pay = refunding && paidPayment(refunding);
    if (!pay) return;
    const amount = fromSom(Number(rf.som));
    if (!Number.isFinite(amount) || amount <= 0) return setRfErr(t("admin.orders.enterAmount"));
    if (rf.reason.trim().length < 3) return setRfErr(t("admin.orders.enterReason"));
    setRfBusy(true);
    setRfErr(null);
    try {
      await api.createRefund(pay.id, amount, rf.reason.trim());
      toast.success(t("admin.orders.refundCreated"));
      setRefunding(null);
      void orders.reload();
      void pendingRefunds.reload();
      void summary.reload();
    } catch (e) {
      setRfErr(e instanceof Error ? e.message : t("admin.common.error"));
    } finally {
      setRfBusy(false);
    }
  };

  const settle = async (id: string, action: "complete" | "reject") => {
    try {
      if (action === "complete") await api.completeRefund(id);
      else {
        const reason = window.prompt(t("admin.orders.rejectPrompt"));
        if (!reason || reason.trim().length < 3) return;
        await api.rejectRefund(id, reason.trim());
      }
      void pendingRefunds.reload();
      void orders.reload();
      void summary.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.common.error"));
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">{t("admin.orders.title")}</h1>
        <div className="w-48"><Select aria-label={t("admin.orders.period")} options={RANGES.map((value) => ({ value, label: t(`admin.orders.last${value}`) }))} value={days} onChange={(e) => setDays(e.target.value)} /></div>
      </div>

      {summary.error ? <ErrorState message={summary.error} onRetry={summary.reload} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("admin.orders.net")} value={s ? formatMoney(s.net) : "…"} icon={<Banknote className="h-5 w-5" />} color="green" />
          <StatCard label={t("admin.orders.paidOrders")} value={s ? s.paidOrders : "…"} icon={<Receipt className="h-5 w-5" />} />
          <StatCard label={t("admin.orders.refunded")} value={s ? formatMoney(s.refunded) : "…"} icon={<RotateCcw className="h-5 w-5" />} color="amber" />
          <StatCard label={t("admin.orders.discounts")} value={s ? formatMoney(s.discountsGiven) : "…"} icon={<Tag className="h-5 w-5" />} color="slate" />
        </div>
      )}
      <p className="text-xs text-slate-500">{t("admin.orders.netHint")}</p>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-64 flex-1"><Input aria-label={t("admin.common.search")} placeholder={t("admin.orders.searchPlaceholder")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <div className="w-52">
          <Select aria-label={t("admin.common.status")} options={[{ value: "", label: t("admin.orders.allStatuses") }, ...Object.keys(STATUS).map((value) => ({ value, label: t(`admin.orders.status${value}`) }))]} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} />
        </div>
      </div>

      {orders.loading && !orders.data ? <Skeleton className="h-48 rounded-2xl" /> : orders.error ? <ErrorState message={orders.error} onRetry={orders.reload} /> : !orders.data || orders.data.items.length === 0 ? (
        <EmptyState title={t("admin.orders.empty")} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">{t("admin.common.date")}</th><th className="px-4 py-3">{t("admin.common.user")}</th><th className="px-4 py-3">{t("admin.orders.product")}</th><th className="px-4 py-3">{t("admin.orders.amount")}</th><th className="px-4 py-3">{t("admin.common.status")}</th>{canRefund && <th className="px-4 py-3 text-right">{t("admin.common.action")}</th>}</tr></thead>
              <tbody className="divide-y divide-slate-800">
                {orders.data.items.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                    <td className="px-4 py-3"><span className="font-medium text-white">{o.user.name}</span><br /><span className="text-xs text-slate-500">{o.user.email}</span></td>
                    <td className="px-4 py-3">{o.items.map((i) => i.title).join(", ")}</td>
                    <td className="px-4 py-3 font-semibold">{formatMoney(o.total, o.currency)}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS[o.status]}>{t(`admin.orders.status${o.status}`)}</Badge></td>
                    {canRefund && (
                      <td className="px-4 py-3 text-right">
                        {paidPayment(o) && (
                          <Button size="sm" variant="outline" leftIcon={<Undo2 className="h-4 w-4" />} onClick={() => { setRf({ som: String(toSom(paidPayment(o)!.amount)), reason: "" }); setRfErr(null); setRefunding(o); }}>
                            {t("admin.orders.refund")}
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={orders.data.pagination.totalPages} onChange={setPage} />
        </>
      )}

      {canRefund && pendingRefunds.data && pendingRefunds.data.some((r) => r.status === "PENDING") && (
        <section className="space-y-3 rounded-2xl border border-amber-700/40 p-4">
          <h2 className="font-semibold text-white">{t("admin.orders.pendingRefunds")}</h2>
          <p className="text-xs text-slate-500">{t("admin.orders.pendingHint")}</p>
          {pendingRefunds.data.filter((r) => r.status === "PENDING").map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900 p-3 text-sm">
              <div>
                <p className="text-white">{r.payment.order.user.name} · {formatMoney(r.amount, r.payment.currency)}</p>
                <p className="text-xs text-slate-500">{r.reason} · {formatDateTime(r.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => settle(r.id, "complete")}>{t("admin.common.confirm")}</Button>
                <Button size="sm" variant="danger" onClick={() => settle(r.id, "reject")}>{t("admin.common.reject")}</Button>
              </div>
            </div>
          ))}
        </section>
      )}

      <Modal isOpen={refunding !== null} onClose={() => setRefunding(null)} title={t("admin.orders.refundTitle")} maxWidth="md">
        {refunding && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">{refunding.user.name} · {refunding.items.map((i) => i.title).join(", ")}</p>
            <Input label={t("admin.orders.refundAmount")} type="number" min={0} value={rf.som} onChange={(e) => setRf({ ...rf, som: e.target.value })} />
            <Input label={t("admin.common.reason")} value={rf.reason} onChange={(e) => setRf({ ...rf, reason: e.target.value })} />
            <p className="text-xs text-slate-500">{t("admin.orders.refundHint")}</p>
            {rfErr && <p role="alert" className="text-sm text-red-400">{rfErr}</p>}
            <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setRefunding(null)}>{t("admin.common.cancel")}</Button><Button loading={rfBusy} onClick={submitRefund}>{t("admin.orders.refund")}</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
