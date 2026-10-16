import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { siteService } from "@/services/site.service";
import { useLoad } from "@/hooks/useLoad";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import SafeHtml from "@/components/common/SafeHtml";
import { Skeleton } from "@/components/ui/Skeleton";
import NotFound from "@/pages/errors/NotFound";
import { formatDateTime } from "@/utils/money";

export default function NewsDetail() {
  const { t, i18n } = useTranslation();
  const { slug = "" } = useParams();
  const { data, loading, error } = useLoad(() => siteService.article(slug), [slug, i18n.language]);
  useDocumentMeta(data?.seoTitle || data?.title, data?.seoDescription || data?.summary);

  if (loading) return <div className="container-page max-w-3xl py-10"><Skeleton className="h-64 rounded-2xl" /></div>;
  if (error || !data) return <NotFound />;
  return (
    <article className="container-page max-w-3xl py-10">
      <Link to="/news" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> {t("news.back")}
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{data.title}</h1>
      <p className="mt-1 text-sm text-slate-500">{formatDateTime(data.publishedAt)}</p>
      {data.coverUrl && <img src={data.coverUrl} alt="" className="mt-6 aspect-video w-full rounded-2xl object-cover" />}
      <SafeHtml html={data.content} className="mt-6 space-y-3 text-slate-700 dark:text-slate-300" />
    </article>
  );
}
