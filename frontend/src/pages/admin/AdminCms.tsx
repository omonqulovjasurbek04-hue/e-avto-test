import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import { adminPlatformService as api, type CmsFaq, type CmsNews, type CmsPage, type ContactMessage } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDateTime } from "@/utils/money";

const STATUS_OPTIONS = [{ value: "DRAFT", label: "Qoralama" }, { value: "PUBLISHED", label: "Nashr etilgan" }];
const th = "px-4 py-3";
const thead = "bg-slate-950 text-xs uppercase text-slate-400";
const wrap = "overflow-x-auto rounded-2xl border border-slate-800";

export default function AdminCms() {
  const [tab, setTab] = useState("pages");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Sayt kontenti</h1>
      <Tabs
        activeTab={tab}
        onChange={setTab}
        tabs={[
          { id: "pages", label: "Sahifalar" },
          { id: "news", label: "Yangiliklar" },
          { id: "faq", label: "FAQ" },
          { id: "messages", label: "Murojaatlar" },
          { id: "announce", label: "E'lon yuborish" },
          { id: "settings", label: "Sozlamalar" },
        ]}
      />
      {tab === "pages" && <Pages />}
      {tab === "news" && <News />}
      {tab === "faq" && <Faq />}
      {tab === "messages" && <Messages />}
      {tab === "announce" && <Announce />}
      {tab === "settings" && <Settings />}
    </div>
  );
}

function StatusBadge({ status }: { status: "DRAFT" | "PUBLISHED" }) {
  return <Badge variant={status === "PUBLISHED" ? "success" : "neutral"}>{status === "PUBLISHED" ? "Nashr etilgan" : "Qoralama"}</Badge>;
}

/* ───── pages & news share one editor ───── */

interface DocForm { slug: string; title: string; summary: string; content: string; seoTitle: string; seoDescription: string; status: "DRAFT" | "PUBLISHED" }
const emptyDoc: DocForm = { slug: "", title: "", summary: "", content: "", seoTitle: "", seoDescription: "", status: "DRAFT" };

function DocEditor({ kind, initial, onClose, onSaved, id }: { kind: "page" | "news"; initial: DocForm; id: string | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (f.title.trim().length < 2) return setErr("Sarlavha kiritilishi shart");
    setBusy(true);
    setErr(null);
    const base = { title: f.title.trim(), content: f.content, seoTitle: f.seoTitle.trim() || null, seoDescription: f.seoDescription.trim() || null, status: f.status, ...(f.slug.trim() ? { slug: f.slug.trim() } : {}) };
    try {
      if (kind === "page") await api.savePage(id, base);
      else await api.saveNews(id, { ...base, summary: f.summary.trim() || null });
      toast.success("Saqlandi");
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Saqlashda xatolik");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={id ? "Tahrirlash" : kind === "page" ? "Yangi sahifa" : "Yangi yangilik"} maxWidth="2xl">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Sarlavha" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <Input label="Slug (lotin, bo'sh = sarlavhadan)" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })} />
        </div>
        {kind === "news" && <Textarea label="Qisqa mazmun" rows={2} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} />}
        <Textarea label="Matn (HTML: p, h2-h4, ul/ol, a, img, table…)" rows={10} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} />
        <p className="text-xs text-slate-500">Xavfli teglar (script, iframe, onclick va h.k.) saqlashda server tomonidan avtomatik olib tashlanadi.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="SEO sarlavha (≤70)" value={f.seoTitle} onChange={(e) => setF({ ...f, seoTitle: e.target.value })} />
          <Input label="SEO tavsif (≤170)" value={f.seoDescription} onChange={(e) => setF({ ...f, seoDescription: e.target.value })} />
        </div>
        <Select label="Holat" options={STATUS_OPTIONS} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as DocForm["status"] })} />
        {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
        <div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Bekor qilish</Button><Button loading={busy} onClick={save}>Saqlash</Button></div>
      </div>
    </Modal>
  );
}

function Pages() {
  const list = useLoad(() => api.pages(), []);
  const [editing, setEditing] = useState<{ id: string | null; form: DocForm } | null>(null);
  const edit = (p: CmsPage) => setEditing({ id: p.id, form: { ...emptyDoc, slug: p.slug, title: p.title, content: p.content, seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "", status: p.status } });
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ id: null, form: emptyDoc })}>Yangi sahifa</Button></div>
      {list.loading && !list.data ? <Skeleton className="h-32 rounded-2xl" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data || list.data.length === 0 ? <EmptyState title="Sahifalar yo'q" description="Masalan: biz-haqimizda, maxfiylik." /> : (
        <div className={wrap}><table className="w-full text-left text-sm">
          <thead className={thead}><tr><th className={th}>Sarlavha</th><th className={th}>Slug</th><th className={th}>Holat</th><th className={th}>Yangilangan</th><th className={`${th} text-right`}>Amal</th></tr></thead>
          <tbody className="divide-y divide-slate-800">{list.data.map((p) => (
            <tr key={p.id}><td className="px-4 py-3 font-medium text-white">{p.title}</td><td className="px-4 py-3 font-mono text-xs">{p.slug}</td><td className="px-4 py-3"><StatusBadge status={p.status} /></td><td className="px-4 py-3">{formatDateTime(p.updatedAt)}</td>
              <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" aria-label="Tahrirlash" onClick={() => edit(p)}><Pencil className="h-4 w-4" /></Button></td></tr>
          ))}</tbody></table></div>
      )}
      {editing && <DocEditor kind="page" id={editing.id} initial={editing.form} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void list.reload(); }} />}
    </div>
  );
}

