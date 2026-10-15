import { useState } from "react";
import { CalendarPlus, Plus, UserMinus, UserPlus, Archive } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import { adminPlatformService as api, teacherService, type Group } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { tashkentLocalToIso } from "@/utils/money";

export default function AdminGroups() {
  const groups = useLoad(() => api.groups(), []);
  const courses = useLoad(() => adminService.listCourses(), []);
  const teachers = useLoad(() => adminService.listUsers({ role: "TEACHER", limit: 100 }).then((p) => p.items), []);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", courseId: "", teacherId: "", startDate: "", capacity: "20" });
  const [membersOf, setMembersOf] = useState<Group | null>(null);
  const [slotsOf, setSlotsOf] = useState<Group | null>(null);
  const [archiving, setArchiving] = useState<Group | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (form.name.trim().length < 2 || !form.courseId || !form.teacherId || !form.startDate) return setErr("Barcha maydonlarni to'ldiring");
    setBusy(true);
    setErr(null);
    try {
      await api.createGroup({ name: form.name.trim(), courseId: form.courseId, teacherId: form.teacherId, startDate: form.startDate, capacity: Number(form.capacity) || 20 });
      toast.success("Guruh yaratildi");
      setCreating(false);
      void groups.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!archiving) return;
    try {
      await api.archiveGroup(archiving.id);
      toast.success("Guruh arxivlandi");
      setArchiving(null);
      void groups.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Guruhlar va jadval</h1>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setErr(null); setCreating(true); }}>Yangi guruh</Button>
      </div>

      {groups.loading && !groups.data ? <Skeleton className="h-48 rounded-2xl" /> : groups.error ? <ErrorState message={groups.error} onRetry={groups.reload} /> : !groups.data || groups.data.length === 0 ? (
        <EmptyState title="Guruhlar yo'q" description="Avval foydalanuvchiga TEACHER rolini bering, so'ng guruh yarating." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">Guruh</th><th className="px-4 py-3">Kurs</th><th className="px-4 py-3">O'qituvchi</th><th className="px-4 py-3">O'quvchilar</th><th className="px-4 py-3">Holat</th><th className="px-4 py-3 text-right">Amallar</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {groups.data.map((g) => (
                <tr key={g.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-white">{g.name}</td>
                  <td className="px-4 py-3">{g.course.title}</td>
                  <td className="px-4 py-3">{g.teacher.name}</td>
                  <td className="px-4 py-3">{g._count.members} / {g.capacity}</td>
                  <td className="px-4 py-3"><Badge variant={g.status === "ACTIVE" ? "success" : "neutral"}>{g.status === "ACTIVE" ? "Faol" : "Arxiv"}</Badge></td>
                  <td className="px-4 py-3">
                    {g.status === "ACTIVE" && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" aria-label="A'zolar" onClick={() => setMembersOf(g)}><UserPlus className="h-4 w-4" /></Button>
                        <Button size="sm" variant="outline" aria-label="Jadval" onClick={() => setSlotsOf(g)}><CalendarPlus className="h-4 w-4" /></Button>
                        <Button size="sm" variant="danger" aria-label="Arxivlash" onClick={() => setArchiving(g)}><Archive className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={creating} onClose={() => setCreating(false)} title="Yangi guruh" maxWidth="lg">
        <div className="space-y-4">
          <Input label="Guruh nomi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Kurs" options={[{ value: "", label: "Tanlang…" }, ...(courses.data ?? []).map((c) => ({ value: c.id, label: c.title }))]} value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} />
          <Select label="O'qituvchi" options={[{ value: "", label: teachers.data && teachers.data.length === 0 ? "TEACHER rolidagi foydalanuvchi yo'q" : "Tanlang…" }, ...(teachers.data ?? []).map((t) => ({ value: t.id, label: t.name }))]} value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Boshlanish sanasi" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input label="Sig'im" type="number" min={1} max={200} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </div>
          {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setCreating(false)}>Bekor qilish</Button><Button loading={busy} onClick={create}>Saqlash</Button></div>
        </div>
      </Modal>

      {membersOf && <MembersModal group={membersOf} onClose={() => { setMembersOf(null); void groups.reload(); }} />}
      {slotsOf && <SlotsModal group={slotsOf} onClose={() => setSlotsOf(null)} />}

      <ConfirmDialog open={archiving !== null} title="Guruhni arxivlash" message={`"${archiving?.name ?? ""}" guruhi arxivga o'tadi va yangi a'zo qabul qilmaydi.`} confirmText="Arxivlash" onConfirm={archive} onCancel={() => setArchiving(null)} />
    </div>
  );
}

function MembersModal({ group, onClose }: { group: Group; onClose: () => void }) {
  const detail = useLoad(() => teacherService.group(group.id), [group.id]);
  const students = useLoad(() => adminService.listUsers({ role: "USER", limit: 100 }).then((p) => p.items), []);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);

  const memberIds = new Set(detail.data?.members.map((m) => m.studentId));
  const candidates = (students.data ?? []).filter((s) => s.isActive && !memberIds.has(s.id));

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      setPick("");
      await detail.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`A'zolar — ${group.name}`} maxWidth="lg">
      <div className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1"><Select label="O'quvchi qo'shish" options={[{ value: "", label: "Tanlang…" }, ...candidates.map((s) => ({ value: s.id, label: `${s.name}${s.email ? ` (${s.email})` : ""}` }))]} value={pick} onChange={(e) => setPick(e.target.value)} /></div>
          <Button disabled={!pick} loading={busy} onClick={() => run(() => api.addMember(group.id, pick), "Qo'shildi")}>Qo'shish</Button>
        </div>
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
          {detail.data?.members.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Guruh bo'sh</li>}
          {detail.data?.members.map((m) => (
            <li key={m.studentId} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-white">{m.student.name}</span>
              <Button size="sm" variant="ghost" aria-label="Chiqarish" onClick={() => run(() => api.removeMember(group.id, m.studentId), "Chiqarildi")}><UserMinus className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

function SlotsModal({ group, onClose }: { group: Group; onClose: () => void }) {
  const [f, setF] = useState({ start: "", end: "", room: "", online: "", topic: "", repeat: "1" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!f.start || !f.end) return setErr("Boshlanish va tugash vaqtini kiriting");
    setBusy(true);
    setErr(null);
    try {
      const count = Math.max(1, Number(f.repeat) || 1);
      const created = await api.createSlots(group.id, {
        startsAt: tashkentLocalToIso(f.start),
        endsAt: tashkentLocalToIso(f.end),
        room: f.room.trim() || null,
        onlineUrl: f.online.trim() || null,
        topic: f.topic.trim() || null,
        ...(count > 1 ? { repeat: { everyWeeks: 1, count } } : {}),
      });
      toast.success(`${created.length} ta dars qo'shildi`);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Jadval — ${group.name}`} maxWidth="lg">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Vaqt Toshkent vaqti bo'yicha kiritiladi. O'qituvchi yoki xona band bo'lsa, saqlanmaydi.</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Boshlanishi" type="datetime-local" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
          <Input label="Tugashi" type="datetime-local" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Xona" value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })} />
          <Input label="Onlayn havola (https://)" value={f.online} onChange={(e) => setF({ ...f, online: e.target.value })} />
        </div>
        <Input label="Mavzu" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} />
        <Input label="Har hafta takrorlash (marta, 1 = bir martalik)" type="number" min={1} max={104} value={f.repeat} onChange={(e) => setF({ ...f, repeat: e.target.value })} />
        {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
        <div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Bekor qilish</Button><Button loading={busy} onClick={save}>Saqlash</Button></div>
      </div>
    </Modal>
  );
}
