import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ShoppingCart, Tag } from "lucide-react";
import { shopService, studentService, type PublicPackage, type Quote } from "@/services/platform.service";
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

/**
 * Packages (tariffs) with their prices and the buy flow: coupon check, server-side quote, order.
 * With `courseId` only that course's packages are listed (the course page); without it, all of them.
 */
export default function CoursePackages({
  courseId,
  showCourseTitle = !courseId,
  variant = "cards",
  onLoaded,
}: {
  courseId?: string;
  showCourseTitle?: boolean;
  /** "hero": compact price + buy rows on a dark background (inside the course page header). */
  variant?: "cards" | "hero";
  /** Called with this course's packages once they are loaded (the course page shows the access days). */
  onLoaded?: (packages: PublicPackage[]) => void;
}) {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useLoad(() => shopService.packages(), []);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const packages = (data ?? []).filter((p) => !courseId || p.courseId === courseId);
  useEffect(() => {
    if (data) onLoaded?.(data.filter((p) => !courseId || p.courseId === courseId));
    // Only when the list arrives; the callback identity does not matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, courseId]);

  // A course the student already bought is marked instead of offered again.
  const [owned, setOwned] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!isAuthenticated) return;
    studentService
      .courseAccess()
      .then((a) => setOwned(new Set(a.all ? [] : a.courseIds)))
      .catch(() => undefined);
  }, [isAuthenticated]);

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
      navigate("/login", { state: { from: { pathname } } });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      // Only the package id and coupon code are sent; the server recomputes every amount.
      const order = await shopService.createOrder(selected.id, quote?.couponApplied ? coupon.trim() : undefined);
      toast.success(t("pricing.created"));
      // A real provider returns its checkout page; only https links are followed.
      if (order.redirectUrl && /^https:\/\//i.test(order.redirectUrl)) {
        window.location.assign(order.redirectUrl);
        return;
      }
      navigate("/orders");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("pricing.orderError"));
    } finally {
      setBusy(false);
    }
  };

  const hero = variant === "hero";

  return (
    <>
      {hero ? (
        loading ? (
          <Skeleton className="h-24 rounded-2xl bg-white/10" />
        ) : error || packages.length === 0 ? null : (
          <div className="space-y-4">
            {packages.map((p) => {
              const bought = owned.has(p.courseId);
              return (
                <div key={p.id} className="flex flex-wrap items-end justify-between gap-4 md:flex-nowrap">
                  <div className="min-w-0 drop-shadow-lg">
                    {packages.length > 1 && (
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">
                        {p.name} · {p.durationDays ? t("pricing.days", { count: p.durationDays }) : t("pricing.unlimited")}
                      </p>
                    )}
                    <p className="whitespace-nowrap text-3xl font-black md:text-2xl lg:text-4xl">{formatMoney(p.price.amount, p.price.currency)}</p>
                  </div>
                  {bought ? (
                    <Badge variant="success" className="py-2 text-sm">
                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> {t("tests.owned")}
                    </Badge>
                  ) : (
                    <Button size="lg" className="shrink-0 shadow-lg" onClick={() => open(p)} leftIcon={<ShoppingCart className="h-4 w-4" />}>{t("pricing.buy")}</Button>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : loading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : packages.length === 0 ? (
        <EmptyState title={t("pricing.emptyTitle")} description={t("pricing.emptyDesc")} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => {
            const bought = owned.has(p.courseId);
            return (
              <Card key={p.id}>
                <CardContent className="flex h-full flex-col gap-3 p-6">
                  {showCourseTitle && <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">{p.course.title}</p>}
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{p.name}</h3>
                  {p.description && <p className="text-sm text-slate-600 dark:text-slate-400">{p.description}</p>}
                  <div className="mt-auto pt-2">
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{formatMoney(p.price.amount, p.price.currency)}</p>
                    <p className="text-xs text-slate-500">{p.durationDays ? t("pricing.days", { count: p.durationDays }) : t("pricing.unlimited")}</p>
                    {p.price.isSample && <Badge variant="warning" className="mt-2">{t("pricing.sample")}</Badge>}
                  </div>
                  {bought ? (
                    <Badge variant="success" className="justify-center py-2 text-sm">
                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> {t("tests.owned")}
                    </Badge>
                  ) : (
                    <Button onClick={() => open(p)} leftIcon={<ShoppingCart className="h-4 w-4" />}>{t("pricing.buy")}</Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
          {!isAuthenticated && <p className="text-sm text-slate-500">{t("pricing.loginPrefix")} <Link to="/login" state={{ from: { pathname } }} className="text-primary-600 underline">{t("pricing.loginLink")}</Link>.</p>}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setSelected(null)}>{t("pricing.close")}</Button>
            <Button loading={busy} disabled={!quote} onClick={buy}>{t("pricing.order")}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