function News() {
  const list = useLoad(() => api.news(), []);
  const [editing, setEditing] = useState<{ id: string | null; form: DocForm } | null>(null);
  const edit = (n: CmsNews) => setEditing({ id: n.id, form: { ...emptyDoc, slug: n.slug, title: n.title, summary: n.summary ?? "", content: n.content, status: n.status } });
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ id: null, form: emptyDoc })}>Yangi yangilik</Button></div>
      {list.loading && !list.data ? <Skeleton className="h-32 rounded-2xl" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data || list.data.length === 0 ? <EmptyState title="Yangiliklar yo'q" /> : (
        <div className={wrap}><table className="w-full text-left text-sm">
          <thead className={thead}><tr><th className={th}>Sarlavha</th><th className={th}>Holat</th><th className={th}>Nashr sanasi</th><th className={`${th} text-right`}>Amal</th></tr></thead>
          <tbody className="divide-y divide-slate-800">{list.data.map((n) => (
            <tr key={n.id}><td className="px-4 py-3 font-medium text-white">{n.title}</td><td className="px-4 py-3"><StatusBadge status={n.status} /></td><td className="px-4 py-3">{n.publishedAt ? formatDateTime(n.publishedAt) : "—"}</td>
              <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" aria-label="Tahrirlash" onClick={() => edit(n)}><Pencil className="h-4 w-4" /></Button></td></tr>
          ))}</tbody></table></div>
      )}
      {editing && <DocEditor kind="news" id={editing.id} initial={editing.form} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void list.reload(); }} />}
    </div>
  );
}

