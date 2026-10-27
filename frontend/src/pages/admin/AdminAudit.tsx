import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiGetPage } from "@/services/api";
import { useLoad } from "@/hooks/useLoad";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateTime } from "@/utils/money";

interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  reason: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
  actor: { id: string; name: string; role: string } | null;
}

export default function AdminAudit() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [detail, setDetail] = useState<AuditRow | null>(null);
  const a = useDebounce(action, 400);
  const e = useDebounce(entity, 400);
  const list = useLoad(() => apiGetPage<AuditRow>("/admin/audit", { page, action: a || undefined, entity: e || undefined }), [page, a, e]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("admin.audit.title")}</h1>
      <p className="text-xs text-slate-500">{t("admin.audit.hint")}</p>
      <div className="flex flex-wrap gap-3">
        <div className="min-w-56 flex-1"><Input aria-label={t("admin.audit.action")} placeholder={t("admin.audit.actionPlaceholder")} value={action} onChange={(ev) => { setAction(ev.target.value); setPage(1); }} /></div>
        <div className="min-w-56 flex-1"><Input aria-label={t("admin.audit.entity")} placeholder={t("admin.audit.entityPlaceholder")} value={entity} onChange={(ev) => { setEntity(ev.target.value); setPage(1); }} /></div>
      </div>

      {list.loading && !list.data ? <Skeleton className="h-48 rounded-2xl" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data || list.data.items.length === 0 ? (
        <EmptyState title={t("admin.audit.empty")} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 text-xs uppercase text-slate-500 dark:text-slate-400"><tr><th className="px-4 py-3">{t("admin.audit.time")}</th><th className="px-4 py-3">{t("admin.audit.who")}</th><th className="px-4 py-3">{t("admin.audit.action")}</th><th className="px-4 py-3">{t("admin.audit.entity")}</th><th className="px-4 py-3 text-right">{t("admin.audit.details")}</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {list.data.items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                    <td className="px-4 py-3">{r.actor ? <>{r.actor.name} <span className="text-xs text-slate-500">({t(`roles.${r.actor.role}`, r.actor.role)})</span></> : <span className="text-slate-500">{t("admin.common.system")}</span>}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-900 dark:text-white">{r.action}</td>
                    <td className="px-4 py-3">{r.entity}{r.entityId ? <span className="text-xs text-slate-500"> · {r.entityId.slice(0, 8)}</span> : null}</td>
                    <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => setDetail(r)}>{t("admin.common.view")}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={list.data.pagination.totalPages} onChange={setPage} />
        </>
      )}

      <Modal isOpen={detail !== null} onClose={() => setDetail(null)} title={detail?.action ?? ""} maxWidth="lg">
        {detail && (
          <div className="space-y-3 text-sm">
            {detail.reason && <p><span className="text-slate-500 dark:text-slate-400">{t("admin.common.reason")}:</span> {detail.reason}</p>}
            <div><p className="mb-1 text-xs uppercase text-slate-500">{t("admin.audit.before")}</p><pre className="max-h-48 overflow-auto rounded-xl bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-600 dark:text-slate-300">{JSON.stringify(detail.before, null, 2) ?? "—"}</pre></div>
            <div><p className="mb-1 text-xs uppercase text-slate-500">{t("admin.audit.after")}</p><pre className="max-h-48 overflow-auto rounded-xl bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-600 dark:text-slate-300">{JSON.stringify(detail.after, null, 2) ?? "—"}</pre></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
