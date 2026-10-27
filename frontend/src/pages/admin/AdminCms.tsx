import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { ImageLibrary, ImagePickerModal } from "@/components/admin/ImageLibrary";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import { adminPlatformService as api, type CmsFaq, type CmsNews, type CmsPage, type CmsTranslations, type ContactMessage, type NotificationTemplate } from "@/services/platform.service";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { EXTRA, FallbackHint, LangTabs, hasText, toTr, type ExtraLang, type Lang } from "@/components/admin/translations";
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

const th = "px-4 py-3";
const thead = "bg-slate-50 dark:bg-slate-950 text-xs uppercase text-slate-500 dark:text-slate-400";
const wrap = "overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800";

export default function AdminCms() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("pages");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("admin.cms.title")}</h1>
      <Tabs
        activeTab={tab}
        onChange={setTab}
        tabs={[
          { id: "pages", label: t("admin.cms.tabPages") },
          { id: "news", label: t("admin.cms.tabNews") },
          { id: "faq", label: t("admin.cms.tabFaq") },
          { id: "images", label: t("admin.cms.tabImages") },
          { id: "messages", label: t("admin.cms.tabMessages") },
          { id: "announce", label: t("admin.cms.tabAnnounce") },
          { id: "templates", label: t("admin.cms.tabTemplates") },
          { id: "settings", label: t("admin.cms.tabSettings") },
        ]}
      />
      {tab === "pages" && <Pages />}
      {tab === "news" && <News />}
      {tab === "faq" && <Faq />}
      {tab === "images" && <ImageLibrary />}
      {tab === "messages" && <Messages />}
      {tab === "announce" && <Announce />}
      {tab === "templates" && <Templates />}
      {tab === "settings" && <Settings />}
    </div>
  );
}

function StatusBadge({ status }: { status: "DRAFT" | "PUBLISHED" }) {
  const { t } = useTranslation();
  return <Badge variant={status === "PUBLISHED" ? "success" : "neutral"}>{status === "PUBLISHED" ? t("admin.common.published") : t("admin.common.draft")}</Badge>;
}

/* ───── pages & news share one editor ───── */

const DOC_FIELDS = ["title", "summary", "content", "seoTitle", "seoDescription"] as const;
type DocField = (typeof DOC_FIELDS)[number];
type DocText = Record<DocField, string>;
interface DocForm extends DocText { slug: string; coverUrl: string; status: "DRAFT" | "PUBLISHED"; tr: Record<ExtraLang, DocText> }
const emptyDoc: DocForm = { slug: "", coverUrl: "", title: "", summary: "", content: "", seoTitle: "", seoDescription: "", status: "DRAFT", tr: toTr(DOC_FIELDS, undefined) };

