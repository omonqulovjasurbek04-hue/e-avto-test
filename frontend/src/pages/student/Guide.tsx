import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Lightbulb } from "lucide-react";
import { GUIDES, guideText } from "@/content/siteGuide";
import GuideIcon from "@/components/guide/GuideIcon";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/** One "Platformadan foydalanish" guide: numbered steps, a tip, a button to that part of the site, prev/next. */
export default function Guide() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const index = GUIDES.findIndex((g) => g.slug === slug);
  if (index < 0) return <Navigate to="/dashboard" replace />;

  const guide = GUIDES[index];
  const text = guideText(guide, i18n.language);
  const prev = GUIDES[index - 1];
  const next = GUIDES[index + 1];

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> {t("guide.back")}
      </Link>

      <header className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm shadow-brand-500/30">
          <GuideIcon kind={guide.icon} className="h-6 w-6" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-400">
            {t("guide.section")} · {index + 1}/{GUIDES.length}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{text.title}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{text.summary}</p>
        </div>
      </header>

      <Card>
        <CardContent className="p-6">
          <ol className="space-y-4">
            {text.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                  {i + 1}
                </span>
                <p className="pt-0.5 leading-relaxed text-slate-700 dark:text-slate-200">{step}</p>
              </li>
            ))}
          </ol>
          {text.tip && (
            <p className="mt-6 flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              <Lightbulb className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{text.tip}</span>
            </p>
          )}
          <Link to={guide.to} className="mt-6 inline-block">
            <Button>{text.action}</Button>
          </Link>
        </CardContent>
      </Card>

      <nav className="flex items-center justify-between gap-3" aria-label={t("guide.section")}>
        {prev ? (
          <Link to={`/guide/${prev.slug}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-600 dark:text-slate-300">
            <ArrowLeft className="h-4 w-4" /> {guideText(prev, i18n.language).title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/guide/${next.slug}`} className="inline-flex items-center gap-1.5 text-right text-sm font-medium text-slate-600 hover:text-brand-600 dark:text-slate-300">
            {guideText(next, i18n.language).title} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </nav>
    </article>
  );
}
