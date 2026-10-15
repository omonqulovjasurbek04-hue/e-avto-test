import { useState } from "react";
import { Plus, Archive, BadgeDollarSign } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import { adminPlatformService as api, type AdminPackage } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDateTime, formatMoney, fromSom, toSom } from "@/utils/money";

const th = "px-4 py-3";
const tableWrap = "overflow-x-auto rounded-2xl border border-slate-800";
const thead = "bg-slate-950 text-xs uppercase text-slate-400";

export default function AdminCatalog() {
  const [tab, setTab] = useState("packages");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Katalog: paketlar, chegirmalar, promo-kodlar</h1>
      <Tabs
        activeTab={tab}
        onChange={setTab}
        tabs={[{ id: "packages", label: "Paketlar va narxlar" }, { id: "discounts", label: "Chegirmalar" }, { id: "coupons", label: "Promo-kodlar" }]}
      />
      {tab === "packages" && <Packages />}
      {tab === "discounts" && <Discounts />}
      {tab === "coupons" && <Coupons />}
    </div>
  );
}

function Packages() {
  const pkgs = useLoad(() => api.packages(), []);
  const courses = useLoad(() => adminService.listCourses(), []);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ courseId: "", name: "", description: "", durationDays: "" });
  const [pricing, setPricing] = useState<AdminPackage | null>(null);
  const [price, setPrice] = useState({ som: "", sample: true });
  const [archiving, setArchiving] = useState<AdminPackage | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!form.courseId || form.name.trim().length < 2) return setErr("Kurs va nom kiritilishi shart");
    setBusy(true);
    setErr(null);
    try {
      await api.createPackage({ courseId: form.courseId, name: form.name.trim(), description: form.description.trim() || null, durationDays: form.durationDays ? Number(form.durationDays) : null });
      toast.success("Paket yaratildi");
      setCreating(false);
      setForm({ courseId: "", name: "", description: "", durationDays: "" });
      void pkgs.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  const savePrice = async () => {
    if (!pricing) return;
    const som = Number(price.som);
    if (!Number.isFinite(som) || som < 0) return setErr("Narxni to'g'ri kiriting");
    setBusy(true);
    setErr(null);
    try {
      await api.setPrice(pricing.id, { amount: fromSom(som), isSample: price.sample });
      toast.success("Narx saqlandi");
      setPricing(null);
      void pkgs.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!archiving) return;
    try {
      await api.archivePackage(archiving.id);
      toast.success("Paket arxivlandi");
      setArchiving(null);
      void pkgs.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setErr(null); setCreating(true); }}>Yangi paket</Button>
      </div>
      {pkgs.loading && !pkgs.data ? <Skeleton className="h-40 rounded-2xl" /> : pkgs.error ? <ErrorState message={pkgs.error} onRetry={pkgs.reload} /> : !pkgs.data || pkgs.data.length === 0 ? (
        <EmptyState title="Paketlar yo'q" description="Kursga paket va narx qo'shing: narxlar sahifasida shu ko'rinadi." />
      ) : (
        <div className={tableWrap}>
          <table className="w-full text-left text-sm">
            <thead className={thead}><tr><th className={th}>Kurs</th><th className={th}>Paket</th><th className={th}>Joriy narx</th><th className={th}>Muddat</th><th className={th}>Holat</th><th className={`${th} text-right`}>Amallar</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {pkgs.data.map((p) => {
                const cur = p.prices.find((x) => !x.validTo);
                return (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3">{p.course.title}</td>
                    <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                    <td className="px-4 py-3">{cur ? <>{formatMoney(cur.amount, cur.currency)} {cur.isSample && <Badge variant="warning">namuna</Badge>}</> : <span className="text-slate-500">belgilanmagan</span>}</td>
                    <td className="px-4 py-3">{p.durationDays ? `${p.durationDays} kun` : "cheksiz"}</td>
                    <td className="px-4 py-3">{p.archivedAt ? <Badge variant="neutral">Arxiv</Badge> : p.isActive ? <Badge variant="success">Faol</Badge> : <Badge variant="warning">Nofaol</Badge>}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {!p.archivedAt && (
                          <>
                            <Button size="sm" variant="outline" aria-label="Narx belgilash" onClick={() => { setErr(null); setPrice({ som: cur ? String(toSom(cur.amount)) : "", sample: cur?.isSample ?? true }); setPricing(p); }}><BadgeDollarSign className="h-4 w-4" /></Button>
                            <Button size="sm" variant="danger" aria-label="Arxivlash" onClick={() => setArchiving(p)}><Archive className="h-4 w-4" /></Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={creating} onClose={() => setCreating(false)} title="Yangi paket" maxWidth="lg">
        <div className="space-y-4">
          <Select label="Kurs" options={[{ value: "", label: "Tanlang…" }, ...(courses.data ?? []).map((c) => ({ value: c.id, label: c.title }))]} value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} />
          <Input label="Paket nomi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea label="Tavsif" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Kirish muddati (kun, bo'sh = cheksiz)" type="number" min={1} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
          {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setCreating(false)}>Bekor qilish</Button><Button loading={busy} onClick={create}>Saqlash</Button></div>
        </div>
      </Modal>

      <Modal isOpen={pricing !== null} onClose={() => setPricing(null)} title={`Narx: ${pricing?.name ?? ""}`} maxWidth="md">
        <div className="space-y-4">
          <Input label="Narx (so'm)" type="number" min={0} value={price.som} onChange={(e) => setPrice({ ...price, som: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={price.sample} onChange={(e) => setPrice({ ...price, sample: e.target.checked })} /> Namuna narx (haqiqiy narx hali tasdiqlanmagan)</label>
          <p className="text-xs text-slate-500">Yangi narx eskisini almashtiradi. Avvalgi buyurtmalar o'z narxini saqlab qoladi.</p>
          {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setPricing(null)}>Bekor qilish</Button><Button loading={busy} onClick={savePrice}>Saqlash</Button></div>
        </div>
      </Modal>

      <ConfirmDialog open={archiving !== null} title="Paketni arxivlash" message={`"${archiving?.name ?? ""}" narxlar sahifasidan olinadi. Eski buyurtmalar saqlanadi.`} confirmText="Arxivlash" onConfirm={archive} onCancel={() => setArchiving(null)} />
    </div>
  );
}

function DiscountForm({ onSave, withCode }: { onSave: (v: { name: string; code: string; type: "PERCENT" | "FIXED"; value: number; max: number | null; min: number }) => Promise<void>; withCode: boolean }) {
  const [v, setV] = useState({ name: "", code: "", type: "PERCENT" as "PERCENT" | "FIXED", value: "", max: "", min: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const n = Number(v.value);
    if (!Number.isFinite(n) || n <= 0) return setErr("Qiymatni kiriting");
    if (v.type === "PERCENT" && n > 100) return setErr("Foiz 100 dan oshmasligi kerak");
    setBusy(true);
    setErr(null);
    try {
      await onSave({ name: v.name.trim(), code: v.code.trim(), type: v.type, value: v.type === "PERCENT" ? Math.round(n) : fromSom(n), max: v.max ? Number(v.max) : null, min: v.min ? fromSom(Number(v.min)) : 0 });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      {withCode ? <Input label="Kod (A-Z, 0-9, _ -)" value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} /> : <Input label="Nomi" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}
      <div className="grid grid-cols-2 gap-4">
        <Select label="Turi" options={[{ value: "PERCENT", label: "Foiz (%)" }, { value: "FIXED", label: "Summa (so'm)" }]} value={v.type} onChange={(e) => setV({ ...v, type: e.target.value as "PERCENT" | "FIXED" })} />
        <Input label={v.type === "PERCENT" ? "Foiz" : "Summa (so'm)"} type="number" min={1} value={v.value} onChange={(e) => setV({ ...v, value: e.target.value })} />
      </div>
      {withCode && (
        <div className="grid grid-cols-2 gap-4">
          <Input label="Foydalanish limiti" type="number" min={1} value={v.max} onChange={(e) => setV({ ...v, max: e.target.value })} />
          <Input label="Minimal buyurtma (so'm)" type="number" min={0} value={v.min} onChange={(e) => setV({ ...v, min: e.target.value })} />
        </div>
      )}
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      <div className="flex justify-end"><Button loading={busy} onClick={submit}>Saqlash</Button></div>
    </div>
  );
}

const valueText = (type: "PERCENT" | "FIXED", value: number) => (type === "PERCENT" ? `${value}%` : formatMoney(value));

function Discounts() {
  const list = useLoad(() => api.discounts(), []);
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>Yangi chegirma</Button></div>
      {list.loading && !list.data ? <Skeleton className="h-32 rounded-2xl" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data || list.data.length === 0 ? <EmptyState title="Chegirmalar yo'q" /> : (
        <div className={tableWrap}>
          <table className="w-full text-left text-sm">
            <thead className={thead}><tr><th className={th}>Nomi</th><th className={th}>Qiymat</th><th className={th}>Tugaydi</th><th className={th}>Holat</th><th className={`${th} text-right`}>Amal</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {list.data.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 font-medium text-white">{d.name}</td>
                  <td className="px-4 py-3">{valueText(d.type, d.value)}</td>
                  <td className="px-4 py-3">{d.endsAt ? formatDateTime(d.endsAt) : "—"}</td>
                  <td className="px-4 py-3"><Badge variant={d.isActive ? "success" : "neutral"}>{d.isActive ? "Faol" : "O'chiq"}</Badge></td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => api.toggleDiscount(d.id, !d.isActive).then(() => list.reload()).catch((e: Error) => toast.error(e.message))}>{d.isActive ? "O'chirish" : "Yoqish"}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Yangi chegirma" maxWidth="md">
        <DiscountForm withCode={false} onSave={async (v) => { await api.createDiscount({ name: v.name, type: v.type, value: v.value }); toast.success("Saqlandi"); setOpen(false); void list.reload(); }} />
      </Modal>
    </div>
  );
}

function Coupons() {
  const list = useLoad(() => api.coupons(), []);
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>Yangi promo-kod</Button></div>
      {list.loading && !list.data ? <Skeleton className="h-32 rounded-2xl" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data || list.data.length === 0 ? <EmptyState title="Promo-kodlar yo'q" /> : (
        <div className={tableWrap}>
          <table className="w-full text-left text-sm">
            <thead className={thead}><tr><th className={th}>Kod</th><th className={th}>Qiymat</th><th className={th}>Ishlatilgan</th><th className={th}>Min. buyurtma</th><th className={th}>Holat</th><th className={`${th} text-right`}>Amal</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {list.data.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono font-medium text-white">{c.code}</td>
                  <td className="px-4 py-3">{valueText(c.type, c.value)}</td>
                  <td className="px-4 py-3">{c.redeemedCount}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}</td>
                  <td className="px-4 py-3">{c.minOrderAmount ? formatMoney(c.minOrderAmount) : "—"}</td>
                  <td className="px-4 py-3"><Badge variant={c.isActive ? "success" : "neutral"}>{c.isActive ? "Faol" : "O'chiq"}</Badge></td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => api.toggleCoupon(c.id, !c.isActive).then(() => list.reload()).catch((e: Error) => toast.error(e.message))}>{c.isActive ? "O'chirish" : "Yoqish"}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Yangi promo-kod" maxWidth="md">
        <DiscountForm withCode onSave={async (v) => { await api.createCoupon({ code: v.code, type: v.type, value: v.value, maxRedemptions: v.max, minOrderAmount: v.min }); toast.success("Saqlandi"); setOpen(false); void list.reload(); }} />
      </Modal>
    </div>
  );
}
