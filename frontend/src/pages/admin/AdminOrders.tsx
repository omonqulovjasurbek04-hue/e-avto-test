import { useState } from "react";
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

const STATUS: Record<AdminOrder["status"], { label: string; variant: "success" | "warning" | "danger" | "neutral" }> = {
  PENDING: { label: "Kutilmoqda", variant: "warning" },
  PAID: { label: "To'langan", variant: "success" },
  CANCELLED: { label: "Bekor", variant: "danger" },
  EXPIRED: { label: "Muddati tugagan", variant: "neutral" },
  REFUNDED: { label: "Qaytarilgan", variant: "neutral" },
};

const RANGES = [
  { value: "7", label: "Oxirgi 7 kun" },
  { value: "30", label: "Oxirgi 30 kun" },
  { value: "365", label: "Oxirgi yil" },
];

export default function AdminOrders() {
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
    if (!Number.isFinite(amount) || amount <= 0) return setRfErr("Summani kiriting");
    if (rf.reason.trim().length < 3) return setRfErr("Sababni yozing");
    setRfBusy(true);
    setRfErr(null);
    try {
      await api.createRefund(pay.id, amount, rf.reason.trim());
      toast.success("Qaytarish so'rovi yaratildi");
      setRefunding(null);
      void orders.reload();
      void pendingRefunds.reload();
      void summary.reload();
    } catch (e) {
      setRfErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setRfBusy(false);
    }
  };

  const settle = async (id: string, action: "complete" | "reject") => {
    try {
      if (action === "complete") await api.completeRefund(id);
      else {
        const reason = window.prompt("Rad etish sababi:");
        if (!reason || reason.trim().length < 3) return;
        await api.rejectRefund(id, reason.trim());
      }
      void pendingRefunds.reload();
      void orders.reload();
      void summary.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Buyurtmalar va tushum</h1>
        <div className="w-48"><Select aria-label="Davr" options={RANGES} value={days} onChange={(e) => setDays(e.target.value)} /></div>
      </div>

      {summary.error ? <ErrorState message={summary.error} onRetry={summary.reload} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Tushum (sof)" value={s ? formatMoney(s.net) : "…"} icon={<Banknote className="h-5 w-5" />} color="green" />
          <StatCard label="To'langan buyurtmalar" value={s ? s.paidOrders : "…"} icon={<Receipt className="h-5 w-5" />} />
          <StatCard label="Qaytarilgan" value={s ? formatMoney(s.refunded) : "…"} icon={<RotateCcw className="h-5 w-5" />} color="amber" />
          <StatCard label="Berilgan chegirmalar" value={s ? formatMoney(s.discountsGiven) : "…"} icon={<Tag className="h-5 w-5" />} color="slate" />
        </div>
      )}
      <p className="text-xs text-slate-500">Tushum faqat server tasdiqlagan (provayder callback'i orqali to'langan) buyurtmalardan hisoblanadi; qaytarilgan summa ayiriladi.</p>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-64 flex-1"><Input aria-label="Qidirish" placeholder="Ism yoki email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <div className="w-52">
          <Select aria-label="Holat" options={[{ value: "", label: "Barcha holatlar" }, ...Object.entries(STATUS).map(([value, v]) => ({ value, label: v.label }))]} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} />
        </div>
      </div>

      {orders.loading && !orders.data ? <Skeleton className="h-48 rounded-2xl" /> : orders.error ? <ErrorState message={orders.error} onRetry={orders.reload} /> : !orders.data || orders.data.items.length === 0 ? (
        <EmptyState title="Buyurtmalar topilmadi" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">Sana</th><th className="px-4 py-3">Foydalanuvchi</th><th className="px-4 py-3">Mahsulot</th><th className="px-4 py-3">Summa</th><th className="px-4 py-3">Holat</th>{canRefund && <th className="px-4 py-3 text-right">Amal</th>}</tr></thead>
              <tbody className="divide-y divide-slate-800">
                {orders.data.items.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                    <td className="px-4 py-3"><span className="font-medium text-white">{o.user.name}</span><br /><span className="text-xs text-slate-500">{o.user.email}</span></td>
                    <td className="px-4 py-3">{o.items.map((i) => i.title).join(", ")}</td>
                    <td className="px-4 py-3 font-semibold">{formatMoney(o.total, o.currency)}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS[o.status].variant}>{STATUS[o.status].label}</Badge></td>
                    {canRefund && (
                      <td className="px-4 py-3 text-right">
                        {paidPayment(o) && (
                          <Button size="sm" variant="outline" leftIcon={<Undo2 className="h-4 w-4" />} onClick={() => { setRf({ som: String(toSom(paidPayment(o)!.amount)), reason: "" }); setRfErr(null); setRefunding(o); }}>
                            Qaytarish
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
          <h2 className="font-semibold text-white">Kutilayotgan qaytarishlar</h2>
          <p className="text-xs text-slate-500">Provayder avtomatik qaytarmagan so'rovlar. Pul provayder kabinetida qaytarilgach "Tasdiqlash" ni bosing; aks holda rad eting.</p>
          {pendingRefunds.data.filter((r) => r.status === "PENDING").map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900 p-3 text-sm">
              <div>
                <p className="text-white">{r.payment.order.user.name} · {formatMoney(r.amount, r.payment.currency)}</p>
                <p className="text-xs text-slate-500">{r.reason} · {formatDateTime(r.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => settle(r.id, "complete")}>Tasdiqlash</Button>
                <Button size="sm" variant="danger" onClick={() => settle(r.id, "reject")}>Rad etish</Button>
              </div>
            </div>
          ))}
        </section>
      )}

      <Modal isOpen={refunding !== null} onClose={() => setRefunding(null)} title="Pulni qaytarish" maxWidth="md">
        {refunding && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">{refunding.user.name} · {refunding.items.map((i) => i.title).join(", ")}</p>
            <Input label="Qaytariladigan summa (so'm)" type="number" min={0} value={rf.som} onChange={(e) => setRf({ ...rf, som: e.target.value })} />
            <Input label="Sabab" value={rf.reason} onChange={(e) => setRf({ ...rf, reason: e.target.value })} />
            <p className="text-xs text-slate-500">To'liq qaytarilsa foydalanuvchining kursga kirishi bekor qilinadi. Amal audit jurnaliga yoziladi.</p>
            {rfErr && <p role="alert" className="text-sm text-red-400">{rfErr}</p>}
            <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setRefunding(null)}>Bekor qilish</Button><Button loading={rfBusy} onClick={submitRefund}>Qaytarish</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
