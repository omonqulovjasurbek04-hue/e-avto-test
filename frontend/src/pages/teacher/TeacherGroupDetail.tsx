import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardCheck, Download } from "lucide-react";
import { toast } from "sonner";
import { teacherService, type AttendanceStatus, type Roster, type Slot } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateTime, formatTime } from "@/utils/money";
import { ATTENDANCE_STATUSES } from "@/constants/attendance";
import { useTranslation } from "react-i18next";

export default function TeacherGroupDetail() {
  const { t } = useTranslation();
  const { groupId = "" } = useParams();
  const role = useAuthStore((s) => s.user?.role);
  const canExport = role === "ADMIN" || role === "SUPERADMIN";
  const [tab, setTab] = useState("slots");

  const group = useLoad(() => teacherService.group(groupId), [groupId]);
  const slots = useLoad(() => teacherService.slots(groupId), [groupId]);
  const report = useLoad(() => teacherService.report(groupId), [groupId]);

  const [roster, setRoster] = useState<Roster | null>(null);
  const [marks, setMarks] = useState<Record<string, { status: AttendanceStatus | ""; note: string }>>({});
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openRoster = async (slot: Slot) => {
    setFormError(null);
    setReason("");
    try {
      const r = await teacherService.roster(slot.id);
      setRoster(r);
      setMarks(Object.fromEntries(r.students.map((s) => [s.studentId, { status: s.status ?? "", note: s.note ?? "" }])));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yuklab bo'lmadi");
    }
  };

  const hasSaved = roster?.students.some((s) => s.status !== null) ?? false;

  const save = async (finalize: boolean) => {
    if (!roster) return;
    const records = Object.entries(marks)
      .filter(([, m]) => m.status !== "")
      .map(([studentId, m]) => ({ studentId, status: m.status as AttendanceStatus, note: m.note.trim() || null }));
    if (records.length === 0) {
      setFormError("Kamida bitta o'quvchi uchun holat tanlang");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await teacherService.mark(roster.slot.id, records, hasSaved ? reason : undefined);
      if (finalize) await teacherService.finalize(roster.slot.id);
      toast.success(finalize ? "Davomat yakunlandi" : "Davomat saqlandi");
      setRoster(null);
      void slots.reload();
      void report.reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  };

  if (group.loading && !group.data) return <Skeleton className="h-64 rounded-2xl" />;
  if (group.error || !group.data) return <ErrorState message={group.error ?? "Guruh topilmadi"} onRetry={group.reload} />;
  const g = group.data;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/teacher" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Guruhlar
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{g.name}</h1>
        <p className="text-sm text-slate-500">{g.course.title} · {g.members.length} / {g.capacity} o'quvchi</p>
      </div>

      <Tabs
        activeTab={tab}
        onChange={setTab}
        tabs={[
          { id: "slots", label: "Darslar" },
          { id: "students", label: "O'quvchilar", count: g.members.length },
          { id: "report", label: "Davomat hisoboti" },
        ]}
      />

      {tab === "slots" &&
        (slots.loading && !slots.data ? <Skeleton className="h-32 rounded-2xl" /> : !slots.data || slots.data.length === 0 ? (
          <EmptyState title="Darslar rejalashtirilmagan" description="Jadvalni administrator tuzadi." />
        ) : (
          <div className="space-y-3">
            {slots.data.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{s.topic || "Dars"}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{formatDateTime(s.startsAt)} – {formatTime(s.endsAt)}{s.room ? ` · ${s.room}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.status === "CANCELLED" && <Badge variant="danger">Bekor qilingan</Badge>}
                    {s.session?.finalizedAt && <Badge variant="success">Yakunlangan</Badge>}
                    {s.status !== "CANCELLED" && (
                      <Button size="sm" variant="outline" leftIcon={<ClipboardCheck className="h-4 w-4" />} onClick={() => openRoster(s)}>
                        Davomat
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}

      {tab === "students" &&
        (g.members.length === 0 ? <EmptyState title="Guruhda o'quvchi yo'q" /> : (
          <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {g.members.map((m) => (
              <li key={m.studentId} className="flex justify-between px-4 py-3 text-sm">
                <span className="font-medium text-slate-900 dark:text-white">{m.student.name}</span>
                <span className="text-slate-500">{m.student.phone ?? ""}</span>
              </li>
            ))}
          </ul>
        ))}

      {tab === "report" && (
        <div className="space-y-3">
          {canExport && (
            <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => teacherService.downloadCsv(groupId).catch((e: Error) => toast.error(e.message))}>
              CSV yuklab olish
            </Button>
          )}
          {report.loading && !report.data ? <Skeleton className="h-32 rounded-2xl" /> : report.error ? <ErrorState message={report.error} onRetry={report.reload} /> : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900">
                  <tr><th className="px-4 py-3">O'quvchi</th><th className="px-4 py-3">Qatnashdi</th><th className="px-4 py-3">Kechikdi</th><th className="px-4 py-3">Kelmadi</th><th className="px-4 py-3">Uzrli</th><th className="px-4 py-3">Foiz</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {report.data?.rows.map((r) => (
                    <tr key={r.studentId}>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                      <td className="px-4 py-3">{r.present + r.online}</td>
                      <td className="px-4 py-3">{r.late}</td>
                      <td className="px-4 py-3">{r.absent}</td>
                      <td className="px-4 py-3">{r.excused}</td>
                      <td className="px-4 py-3 font-semibold">{r.percent === null ? "—" : `${r.percent}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={roster !== null} onClose={() => setRoster(null)} title={roster ? `Davomat — ${formatDateTime(roster.slot.startsAt)}` : ""} maxWidth="lg">
        {roster && (
          <div className="space-y-4">
            {roster.slot.finalizedAt && <p className="text-sm text-amber-600">Bu davomat yakunlangan: o'zgartirishni faqat administrator bajara oladi.</p>}
            <div className="space-y-3">
              {roster.students.map((s) => (
                <div key={s.studentId} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_160px_1fr]">
                  <p className="font-medium text-slate-900 dark:text-white">{s.name}</p>
                  <Select
                    aria-label={`${s.name} holati`}
                    options={[{ value: "", label: "Tanlang…" }, ...ATTENDANCE_STATUSES.filter((v) => v !== "ONLINE" || roster.slot.onlineUrl).map((value) => ({ value, label: t(`attendance.status.${value}`) }))]}
                    value={marks[s.studentId]?.status ?? ""}
                    onChange={(e) => setMarks({ ...marks, [s.studentId]: { ...marks[s.studentId], status: e.target.value as AttendanceStatus | "" } })}
                  />
                  <Input
                    aria-label={`${s.name} izohi`}
                    placeholder="Izoh (ixtiyoriy)"
                    value={marks[s.studentId]?.note ?? ""}
                    onChange={(e) => setMarks({ ...marks, [s.studentId]: { ...marks[s.studentId], note: e.target.value } })}
                  />
                </div>
              ))}
            </div>
            {hasSaved && <Input label="O'zgartirish sababi (saqlangan yozuv o'zgarsa shart)" value={reason} onChange={(e) => setReason(e.target.value)} />}
            {formError && <p role="alert" className="text-sm text-red-500">{formError}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRoster(null)}>Bekor qilish</Button>
              <Button variant="outline" loading={saving} onClick={() => save(false)}>Saqlash</Button>
              <Button loading={saving} onClick={() => save(true)}>Saqlash va yakunlash</Button>
            </div>
            <p className="text-xs text-slate-500">
              {ATTENDANCE_STATUSES.map((v) => t(`attendance.status.${v}`)).join(" · ")}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
