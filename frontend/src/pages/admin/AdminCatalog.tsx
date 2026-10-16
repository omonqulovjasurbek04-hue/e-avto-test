import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [tab, setTab] = useState("packages");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t("admin.catalog.title")}</h1>
      <Tabs
        activeTab={tab}
        onChange={setTab}
        tabs={[{ id: "packages", label: t("admin.catalog.tabPackages") }, { id: "discounts", label: t("admin.catalog.tabDiscounts") }, { id: "coupons", label: t("admin.catalog.tabCoupons") }]}
      />
      {tab === "packages" && <Packages />}
      {tab === "discounts" && <Discounts />}
      {tab === "coupons" && <Coupons />}
    </div>
  );
}

function Packages() {
  const { t } = useTranslation();
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
    if (!form.courseId || form.name.trim().length < 2) return setErr(t("admin.catalog.needCourseName"));
    setBusy(true);
    setErr(null);
    try {
      await api.createPackage({ courseId: form.courseId, name: form.name.trim(), description: form.description.trim() || null, durationDays: form.durationDays ? Number(form.durationDays) : null });
      toast.success(t("admin.catalog.packageCreated"));
      setCreating(false);
      setForm({ courseId: "", name: "", description: "", durationDays: "" });
      void pkgs.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("admin.common.error"));
    } finally {
      setBusy(false);
    }
  };

  const savePrice = async () => {
    if (!pricing) return;
    const som = Number(price.som);
    if (!Number.isFinite(som) || som < 0) return setErr(t("admin.catalog.badPrice"));
    setBusy(true);
    setErr(null);
    try {
      await api.setPrice(pricing.id, { amount: fromSom(som), isSample: price.sample });
      toast.success(t("admin.catalog.priceSaved"));
      setPricing(null);
      void pkgs.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("admin.common.error"));
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!archiving) return;
    try {
      await api.archivePackage(archiving.id);
      toast.success(t("admin.catalog.packageArchived"));
      setArchiving(null);
      void pkgs.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.common.error"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setErr(null); setCreating(true); }}>{t("admin.catalog.newPackage")}</Button>
      </div>
      {pkgs.loading && !pkgs.data ? <Skeleton className="h-40 rounded-2xl" /> : pkgs.error ? <ErrorState message={pkgs.error} onRetry={pkgs.reload} /> : !pkgs.data || pkgs.data.length === 0 ? (
        <EmptyState title={t("admin.catalog.noPackages")} description={t("admin.catalog.noPackagesHint")} />
      ) : (
        <div className={tableWrap}>
          <table className="w-full text-left text-sm">
            <thead className={thead}><tr><th className={th}>{t("admin.common.course")}</th><th className={th}>{t("admin.catalog.package")}</th><th className={th}>{t("admin.catalog.currentPrice")}</th><th className={th}>{t("admin.catalog.duration")}</th><th className={th}>{t("admin.common.status")}</th><th className={`${th} text-right`}>{t("admin.common.actions")}</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {pkgs.data.map((p) => {
                const cur = p.prices.find((x) => !x.validTo);
                return (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3">{p.course.title}</td>
                    <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                    <td className="px-4 py-3">{cur ? <>{formatMoney(cur.amount, cur.currency)} {cur.isSample && <Badge variant="warning">{t("admin.catalog.sample")}</Badge>}</> : <span className="text-slate-500">{t("admin.common.notSet")}</span>}</td>
                    <td className="px-4 py-3">{p.durationDays ? t("admin.common.days", { count: p.durationDays }) : t("admin.common.unlimited")}</td>
                    <td className="px-4 py-3">{p.archivedAt ? <Badge variant="neutral">{t("admin.common.archived")}</Badge> : p.isActive ? <Badge variant="success">{t("admin.common.active")}</Badge> : <Badge variant="warning">{t("admin.common.inactive")}</Badge>}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {!p.archivedAt && (
                          <>
                            <Button size="sm" variant="outline" aria-label={t("admin.catalog.setPrice")} onClick={() => { setErr(null); setPrice({ som: cur ? String(toSom(cur.amount)) : "", sample: cur?.isSample ?? true }); setPricing(p); }}><BadgeDollarSign className="h-4 w-4" /></Button>
                            <Button size="sm" variant="danger" aria-label={t("admin.common.archive")} onClick={() => setArchiving(p)}><Archive className="h-4 w-4" /></Button>
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

      <Modal isOpen={creating} onClose={() => setCreating(false)} title={t("admin.catalog.newPackage")} maxWidth="lg">
        <div className="space-y-4">
          <Select label={t("admin.common.course")} options={[{ value: "", label: t("admin.common.choose") }, ...(courses.data ?? []).map((c) => ({ value: c.id, label: c.title }))]} value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} />
          <Input label={t("admin.catalog.packageName")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea label={t("admin.common.description")} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label={t("admin.catalog.accessDays")} type="number" min={1} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
          {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setCreating(false)}>{t("admin.common.cancel")}</Button><Button loading={busy} onClick={create}>{t("admin.common.save")}</Button></div>
        </div>
      </Modal>

      <Modal isOpen={pricing !== null} onClose={() => setPricing(null)} title={t("admin.catalog.priceTitle", { name: pricing?.name ?? "" })} maxWidth="md">
        <div className="space-y-4">
          <Input label={t("admin.catalog.priceSom")} type="number" min={0} value={price.som} onChange={(e) => setPrice({ ...price, som: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={price.sample} onChange={(e) => setPrice({ ...price, sample: e.target.checked })} /> {t("admin.catalog.samplePrice")}</label>
          <p className="text-xs text-slate-500">{t("admin.catalog.priceHint")}</p>
          {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setPricing(null)}>{t("admin.common.cancel")}</Button><Button loading={busy} onClick={savePrice}>{t("admin.common.save")}</Button></div>
        </div>
      </Modal>

      <ConfirmDialog open={archiving !== null} title={t("admin.catalog.archiveTitle")} message={t("admin.catalog.archiveText", { name: archiving?.name ?? "" })} confirmText={t("admin.common.archive")} onConfirm={archive} onCancel={() => setArchiving(null)} />
    </div>
  );
}

function DiscountForm({ onSave, withCode }: { onSave: (v: { name: string; code: string; type: "PERCENT" | "FIXED"; value: number; max: number | null; min: number }) => Promise<void>; withCode: boolean }) {
  const { t } = useTranslation();
  const [v, setV] = useState({ name: "", code: "", type: "PERCENT" as "PERCENT" | "FIXED", value: "", max: "", min: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const n = Number(v.value);
    if (!Number.isFinite(n) || n <= 0) return setErr(t("admin.catalog.enterValue"));
    if (v.type === "PERCENT" && n > 100) return setErr(t("admin.catalog.percentMax"));
    setBusy(true);
    setErr(null);
    try {
      await onSave({ name: v.name.trim(), code: v.code.trim(), type: v.type, value: v.type === "PERCENT" ? Math.round(n) : fromSom(n), max: v.max ? Number(v.max) : null, min: v.min ? fromSom(Number(v.min)) : 0 });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("admin.common.error"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      {withCode ? <Input label={t("admin.catalog.code")} value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} /> : <Input label={t("admin.common.name")} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}
      <div className="grid grid-cols-2 gap-4">
        <Select label={t("admin.common.type")} options={[{ value: "PERCENT", label: t("admin.catalog.percentOption") }, { value: "FIXED", label: t("admin.catalog.fixedOption") }]} value={v.type} onChange={(e) => setV({ ...v, type: e.target.value as "PERCENT" | "FIXED" })} />
        <Input label={v.type === "PERCENT" ? t("admin.catalog.percent") : t("admin.catalog.fixedOption")} type="number" min={1} value={v.value} onChange={(e) => setV({ ...v, value: e.target.value })} />
      </div>
      {withCode && (
        <div className="grid grid-cols-2 gap-4">
          <Input label={t("admin.catalog.usageLimit")} type="number" min={1} value={v.max} onChange={(e) => setV({ ...v, max: e.target.value })} />
          <Input label={t("admin.catalog.minOrder")} type="number" min={0} value={v.min} onChange={(e) => setV({ ...v, min: e.target.value })} />
        </div>
      )}
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      <div className="flex justify-end"><Button loading={busy} onClick={submit}>{t("admin.common.save")}</Button></div>
    </div>
  );
}

const valueText = (type: "PERCENT" | "FIXED", value: number) => (type === "PERCENT" ? `${value}%` : formatMoney(value));

function Discounts() {
  const { t } = useTranslation();
  const list = useLoad(() => api.discounts(), []);
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>{t("admin.catalog.newDiscount")}</Button></div>
      {list.loading && !list.data ? <Skeleton className="h-32 rounded-2xl" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data || list.data.length === 0 ? <EmptyState title={t("admin.catalog.noDiscounts")} /> : (
        <div className={tableWrap}>
          <table className="w-full text-left text-sm">
            <thead className={thead}><tr><th className={th}>{t("admin.common.name")}</th><th className={th}>{t("admin.catalog.value")}</th><th className={th}>{t("admin.catalog.endsAt")}</th><th className={th}>{t("admin.common.status")}</th><th className={`${th} text-right`}>{t("admin.common.action")}</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {list.data.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 font-medium text-white">{d.name}</td>
                  <td className="px-4 py-3">{valueText(d.type, d.value)}</td>
                  <td className="px-4 py-3">{d.endsAt ? formatDateTime(d.endsAt) : "—"}</td>
                  <td className="px-4 py-3"><Badge variant={d.isActive ? "success" : "neutral"}>{d.isActive ? t("admin.common.active") : t("admin.common.off")}</Badge></td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => api.toggleDiscount(d.id, !d.isActive).then(() => list.reload()).catch((e: Error) => toast.error(e.message))}>{d.isActive ? t("admin.common.turnOff") : t("admin.common.turnOn")}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal isOpen={open} onClose={() => setOpen(false)} title={t("admin.catalog.newDiscount")} maxWidth="md">
        <DiscountForm withCode={false} onSave={async (v) => { await api.createDiscount({ name: v.name, type: v.type, value: v.value }); toast.success(t("admin.common.saved")); setOpen(false); void list.reload(); }} />
      </Modal>
    </div>
  );
}

function Coupons() {
  const { t } = useTranslation();
  const list = useLoad(() => api.coupons(), []);
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>{t("admin.catalog.newCoupon")}</Button></div>
      {list.loading && !list.data ? <Skeleton className="h-32 rounded-2xl" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data || list.data.length === 0 ? <EmptyState title={t("admin.catalog.noCoupons")} /> : (
        <div className={tableWrap}>
          <table className="w-full text-left text-sm">
            <thead className={thead}><tr><th className={th}>{t("admin.catalog.codeColumn")}</th><th className={th}>{t("admin.catalog.value")}</th><th className={th}>{t("admin.catalog.used")}</th><th className={th}>{t("admin.catalog.minOrderShort")}</th><th className={th}>{t("admin.common.status")}</th><th className={`${th} text-right`}>{t("admin.common.action")}</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {list.data.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono font-medium text-white">{c.code}</td>
                  <td className="px-4 py-3">{valueText(c.type, c.value)}</td>
                  <td className="px-4 py-3">{c.redeemedCount}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}</td>
                  <td className="px-4 py-3">{c.minOrderAmount ? formatMoney(c.minOrderAmount) : "—"}</td>
                  <td className="px-4 py-3"><Badge variant={c.isActive ? "success" : "neutral"}>{c.isActive ? t("admin.common.active") : t("admin.common.off")}</Badge></td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => api.toggleCoupon(c.id, !c.isActive).then(() => list.reload()).catch((e: Error) => toast.error(e.message))}>{c.isActive ? t("admin.common.turnOff") : t("admin.common.turnOn")}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal isOpen={open} onClose={() => setOpen(false)} title={t("admin.catalog.newCoupon")} maxWidth="md">
        <DiscountForm withCode onSave={async (v) => { await api.createCoupon({ code: v.code, type: v.type, value: v.value, maxRedemptions: v.max, minOrderAmount: v.min }); toast.success(t("admin.common.saved")); setOpen(false); void list.reload(); }} />
      </Modal>
    </div>
  );
}
