import { useParams } from "react-router-dom";
import { siteService } from "@/services/site.service";
import { useLoad } from "@/hooks/useLoad";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import SafeHtml from "@/components/common/SafeHtml";
import { Skeleton } from "@/components/ui/Skeleton";
import NotFound from "@/pages/errors/NotFound";

/** Any published CMS page at /p/:slug. Drafts and unknown slugs both end up as 404. */
export default function CmsPage() {
  const { slug = "" } = useParams();
  const { data, loading, error } = useLoad(() => siteService.page(slug), [slug]);
  useDocumentMeta(data?.seoTitle || data?.title, data?.seoDescription);

  if (loading) return <div className="container-page max-w-3xl py-10"><Skeleton className="h-64 rounded-2xl" /></div>;
  if (error || !data) return <NotFound />;
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{data.title}</h1>
      <SafeHtml html={data.content} className="mt-6 space-y-3 text-slate-700 dark:text-slate-300" />
    </div>
  );
}