function DocEditor({ kind, initial, onClose, onSaved, id }: { kind: "page" | "news"; initial: DocForm; id: string | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [f, setF] = useState(initial);
  const [lang, setLang] = useState<Lang>("uz");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<"cover" | "content" | null>(null);

  // The fields of the language being edited.
  const text: DocText = lang === "uz" ? f : f.tr[lang];
  const set = (field: DocField, value: string) => setF(lang === "uz" ? { ...f, [field]: value } : { ...f, tr: { ...f.tr, [lang]: { ...f.tr[lang], [field]: value } } });

  const save = async () => {
    if (f.title.trim().length < 2) {
      setLang("uz");
      return setErr(t("admin.cms.needTitle"));
    }
    setBusy(true);
    setErr(null);
    const translations = Object.fromEntries(
      EXTRA.map((l) => {
        const v = f.tr[l];
        const fields = kind === "page" ? { title: v.title, content: v.content, seoTitle: v.seoTitle, seoDescription: v.seoDescription } : v;
        return [l, hasText(fields) ? fields : null];
      })
    );
    const base = { title: f.title.trim(), content: f.content, seoTitle: f.seoTitle.trim() || null, seoDescription: f.seoDescription.trim() || null, status: f.status, translations, ...(f.slug.trim() ? { slug: f.slug.trim() } : {}) };
    try {
      if (kind === "page") await api.savePage(id, base);
      else await api.saveNews(id, { ...base, summary: f.summary.trim() || null, coverUrl: f.coverUrl.trim() || null });
      toast.success(t("admin.common.saved"));
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("admin.cms.saveError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={id ? t("admin.common.edit") : kind === "page" ? t("admin.cms.newPage") : t("admin.cms.newNews")} maxWidth="2xl">
      <div className="space-y-4">
        <LangTabs value={lang} onChange={setLang} filled={{ uz_cyrl: hasText(f.tr.uz_cyrl), ru: hasText(f.tr.ru) }} />
        <FallbackHint lang={lang} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t("admin.common.title")} value={text.title} placeholder={lang === "uz" ? undefined : f.title} onChange={(e) => set("title", e.target.value)} />
          <Input label={t("admin.cms.slug")} value={f.slug} disabled={lang !== "uz"} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })} />
        </div>
        {kind === "news" && <Textarea label={t("admin.cms.summary")} rows={2} value={text.summary} placeholder={lang === "uz" ? undefined : f.summary} onChange={(e) => set("summary", e.target.value)} />}
        {kind === "news" && lang === "uz" && (
          <div className="flex items-end gap-3">
            {f.coverUrl && <img src={f.coverUrl} alt="" className="h-16 w-28 shrink-0 rounded-lg object-cover" />}
            <div className="min-w-0 flex-1"><Input label={t("admin.cms.cover")} value={f.coverUrl} onChange={(e) => setF({ ...f, coverUrl: e.target.value })} /></div>
            <Button variant="outline" leftIcon={<ImagePlus className="h-4 w-4" />} onClick={() => setPicker("cover")}>{t("admin.images.choosePicture")}</Button>
          </div>
        )}
        <div className="space-y-1">
          <div className="flex justify-end"><Button size="sm" variant="ghost" leftIcon={<ImagePlus className="h-4 w-4" />} onClick={() => setPicker("content")}>{t("admin.images.insert")}</Button></div>
          <Textarea label={t("admin.cms.content")} rows={10} value={text.content} onChange={(e) => set("content", e.target.value)} />
        </div>
        <p className="text-xs text-slate-500">{t("admin.cms.contentHint")}</p>
        <ImagePickerModal
          open={picker !== null}
          onClose={() => setPicker(null)}
          onPick={(img) => {
            if (picker === "cover") setF({ ...f, coverUrl: img.url });
            // Appended as a plain <img>; the server keeps only http(s) sources and safe attributes.
            else set("content", `${text.content}${text.content === "" || text.content.endsWith("\n") ? "" : "\n"}<p><img src="${img.url}" alt="" /></p>\n`);
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t("admin.cms.seoTitle")} value={text.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
          <Input label={t("admin.cms.seoDescription")} value={text.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} />
        </div>
        <Select label={t("admin.common.status")} helperText={t("admin.cms.statusAllLangs")} options={[{ value: "DRAFT", label: t("admin.common.draft") }, { value: "PUBLISHED", label: t("admin.common.published") }]} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as DocForm["status"] })} />
        {err && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{err}</p>}
        <div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose}>{t("admin.common.cancel")}</Button><Button loading={busy} onClick={save}>{t("admin.common.save")}</Button></div>
      </div>
    </Modal>
  );
}

function Pages() {
  const { t } = useTranslation();
  const list = useLoad(() => api.pages(), []);
  const [editing, setEditing] = useState<{ id: string | null; form: DocForm } | null>(null);
  const edit = (p: CmsPage) => setEditing({ id: p.id, form: { ...emptyDoc, slug: p.slug, title: p.title, content: p.content, seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "", status: p.status, tr: toTr(DOC_FIELDS, p.translations) } });
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ id: null, form: emptyDoc })}>{t("admin.cms.newPage")}</Button></div>
      {list.loading && !list.data ? <Skeleton className="h-32 rounded-2xl" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data || list.data.length === 0 ? <EmptyState title={t("admin.cms.noPages")} description={t("admin.cms.noPagesHint")} /> : (
        <div className={wrap}><table className="w-full text-left text-sm">
          <thead className={thead}><tr><th className={th}>{t("admin.common.title")}</th><th className={th}>Slug</th><th className={th}>{t("admin.cms.languages")}</th><th className={th}>{t("admin.common.status")}</th><th className={th}>{t("admin.cms.updated")}</th><th className={`${th} text-right`}>{t("admin.common.action")}</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{list.data.map((p) => (
            <tr key={p.id}><td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{p.title}</td><td className="px-4 py-3 font-mono text-xs">{p.slug}</td><td className="px-4 py-3"><LangBadges translations={p.translations} /></td><td className="px-4 py-3"><StatusBadge status={p.status} /></td><td className="px-4 py-3">{formatDateTime(p.updatedAt)}</td>
              <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" aria-label={t("admin.common.edit")} onClick={() => edit(p)}><Pencil className="h-4 w-4" /></Button></td></tr>
          ))}</tbody></table></div>
      )}
      {editing && <DocEditor kind="page" id={editing.id} initial={editing.form} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void list.reload(); }} />}
    </div>
  );
}

