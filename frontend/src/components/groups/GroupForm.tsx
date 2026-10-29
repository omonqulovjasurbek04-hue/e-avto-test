import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Group, GroupDays, GroupInput } from "@/services/platform.service";

export interface GroupFormProps {
  /** Editing an existing group; empty = opening a new one. */
  group?: Omit<Group, "_count"> | null;
  courses: { id: string; title: string }[];
  /** Admins pick the teacher; a teacher's own group has no teacher field. */
  teachers?: { id: string; name: string }[];
  busy?: boolean;
  onSubmit: (data: GroupInput) => void | Promise<void>;
  onCancel: () => void;
}

const dateOnly = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");
/** Today in Tashkent as YYYY-MM-DD: a new group starts the day it is opened. */
const todayTashkent = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(new Date());

/** Opening or editing a group: name, course, (teacher), dates, toq/juft kunlar, lesson time and length. */
export function GroupForm({ group, courses, teachers, busy, onSubmit, onCancel }: GroupFormProps) {
  const { t } = useTranslation();
  const [f, setF] = useState({
    name: group?.name ?? "",
    courseId: group?.courseId ?? "",
    teacherId: group?.teacherId ?? "",
    // Not asked: a new group starts today; an existing one keeps its own start date.
    startDate: dateOnly(group?.startDate) || todayTashkent(),
    endDate: dateOnly(group?.endDate),
    capacity: String(group?.capacity ?? 20),
    days: (group?.days ?? "") as GroupDays | "",
    startTime: group?.startTime ?? "",
    lessonMinutes: String(group?.lessonMinutes ?? 90),
    room: group?.room ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));

  const submit = () => {
    if (f.name.trim().length < 2 || !f.courseId || !f.startDate || (teachers && !f.teacherId)) return setErr(t("groupForm.fillAll"));
    if (f.days && !f.startTime) return setErr(t("groupForm.needTime"));
    setErr(null);
    void onSubmit({
      name: f.name.trim(),
      courseId: f.courseId,
      ...(teachers ? { teacherId: f.teacherId } : {}),
      startDate: f.startDate,
      endDate: f.endDate || null,
      capacity: Number(f.capacity) || 20,
      days: f.days || null,
      startTime: f.days ? f.startTime : null,
      lessonMinutes: f.days ? Number(f.lessonMinutes) || 90 : null,
      room: f.room.trim() || null,
    });
  };

  return (
    <div className="space-y-4">
      <Input label={t("groupForm.name")} placeholder={t("groupForm.namePlaceholder")} value={f.name} onChange={(e) => set({ name: e.target.value })} />
      <Select
        label={t("groupForm.course")}
        disabled={Boolean(group) && !teachers}
        options={[{ value: "", label: t("groupForm.choose") }, ...courses.map((c) => ({ value: c.id, label: c.title }))]}
        value={f.courseId}
        onChange={(e) => set({ courseId: e.target.value })}
      />
      {teachers && (
        <Select
          label={t("groupForm.teacher")}
          options={[{ value: "", label: teachers.length === 0 ? t("groupForm.noTeachers") : t("groupForm.choose") }, ...teachers.map((tch) => ({ value: tch.id, label: tch.name }))]}
          value={f.teacherId}
          onChange={(e) => set({ teacherId: e.target.value })}
        />
      )}
      <Input label={t("groupForm.endDate")} type="date" min={f.startDate} value={f.endDate} onChange={(e) => set({ endDate: e.target.value })} />

      <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <legend className="px-1 text-sm font-medium text-slate-700 dark:text-slate-200">{t("groupForm.rhythm")}</legend>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t("groupForm.rhythm")}>
          {(["ODD", "EVEN", ""] as const).map((d) => (
            <button
              key={d || "none"}
              type="button"
              role="radio"
              aria-checked={f.days === d}
              onClick={() => set({ days: d })}
              className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${
                f.days === d
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                  : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
              }`}
            >
              {d === "ODD" ? t("groupForm.odd") : d === "EVEN" ? t("groupForm.even") : t("groupForm.rhythmNone")}
            </button>
          ))}
        </div>
        {f.days && (
          <div className="grid grid-cols-2 gap-4">
            <Input label={t("groupForm.startTime")} type="time" value={f.startTime} onChange={(e) => set({ startTime: e.target.value })} />
            <Input label={t("groupForm.lessonMinutes")} type="number" min={30} max={240} step={15} value={f.lessonMinutes} onChange={(e) => set({ lessonMinutes: e.target.value })} />
          </div>
        )}
        <p className="text-xs text-slate-500">{t("groupForm.rhythmHint")}</p>
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <Input label={t("groupForm.room")} value={f.room} onChange={(e) => set({ room: e.target.value })} />
        <Input label={t("groupForm.capacity")} type="number" min={1} max={200} value={f.capacity} onChange={(e) => set({ capacity: e.target.value })} />
      </div>

      {err && <p role="alert" className="text-sm text-red-500">{err}</p>}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>{t("groupForm.cancel")}</Button>
        <Button loading={busy} onClick={submit}>{group ? t("groupForm.save") : t("groupForm.open")}</Button>
      </div>
    </div>
  );
}

/** "Toq · 18:00" — the short rhythm label for lists; empty when the group has none. */
export const rhythmLabel = (g: Pick<Group, "days" | "startTime">, t: (k: string) => string) =>
  g.days && g.startTime ? `${g.days === "ODD" ? t("groupForm.oddShort") : t("groupForm.evenShort")} · ${g.startTime}` : "";
