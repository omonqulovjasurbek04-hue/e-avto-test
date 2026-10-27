import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Archive, BadgeDollarSign, Check, Package, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { adminPlatformService as api, type AdminPackage } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { formatMoney, fromSom, toSom } from "@/utils/money";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const field =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

/**
 * A course's packages (what students buy) inside the course window: price change, archive, and a new
 * package with its price in one go. Prices are stored in tiyin; the form speaks whole so'm.
 */
export function CoursePackages({ courseId, onChanged }: { courseId: string; onChanged: () => void }) {
  const { t } = useTranslation();
  const all = useLoad(() => api.packages(), []);
  const packages = (all.data ?? []).filter((p) => p.courseId === courseId);

  const [pricing, setPricing] = useState<{ id: string; som: string; sample: boolean } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", days: "", som: "" });
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(done);
      void all.reload();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.common.error"));
    } finally {
      setBusy(false);
    }
  };

  const savePrice = () =>
    pricing &&
    run(async () => {
      await api.setPrice(pricing.id, { amount: fromSom(Number(pricing.som)), isSample: pricing.sample });
      setPricing(null);
    }, t("admin.catalog.priceSaved"));

  const archive = (p: AdminPackage) =>
    run(async () => {
      await api.archivePackage(p.id);
      setConfirming(null);
    }, t("admin.catalog.packageArchived"));

  const create = () =>
    run(async () => {
      const pkg = await api.createPackage({ courseId, name: form.name.trim(), durationDays: form.days ? Number(form.days) : null });
      if (form.som) await api.setPrice(pkg.id, { amount: fromSom(Number(form.som)), isSample: false });
      setForm({ name: "", days: "", som: "" });
      setAdding(false);
    }, t("admin.catalog.packageCreated"));

  const priceOk = (s: string) => s !== "" && Number.isFinite(Number(s)) && Number(s) >= 0;

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <Package className="h-4 w-4" aria-hidden /> {t("admin.courses.packages")}
      </p>
      {packages.length === 0 && !all.loading && <p className="text-sm text-slate-500">{t("admin.catalog.noPackages")}</p>}
      <ul className="space-y-1.5">
        {packages.map((p) => {
          const cur = p.prices.find((x) => !x.validTo);
          return (
            <li key={p.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 font-medium text-slate-800 dark:text-slate-100">{p.name}</span>
                <span className="text-slate-600 dark:text-slate-300">{cur ? formatMoney(cur.amount, cur.currency) : t("admin.common.notSet")}</span>
                {cur?.isSample && <Badge variant="warning">{t("admin.catalog.sample")}</Badge>}
                <span className="text-xs text-slate-400">{p.durationDays ? t("admin.common.days", { count: p.durationDays }) : t("admin.common.unlimited")}</span>
                {p.archivedAt ? (
                  <Badge variant="neutral">{t("admin.common.archived")}</Badge>
                ) : confirming === p.id ? (
                  <>
                    <Button size="sm" variant="danger" loading={busy} onClick={() => void archive(p)}>
                      {t("admin.common.archive")}
                    </Button>
                    <button type="button" onClick={() => setConfirming(null)} aria-label={t("admin.common.cancel")} className="rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800">
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setPricing({ id: p.id, som: cur ? String(toSom(cur.amount)) : "", sample: cur?.isSample ?? false })}
                      aria-label={t("admin.catalog.setPrice")}
                      title={t("admin.catalog.setPrice")}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-brand-600 dark:hover:bg-slate-800"
                    >
                      <BadgeDollarSign className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setConfirming(p.id)} aria-label={t("admin.common.archive")} title={t("admin.common.archive")} className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                      <Archive className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              {pricing?.id === p.id && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="number" min={0} value={pricing.som} onChange={(e) => setPricing({ ...pricing, som: e.target.value })} placeholder={t("admin.catalog.priceSom")} aria-label={t("admin.catalog.priceSom")} className={`${field} max-w-[12rem]`} />
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <input type="checkbox" checked={pricing.sample} onChange={(e) => setPricing({ ...pricing, sample: e.target.checked })} /> {t("admin.catalog.samplePrice")}
                  </label>
                  <Button size="sm" loading={busy} disabled={!priceOk(pricing.som)} leftIcon={<Check className="h-4 w-4" />} onClick={() => void savePrice()}>
                    {t("admin.common.save")}
                  </Button>
                  <button type="button" onClick={() => setPricing(null)} aria-label={t("admin.common.cancel")} className="rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {adding ? (
        <div className="grid gap-2 border-t border-slate-200 pt-2 sm:grid-cols-[2fr_1fr_1fr_auto] dark:border-slate-700">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("admin.catalog.packageName")} aria-label={t("admin.catalog.packageName")} className={field} />
          <input type="number" min={1} value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} placeholder={t("admin.catalog.accessDays")} aria-label={t("admin.catalog.accessDays")} className={field} />
          <input type="number" min={0} value={form.som} onChange={(e) => setForm({ ...form, som: e.target.value })} placeholder={t("admin.catalog.priceSom")} aria-label={t("admin.catalog.priceSom")} className={field} />
          <div className="flex gap-1">
            <Button size="sm" loading={busy} disabled={form.name.trim().length < 2 || (form.som !== "" && !priceOk(form.som))} onClick={() => void create()}>
              {t("admin.common.save")}
            </Button>
            <button type="button" onClick={() => setAdding(false)} aria-label={t("admin.common.cancel")} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>
          {t("admin.catalog.newPackage")}
        </Button>
      )}
    </div>
  );
}