/** Which languages have their own text (uz always does). */
function LangBadges({ translations }: { translations?: CmsTranslations<string> }) {
  return (
    <span className="flex gap-1">
      {SUPPORTED_LANGUAGES.map((l) => {
        const has = l.code === "uz" || Boolean(translations?.[l.code as ExtraLang]);
        return <span key={l.code} title={l.name} className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${has ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{l.short}</span>;
      })}
    </span>
  );
}

function News() {
  const { t } = useTranslation();
  const list = useLoad(() => api.news(), []);
  const [editing, setEditing] = useState<{ id: string | null; form: DocForm } | null>(null);
  const edit = (n: CmsNews) => setEditing({ id: n.id, form: { ...emptyDoc, slug: n.slug, coverUrl: n.coverUrl ?? "", title: n.title, summary: n.summary ?? "", content: n.content, seoTitle: n.seoTitle ?? "", seoDescription: n.seoDescription ?? "", status: n.status, tr: toTr(DOC_FIELDS, n.translations) } });
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ id: null, form: emptyDoc })}>{t("admin.cms.newNews")}</Button></div>
      {list.loading && !list.data ? <Skeleton className="h-32 rounded-2xl" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data || list.data.length === 0 ? <EmptyState title={t("admin.cms.noNews")} /> : (
        <div className={wrap}><table className="w-full text-left text-sm">
          <thead className={thead}><tr><th className={th}>{t("admin.common.title")}</th><th className={th}>{t("admin.cms.languages")}</th><th className={th}>{t("admin.common.status")}</th><th className={th}>{t("admin.cms.publishedAt")}</th><th className={`${th} text-right`}>{t("admin.common.action")}</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{list.data.map((n) => (
            <tr key={n.id}><td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{n.title}</td><td className="px-4 py-3"><LangBadges translations={n.translations} /></td><td className="px-4 py-3"><StatusBadge status={n.status} /></td><td className="px-4 py-3">{n.publishedAt ? formatDateTime(n.publishedAt) : "—"}</td>
              <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" aria-label={t("admin.common.edit")} onClick={() => edit(n)}><Pencil className="h-4 w-4" /></Button></td></tr>
          ))}</tbody></table></div>
      )}
      {editing && <DocEditor kind="news" id={editing.id} initial={editing.form} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void list.reload(); }} />}
    </div>
  );
}

const FAQ_FIELDS = ["question", "answer"] as const;
type FaqText = Record<(typeof FAQ_FIELDS)[number], string>;
interface FaqForm extends FaqText { id: string | null; published: boolean; tr: Record<ExtraLang, FaqText> }

