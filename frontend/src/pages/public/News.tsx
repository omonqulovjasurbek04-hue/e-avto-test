import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { siteService } from "@/services/site.service";
import { useLoad } from "@/hooks/useLoad";
import { Card, CardContent } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateTime } from "@/utils/money";

export default function News() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useLoad(() => siteService.news(page), [page, i18n.language]);

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t("news.title")}</h1>
      <div className="mt-8">
        {loading && !data ? (
          <div className="grid gap-6 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title={t("news.emptyTitle")} />
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {data.items.map((n) => (
                <Link key={n.slug} to={`/news/${n.slug}`}>
                  <Card className="h-full overflow-hidden transition hover:border-brand-400">
                    {n.coverUrl && <img src={n.coverUrl} alt="" loading="lazy" className="aspect-video w-full object-cover" />}
                    <CardContent className="space-y-2 p-5">
                      <p className="text-xs text-slate-500">{formatDateTime(n.publishedAt)}</p>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{n.title}</h2>
                      {n.summary && <p className="text-sm text-slate-600 dark:text-slate-400">{n.summary}</p>}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            <div className="mt-8"><Pagination page={page} totalPages={data.pagination.totalPages} onChange={setPage} /></div>
          </>
        )}
      </div>
    </div>
  );
}
