import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ShoppingCart, Tag } from "lucide-react";
import { shopService, type PublicPackage, type Quote } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatMoney } from "@/utils/money";

export default function Pricing() {
  const { t } = useTranslation();
  const { data: packages, loading, error, reload } = useLoad(() => shopService.packages(), []);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  const [selected, setSelected] = useState<PublicPackage | null>(null);
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const open = async (pkg: PublicPackage) => {
    setSelected(pkg);
    setCoupon("");
    setMessage(null);
    setQuote(null);
    try {
      setQuote(await shopService.quote(pkg.id));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("pricing.quoteError"));
    }
  };

  const applyCoupon = async () => {
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    try {
      const q = await shopService.quote(selected.id, coupon.trim());
      setQuote(q);
      if (coupon.trim() && !q.couponApplied) {
        setMessage(t(`pricing.reasons.${q.couponRejection ?? "inactive"}`, { defaultValue: t("pricing.reasons.generic") }));
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const buy = async () => {
    if (!selected) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/pricing" } } });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      // Only the package id and coupon code are sent; the server recomputes every amount.
      await shopService.createOrder(selected.id, quote?.couponApplied ? coupon.trim() : undefined);
      toast.success(t("pricing.created"));
      navigate("/orders");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("pricing.orderError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t("pricing.title")}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">{t("pricing.subtitle")}</p>

      <div className="mt-8">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !packages || packages.length === 0 ? (
          <EmptyState title={t("pricing.emptyTitle")} description={t("pricing.emptyDesc")} />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {packages.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex h-full flex-col gap-3 p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">{p.course.title}</p>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{p.name}</h2>
                  {p.description && <p className="text-sm text-slate-600 dark:text-slate-400">{p.description}</p>}
                  <div className="mt-auto pt-2">
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{formatMoney(p.price.amount, p.price.currency)}</p>
                    <p className="text-xs text-slate-500">{p.durationDays ? t("pricing.days", { count: p.durationDays }) : t("pricing.unlimited")}</p>
                    {p.price.isSample && <Badge variant="warning" className="mt-2">{t("pricing.sample")}</Badge>}
                  </div>
                  <Button onClick={() => open(p)} leftIcon={<ShoppingCart className="h-4 w-4" />}>{t("pricing.buy")}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={selected !== null} onClose={() => setSelected(null)} title={selected ? `${selected.course.title} — ${selected.name}` : ""} maxWidth="md">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input label={t("pricing.coupon")} value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder={t("pricing.couponPlaceholder")} />
            <Button variant="outline" className="self-end" loading={busy} onClick={applyCoupon} leftIcon={<Tag className="h-4 w-4" />}>{t("pricing.apply")}</Button>
          </div>
          {quote && (
            <dl className="space-y-1 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
              <div className="flex justify-between"><dt>{t("pricing.price")}</dt><dd>{formatMoney(quote.subtotal, quote.currency)}</dd></div>
              <div className="flex justify-between"><dt>{t("pricing.discount")}</dt><dd>-{formatMoney(quote.discountTotal, quote.currency)}</dd></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold dark:border-slate-700"><dt>{t("pricing.total")}</dt><dd>{formatMoney(quote.total, quote.currency)}</dd></div>
            </dl>
          )}
          {message && <Alert variant="warning">{message}</Alert>}
          {!isAuthenticated && <p className="text-sm text-slate-500">{t("pricing.loginPrefix")} <Link to="/login" className="text-primary-600 underline">{t("pricing.loginLink")}</Link>.</p>}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setSelected(null)}>{t("pricing.close")}</Button>
            <Button loading={busy} disabled={!quote} onClick={buy}>{t("pricing.order")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