function Faq() {
  const list = useLoad(() => api.faq(), []);
  const [editing, setEditing] = useState<{ id: string | null; q: string; a: string; published: boolean } | null>(null);
  const [deleting, setDeleting] = useState<CmsFaq | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!editing) return;
    if (editing.q.trim().length < 3 || !editing.a.trim()) return setErr("Savol va javobni kiriting");
    setBusy(true);
    setErr(null);
    try {
      await api.saveFaq(editing.id, { question: editing.q.trim(), answer: editing.a, isPublished: editing.published });
      toast.success("Saqlandi");
      setEditing(null);
      void list.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setErr(null); setEditing({ id: null, q: "", a: "", published: true }); }}>Yangi savol</Button></div>
      {list.loading && !list.data ? <Skeleton className="h-32 rounded-2xl" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data || list.data.length === 0 ? <EmptyState title="FAQ bo'sh" /> : (
        <ul className="divide-y divide-slate-800 rounded-2xl border border-slate-800">
          {list.data.map((f) => (
            <li key={f.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div><p className="font-medium text-white">{f.question} {!f.isPublished && <Badge variant="neutral">Yashirin</Badge>}</p></div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" aria-label="Tahrirlash" onClick={() => { setErr(null); setEditing({ id: f.id, q: f.question, a: f.answer, published: f.isPublished }); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="danger" aria-label="O'chirish" onClick={() => setDeleting(f)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? "Savolni tahrirlash" : "Yangi savol"} maxWidth="lg">
        {editing && (
          <div className="space-y-4">
            <Input label="Savol" value={editing.q} onChange={(e) => setEditing({ ...editing, q: e.target.value })} />
            <Textarea label="Javob" rows={5} value={editing.a} onChange={(e) => setEditing({ ...editing, a: e.target.value })} />
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} /> Saytda ko'rinsin</label>
            {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
            <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setEditing(null)}>Bekor qilish</Button><Button loading={busy} onClick={save}>Saqlash</Button></div>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={deleting !== null} title="Savolni o'chirish" message={`"${deleting?.question ?? ""}" o'chiriladi.`} confirmText="O'chirish" onCancel={() => setDeleting(null)}
        onConfirm={async () => { if (!deleting) return; try { await api.deleteFaq(deleting.id); setDeleting(null); void list.reload(); } catch (e) { toast.error(e instanceof Error ? e.message : "Xatolik"); } }} />
    </div>
  );
}

const MSG: Record<ContactMessage["status"], { label: string; variant: "danger" | "neutral" | "success" }> = {
  NEW: { label: "Yangi", variant: "danger" }, READ: { label: "O'qilgan", variant: "success" }, ARCHIVED: { label: "Arxiv", variant: "neutral" },
};

function Messages() {
  const list = useLoad(() => api.messages(), []);
  const set = (id: string, status: ContactMessage["status"]) => api.setMessageStatus(id, status).then(() => list.reload()).catch((e: Error) => toast.error(e.message));
  return (
    <div className="space-y-3">
      {list.loading && !list.data ? <Skeleton className="h-32 rounded-2xl" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data || list.data.length === 0 ? <EmptyState title="Murojaatlar yo'q" /> : list.data.map((m) => (
        <div key={m.id} className="rounded-2xl border border-slate-800 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-white">{m.name} <span className="font-normal text-slate-400">· {m.contact}</span></p>
            <div className="flex items-center gap-2"><span className="text-xs text-slate-500">{formatDateTime(m.createdAt)}</span><Badge variant={MSG[m.status].variant}>{MSG[m.status].label}</Badge></div>
          </div>
          {/* Stored as plain text; React escapes it on render. */}
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{m.message}</p>
          <div className="mt-3 flex gap-2">
            {m.status !== "READ" && <Button size="sm" variant="outline" onClick={() => set(m.id, "READ")}>O'qildi</Button>}
            {m.status !== "ARCHIVED" && <Button size="sm" variant="ghost" onClick={() => set(m.id, "ARCHIVED")}>Arxivlash</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Announce() {
  const groups = useLoad(() => api.groups(), []);
  const courses = useLoad(() => adminService.listCourses(), []);
  const [f, setF] = useState({ title: "", body: "", type: "all" as "all" | "group" | "course", target: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const send = async () => {
    if (f.title.trim().length < 3 || f.body.trim().length < 3) return setErr("Sarlavha va matnni kiriting");
    if (f.type !== "all" && !f.target) return setErr("Auditoriyani tanlang");
    if (f.type === "all" && !window.confirm("E'lon BARCHA faol o'quvchilarga yuboriladi. Davom etasizmi?")) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const audience = f.type === "all" ? { type: "all" as const } : f.type === "group" ? { type: "group" as const, groupId: f.target } : { type: "course" as const, courseId: f.target };
      const r = await api.announce({ title: f.title.trim(), body: f.body.trim(), audience });
      setResult(`${r.recipients} kishiga yuborildi (sayt ichida).` + (r.emailConfigured ? ` Email navbatda: ${r.emailsQueued}.` : " Email xizmati sozlanmagan, shuning uchun email yuborilmaydi."));
      setF({ ...f, title: "", body: "" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Yuborib bo'lmadi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <Select label="Kimga" options={[{ value: "all", label: "Barcha faol o'quvchilar" }, { value: "group", label: "Bitta guruh" }, { value: "course", label: "Kursga yozilganlar" }]} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as typeof f.type, target: "" })} />
      {f.type === "group" && <Select label="Guruh" options={[{ value: "", label: "Tanlang…" }, ...(groups.data ?? []).map((g) => ({ value: g.id, label: g.name }))]} value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} />}
      {f.type === "course" && <Select label="Kurs" options={[{ value: "", label: "Tanlang…" }, ...(courses.data ?? []).map((c) => ({ value: c.id, label: c.title }))]} value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} />}
      <Input label="Sarlavha" value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <Textarea label="Matn (oddiy matn)" rows={5} value={f.body} maxLength={1000} onChange={(e) => setF({ ...f, body: e.target.value })} />
      <p className="text-xs text-slate-500">HTML qo'llab-quvvatlanmaydi (olib tashlanadi). Foydalanuvchi sozlamalarida o'chirib qo'ygan kanallarga yuborilmaydi. Parol yoki shaxsiy ma'lumot yozmang.</p>
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      {result && <p role="status" className="text-sm text-emerald-400">{result}</p>}
      <Button loading={busy} onClick={send}>Yuborish</Button>
    </div>
  );
}

const FIELDS: { key: string; label: string }[] = [
  { key: "siteName", label: "Sayt nomi" }, { key: "tagline", label: "Shior" }, { key: "phone", label: "Telefon" },
  { key: "email", label: "Email" }, { key: "address", label: "Manzil" }, { key: "workingHours", label: "Ish vaqti" },
  { key: "logoUrl", label: "Logo (https:// yoki /yo'l)" }, { key: "faviconUrl", label: "Favicon (https:// yoki /yo'l)" },
  { key: "brandColor", label: "Brend rangi (#RRGGBB)" }, { key: "heroTitle", label: "Bosh sahifa sarlavhasi" }, { key: "heroSubtitle", label: "Bosh sahifa matni" },
];

function Settings() {
  const { data, loading, error, reload } = useLoad(() => api.settings(), []);
  const [vals, setVals] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const current = vals ?? Object.fromEntries(FIELDS.map((f) => [f.key, typeof data?.[f.key] === "string" ? (data[f.key] as string) : ""]));

  const save = async () => {
    // Only non-empty fields are sent; the server validates every one of them.
    const payload = Object.fromEntries(Object.entries(current).filter(([, v]) => v.trim() !== ""));
    setBusy(true);
    setErr(null);
    try {
      await api.saveSettings(payload);
      toast.success("Sozlamalar saqlandi");
      setVals(null);
      void reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <Skeleton className="h-48 rounded-2xl" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <div className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => <Input key={f.key} label={f.label} value={current[f.key]} onChange={(e) => setVals({ ...current, [f.key]: e.target.value })} />)}
      </div>
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      <Button loading={busy} onClick={save}>Saqlash</Button>
    </div>
  );
}
