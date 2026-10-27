import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatMoney } from "@/utils/money";
import { adminService } from "@/services/admin.service";
import type { AdminCourse } from "@/types/admin";
import { LEVELS, useCourseEditor } from "@/components/admin/CourseEditor";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function AdminCourses() {
  const { t } = useTranslation();
  const levelLabel = (v: string) => {
    const key = LEVELS.find(([value]) => value === v)?.[1];
    return key ? t(`admin.courses.${key}`) : v;
  };
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    adminService
      .listCourses()
      .then(setCourses)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  const editor = useCourseEditor(load);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">{t("admin.courses.title")}</h1>
        <Button onClick={() => editor.openNew(courses.length + 1)} leftIcon={<Plus className="h-4 w-4" />}>
          {t("admin.courses.new")}
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : courses.length === 0 ? (
        <EmptyState title={t("admin.courses.empty")} description={t("admin.courses.emptyHint")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">{t("admin.common.order")}</th>
                <th className="px-4 py-3">{t("admin.common.name")}</th>
                <th className="px-4 py-3">{t("admin.courses.category")}</th>
                <th className="px-4 py-3">{t("admin.courses.level")}</th>
                <th className="px-4 py-3">{t("admin.courses.lessons")}</th>
                <th className="px-4 py-3">{t("admin.courses.price")}</th>
                <th className="px-4 py-3">{t("admin.common.status")}</th>
                <th className="px-4 py-3 text-right">{t("admin.common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">{c.order}</td>
                  <td className="px-4 py-3 font-medium text-white">{c.title}</td>
                  <td className="px-4 py-3">{c.category?.name ?? <span className="text-slate-500">—</span>}</td>
                  <td className="px-4 py-3">{levelLabel(c.level)}</td>
                  <td className="px-4 py-3">{c.lessonCount}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {c.price ? (
                      <>
                        {formatMoney(c.price.amount, c.price.currency)}
                        {c.price.isSample && <Badge variant="warning" className="ml-2">{t("admin.courses.sample")}</Badge>}
                      </>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={c.isPublished ? "success" : "neutral"}>
                      {c.isPublished ? t("admin.common.published") : t("admin.common.draft")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" aria-label={t("admin.common.edit")} onClick={() => editor.openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="danger" aria-label={t("admin.common.delete")} onClick={() => editor.askDelete(c)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editor.dialogs}
    </div>
  );
}