function Faq() {
  const { t } = useTranslation();
  const list = useLoad(() => api.faq(), []);
  const [editing, setEditing] = useState<FaqForm | null>(null);
  const [lang, setLang] = useState<Lang>("uz");
  const [deleting, setDeleting] = useState<CmsFaq | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const open = (form: FaqForm) => { setErr(null); setLang("uz"); setEditing(form); };
  const text: FaqText | null = editing ? (lang === "uz" ? editing : editing.tr[lang]) : null;
  const set = (field: keyof FaqText, value: string) => editing && setEditing(lang === "uz" ? { ...editing, [field]: value } : { ...editing, tr: { ...editing.tr, [lang]: { ...editing.tr[lang], [field]: value } } });

  const save = async () => {
    if (!editing) return;
    if (editing.question.trim().length < 3 || !editing.answer.trim()) {
      setLang("uz");
      return setErr(t("admin.cms.needQa"));
    }
    setBusy(true);
    setErr(null);
    try {
      const translations = Object.fromEntries(EXTRA.map((l) => [l, hasText(editing.tr[l]) ? editing.tr[l] : null]));
      await api.saveFaq(editing.id, { question: editing.question.trim(), answer: editing.answer, isPublished: editing.published, translations });
      toast.success(t("admin.common.saved"));
      setEditing(null);
      void list.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("admin.common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => open({ id: null, question: "", answer: "", published: true, tr: toTr(FAQ_FIELDS, undefined) })}>{t("admin.cms.newQuestion")}</Button></div>
      {list.loading && !list.data ? <Skeleton className="h-32 rounded-2xl" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data || list.data.length === 0 ? <EmptyState title={t("admin.cms.faqEmpty")} /> : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800">
          {list.data.map((f) => (
            <li key={f.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="space-y-1"><p className="font-medium text-slate-900 dark:text-white">{f.question} {!f.isPublished && <Badge variant="neutral">{t("admin.cms.hidden")}</Badge>}</p><LangBadges translations={f.translations} /></div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" aria-label={t("admin.common.edit")} onClick={() => open({ id: f.id, question: f.question, answer: f.answer, published: f.isPublished, tr: toTr(FAQ_FIELDS, f.translations) })}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="danger" aria-label={t("admin.common.delete")} onClick={() => setDeleting(f)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? t("admin.cms.editQuestion") : t("admin.cms.newQuestion")} maxWidth="lg">
        {editing && text && (
          <div className="space-y-4">
            <LangTabs value={lang} onChange={setLang} filled={{ uz_cyrl: hasText(editing.tr.uz_cyrl), ru: hasText(editing.tr.ru) }} />
            <FallbackHint lang={lang} />
            <Input label={t("admin.cms.question")} value={text.question} placeholder={lang === "uz" ? undefined : editing.question} onChange={(e) => set("question", e.target.value)} />
            <Textarea label={t("admin.cms.answer")} rows={5} value={text.answer} onChange={(e) => set("answer", e.target.value)} />
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} /> {t("admin.cms.visible")}</label>
            {err && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{err}</p>}
            <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setEditing(null)}>{t("admin.common.cancel")}</Button><Button loading={busy} onClick={save}>{t("admin.common.save")}</Button></div>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={deleting !== null} title={t("admin.cms.deleteQuestion")} message={t("admin.cms.deleteText", { name: deleting?.question ?? "" })} confirmText={t("admin.common.delete")} onCancel={() => setDeleting(null)}
        onConfirm={async () => { if (!deleting) return; try { await api.deleteFaq(deleting.id); setDeleting(null); void list.reload(); } catch (e) { toast.error(e instanceof Error ? e.message : t("admin.common.error")); } }} />
    </div>
  );
}

const MSG: Record<ContactMessage["status"], "danger" | "neutral" | "success"> = { NEW: "danger", READ: "success", ARCHIVED: "neutral" };

function Messages() {
  const { t } = useTranslation();
  const list = useLoad(() => api.messages(), []);
  const set = (id: string, status: ContactMessage["status"]) => api.setMessageStatus(id, status).then(() => list.reload()).catch((e: Error) => toast.error(e.message));
  return (
    <div className="space-y-3">
      {list.loading && !list.data ? <Skeleton className="h-32 rounded-2xl" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data || list.data.length === 0 ? <EmptyState title={t("admin.cms.noMessages")} /> : list.data.map((m) => (
        <div key={m.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-900 dark:text-white">{m.name} <span className="font-normal text-slate-500 dark:text-slate-400">· {m.contact}</span></p>
            <div className="flex items-center gap-2"><span className="text-xs text-slate-500">{formatDateTime(m.createdAt)}</span><Badge variant={MSG[m.status]}>{t(`admin.cms.msg${m.status}`)}</Badge></div>
          </div>
          {/* Stored as plain text; React escapes it on render. */}
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{m.message}</p>
          <div className="mt-3 flex gap-2">
            {m.status !== "READ" && <Button size="sm" variant="outline" onClick={() => set(m.id, "READ")}>{t("admin.cms.markRead")}</Button>}
            {m.status !== "ARCHIVED" && <Button size="sm" variant="ghost" onClick={() => set(m.id, "ARCHIVED")}>{t("admin.common.archive")}</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Announce() {
  const { t } = useTranslation();
  const groups = useLoad(() => api.groups(), []);
  const courses = useLoad(() => adminService.listCourses(), []);
  const [f, setF] = useState({ title: "", body: "", type: "all" as "all" | "group" | "course", target: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const send = async () => {
    if (f.title.trim().length < 3 || f.body.trim().length < 3) return setErr(t("admin.cms.needTitleBody"));
    if (f.type !== "all" && !f.target) return setErr(t("admin.cms.needAudience"));
    if (f.type === "all" && !window.confirm(t("admin.cms.confirmAll"))) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const audience = f.type === "all" ? { type: "all" as const } : f.type === "group" ? { type: "group" as const, groupId: f.target } : { type: "course" as const, courseId: f.target };
      const r = await api.announce({ title: f.title.trim(), body: f.body.trim(), audience });
      setResult(t("admin.cms.sent", { count: r.recipients }) + (r.emailConfigured ? t("admin.cms.emailQueued", { count: r.emailsQueued }) : t("admin.cms.emailOff")));
      setF({ ...f, title: "", body: "" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("admin.cms.sendError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <Select label={t("admin.cms.to")} options={[{ value: "all", label: t("admin.cms.toAll") }, { value: "group", label: t("admin.cms.toGroup") }, { value: "course", label: t("admin.cms.toCourse") }]} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as typeof f.type, target: "" })} />
      {f.type === "group" && <Select label={t("admin.cms.group")} options={[{ value: "", label: t("admin.common.choose") }, ...(groups.data ?? []).map((g) => ({ value: g.id, label: g.name }))]} value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} />}
      {f.type === "course" && <Select label={t("admin.common.course")} options={[{ value: "", label: t("admin.common.choose") }, ...(courses.data ?? []).map((c) => ({ value: c.id, label: c.title }))]} value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} />}
      <Input label={t("admin.common.title")} value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <Textarea label={t("admin.cms.body")} rows={5} value={f.body} maxLength={1000} onChange={(e) => setF({ ...f, body: e.target.value })} />
      <p className="text-xs text-slate-500">{t("admin.cms.announceHint")}</p>
      {err && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{err}</p>}
      {result && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{result}</p>}
      <Button loading={busy} onClick={send}>{t("admin.cms.send")}</Button>
    </div>
  );
}

const FIELDS = ["siteName", "tagline", "phone", "email", "address", "workingHours", "logoUrl", "faviconUrl", "brandColor", "heroTitle", "heroSubtitle"];
/** Only these have a text per language; logo, colour, phone and e-mail are shared. */
const LOCALIZED = ["siteName", "tagline", "address", "workingHours", "heroTitle", "heroSubtitle"];

type BranchRow = { name: string; address: string };
type SettingsForm = { base: Record<string, string>; tr: Record<ExtraLang, Record<string, string>>; branches: BranchRow[] };

function Settings() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useLoad(() => api.settings(), []);
  const [vals, setVals] = useState<SettingsForm | null>(null);
  const [lang, setLang] = useState<Lang>("uz");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const current: SettingsForm = vals ?? {
    base: Object.fromEntries(FIELDS.map((key) => [key, typeof data?.[key] === "string" ? (data[key] as string) : ""])),
    tr: toTr(LOCALIZED, data?.translations),
    branches: Array.isArray(data?.branches) ? (data.branches as BranchRow[]) : [],
  };
  const shown = lang === "uz" ? FIELDS : LOCALIZED;
  const valueOf = (key: string) => (lang === "uz" ? current.base[key] : current.tr[lang][key]);
  const set = (key: string, value: string) =>
    setVals(lang === "uz" ? { ...current, base: { ...current.base, [key]: value } } : { ...current, tr: { ...current.tr, [lang]: { ...current.tr[lang], [key]: value } } });

  const save = async () => {
    // Only non-empty uz fields are sent; every language version is sent whole (empty = use the uz text).
    const payload = {
      ...Object.fromEntries(Object.entries(current.base).filter(([, v]) => v.trim() !== "")),
      translations: current.tr,
      // Empty rows are dropped; an empty list hides nothing (the contact page then shows the site address).
      branches: current.branches.map((b) => ({ name: b.name.trim(), address: b.address.trim() })).filter((b) => b.name && b.address),
    };
    setBusy(true);
    setErr(null);
    try {
      await api.saveSettings(payload);
      toast.success(t("admin.cms.settingsSaved"));
      setVals(null);
      void reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("admin.common.error"));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <Skeleton className="h-48 rounded-2xl" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <div className="max-w-2xl space-y-4">
      <LangTabs value={lang} onChange={setLang} filled={{ uz_cyrl: hasText(current.tr.uz_cyrl), ru: hasText(current.tr.ru) }} />
      {lang !== "uz" && <p className="text-xs text-amber-700/80 dark:text-amber-300/80">{t("admin.cms.settingsLangHint")}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {shown.map((key) => <Input key={`${lang}-${key}`} label={t(`admin.cms.field${key}`)} value={valueOf(key)} placeholder={lang === "uz" ? undefined : current.base[key]} onChange={(e) => set(key, e.target.value)} />)}
      </div>
      {lang === "uz" && <BranchesEditor rows={current.branches} onChange={(branches) => setVals({ ...current, branches })} />}
      {err && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{err}</p>}
      <Button loading={busy} onClick={save}>{t("admin.common.save")}</Button>
    </div>
  );
}

/** Training centres shown with a map on the contact page. */
function BranchesEditor({ rows, onChange }: { rows: BranchRow[]; onChange: (rows: BranchRow[]) => void }) {
  const { t } = useTranslation();
  const update = (i: number, patch: Partial<BranchRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <fieldset className="space-y-3 rounded-2xl border border-slate-700/60 p-4">
      <legend className="px-1 text-sm font-semibold">{t("admin.cms.branches")}</legend>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t("admin.cms.branchesHint")}</p>
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <Input label={t("admin.cms.branchName")} value={r.name} maxLength={80} onChange={(e) => update(i, { name: e.target.value })} />
          <Input label={t("admin.cms.branchAddress")} value={r.address} maxLength={240} onChange={(e) => update(i, { address: e.target.value })} />
          <Button variant="outline" aria-label={t("admin.common.delete")} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {rows.length < 20 && (
        <Button size="sm" variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => onChange([...rows, { name: "", address: "" }])}>
          {t("admin.cms.branchAdd")}
        </Button>
      )}
    </fieldset>
  );
}

/* ───── notification templates ───── */

function Templates() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useLoad(() => api.notificationTemplates(), []);
  const [lang, setLang] = useState<Lang>("uz");
  if (loading && !data) return <Skeleton className="h-48 rounded-2xl" />;
  if (error || !data) return <ErrorState message={error ?? t("admin.common.error")} onRetry={reload} />;
  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">{t("admin.cms.tplIntro")}</p>
      <LangTabs value={lang} onChange={setLang} />
      {data.map((tpl) => <TemplateCard key={`${tpl.key}-${lang}`} tpl={tpl} lang={lang} onSaved={reload} />)}
    </div>
  );
}

function TemplateCard({ tpl, lang, onSaved }: { tpl: NotificationTemplate; lang: Lang; onSaved: () => void }) {
  const { t } = useTranslation();
  const text = tpl.languages[lang];
  const [f, setF] = useState({ subject: text.subject, body: text.body });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty = f.subject !== text.subject || f.body !== text.body;

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setErr(null);
    try {
      await action();
      toast.success(done);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("admin.common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-template={tpl.key} className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900 dark:text-white">{t(`admin.cms.tpl${tpl.key}`)}</h3>
        <Badge variant={text.custom ? "success" : "neutral"}>{text.custom ? t("admin.cms.tplCustom") : t("admin.cms.tplBuiltin")}</Badge>
      </div>
      <p className="text-xs text-slate-500">
        {t("admin.cms.tplPlaceholders")}: {tpl.placeholders.map((p) => <code key={p} className="mr-1 rounded bg-slate-100 dark:bg-slate-800 px-1 text-slate-600 dark:text-slate-300">{`{${p}}`}</code>)}
        {tpl.required.length > 0 && <> · {t("admin.cms.tplRequired")}: {tpl.required.map((p) => `{${p}}`).join(", ")}</>}
      </p>
      <Input id={`tpl-${tpl.key}-subject`} label={t("admin.cms.tplSubject")} value={f.subject} maxLength={160} onChange={(e) => setF({ ...f, subject: e.target.value })} />
      <Textarea id={`tpl-${tpl.key}-body`} label={t("admin.cms.body")} rows={3} value={f.body} maxLength={1000} onChange={(e) => setF({ ...f, body: e.target.value })} />
      {err && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{err}</p>}
      <div className="flex justify-end gap-2">
        {text.custom && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void run(() => api.resetNotificationTemplate(tpl.key, lang), t("admin.cms.tplResetDone"))}>{t("admin.cms.tplReset")}</Button>}
        <Button size="sm" loading={busy} disabled={!dirty || !f.subject.trim() || !f.body.trim()} onClick={() => void run(() => api.saveNotificationTemplate(tpl.key, lang, { subject: f.subject, body: f.body }), t("admin.common.saved"))}>{t("admin.common.save")}</Button>
      </div>
    </section>
  );
}
