import { useState } from "react";
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
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [detail, setDetail] = useState<AuditRow | null>(null);
  const a = useDebounce(action, 400);
  const e = useDebounce(entity, 400);
  const list = useLoad(() => apiGetPage<AuditRow>("/admin/audit", { page, action: a || undefined, entity: e || undefined }), [page, a, e]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Audit jurnali</h1>
      <p className="text-xs text-slate-500">Muhim amallar yozib boriladi. Jurnalni o'zgartirish yoki o'chirish imkoni yo'q; parol, token va karta ma'lumotlari saqlanmaydi.</p>
      <div className="flex flex-wrap gap-3">
        <div className="min-w-56 flex-1"><Input aria-label="Amal" placeholder="Amal (masalan: refund, attendance)" value={action} onChange={(ev) => { setAction(ev.target.value); setPage(1); }} /></div>
        <div className="min-w-56 flex-1"><Input aria-label="Obyekt" placeholder="Obyekt (User, Payment, Question…)" value={entity} onChange={(ev) => { setEntity(ev.target.value); setPage(1); }} /></div>
      </div>

      {list.loading && !list.data ? <Skeleton className="h-48 rounded-2xl" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data || list.data.items.length === 0 ? (
        <EmptyState title="Yozuvlar topilmadi" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">Vaqt</th><th className="px-4 py-3">Kim</th><th className="px-4 py-3">Amal</th><th className="px-4 py-3">Obyekt</th><th className="px-4 py-3 text-right">Tafsilot</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {list.data.items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                    <td className="px-4 py-3">{r.actor ? <>{r.actor.name} <span className="text-xs text-slate-500">({r.actor.role})</span></> : <span className="text-slate-500">tizim</span>}</td>
                    <td className="px-4 py-3 font-mono text-xs text-white">{r.action}</td>
                    <td className="px-4 py-3">{r.entity}{r.entityId ? <span className="text-xs text-slate-500"> · {r.entityId.slice(0, 8)}</span> : null}</td>
                    <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => setDetail(r)}>Ko'rish</Button></td>
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
            {detail.reason && <p><span className="text-slate-400">Sabab:</span> {detail.reason}</p>}
            <div><p className="mb-1 text-xs uppercase text-slate-500">Oldin</p><pre className="max-h-48 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300">{JSON.stringify(detail.before, null, 2) ?? "—"}</pre></div>
            <div><p className="mb-1 text-xs uppercase text-slate-500">Keyin</p><pre className="max-h-48 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300">{JSON.stringify(detail.after, null, 2) ?? "—"}</pre></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
