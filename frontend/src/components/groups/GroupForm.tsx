import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TimeInput } from "@/components/ui/TimeInput";
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
const sortDays = (days: number[]) => [...days].sort((a, b) => a - b);
const weekdayNames = (t: TFunction) => t("schedule.weekdaysShort", { returnObjects: true }) as string[];

/** Opening or editing a group: name, course, (teacher), dates, lesson days and time. */
export function GroupForm({ group, courses, teachers, busy, onSubmit, onCancel }: GroupFormProps) {
  const { t } = useTranslation();
  const [f, setF] = useState({
    name: group?.name ?? "",
    courseId: group?.courseId ?? "",
    teacherId: group?.teacherId ?? "",
    // Not asked: a new group starts today; an existing one keeps its own start date.
    startDate: dateOnly(group?.startDate) || todayTashkent(),
    endDate: dateOnly(group?.endDate),
    rhythmMode: (group?.days ?? (group?.weekdays.length ? "CUSTOM" : "NONE")) as GroupDays | "CUSTOM" | "NONE",
    weekdays: sortDays(group?.weekdays ?? []),
    startTime: group?.startTime ?? "",
    room: group?.room ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));
  const days = weekdayNames(t);

  const toggleDay = (day: number) =>
    set({ weekdays: sortDays(f.weekdays.includes(day) ? f.weekdays.filter((d) => d !== day) : [...f.weekdays, day]) });

  const submit = () => {
    if (f.name.trim().length < 2 || !f.courseId || !f.startDate || (teachers && !f.teacherId)) return setErr(t("groupForm.fillAll"));
    const weekdays = f.rhythmMode === "CUSTOM" ? f.weekdays : [];
    const rhythmDays = f.rhythmMode === "ODD" || f.rhythmMode === "EVEN" || weekdays.length > 0;
    if (rhythmDays && !f.startTime) return setErr(t("groupForm.needTime"));
    if (!rhythmDays && f.startTime) return setErr(t("groupForm.needDays"));
    setErr(null);
    void onSubmit({
      name: f.name.trim(),
      courseId: f.courseId,
      ...(teachers ? { teacherId: f.teacherId } : {}),
      startDate: f.startDate,
      endDate: f.endDate || null,
      capacity: group?.capacity ?? 20,
      days: f.rhythmMode === "ODD" || f.rhythmMode === "EVEN" ? f.rhythmMode : null,
      weekdays,
      startTime: rhythmDays ? f.startTime : null,
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
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label={t("groupForm.rhythm")}>
          {(["ODD", "EVEN", "CUSTOM", "NONE"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={f.rhythmMode === mode}
              onClick={() => set({ rhythmMode: mode, ...(mode !== "CUSTOM" ? { weekdays: [] } : {}), ...(mode === "NONE" ? { startTime: "" } : {}) })}
              className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${
                f.rhythmMode === mode
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                  : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
              }`}
            >
              {mode === "ODD" ? t("groupForm.odd") : mode === "EVEN" ? t("groupForm.even") : mode === "CUSTOM" ? t("groupForm.customRhythm") : t("groupForm.rhythmNone")}
            </button>
          ))}
        </div>
        {f.rhythmMode === "CUSTOM" && (
          <div className="space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">{t("groupForm.pickDays")}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("groupForm.pickDays")}>
              {days.map((name, i) => {
                const day = i + 1;
                const on = f.weekdays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDay(day)}
                    className={`min-w-11 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      on
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            {f.weekdays.length > 0 && (
              <button type="button" onClick={() => set({ weekdays: [] })} className="text-xs font-medium text-slate-500 underline-offset-2 hover:underline">
                {t("groupForm.clearDays")}
              </button>
            )}
          </div>
        )}
        {f.rhythmMode !== "NONE" && (
          <TimeInput label={t("groupForm.startTime")} value={f.startTime} onChange={(value) => set({ startTime: value })} />
        )}
        <p className="text-xs text-slate-500">{t("groupForm.rhythmHint")}</p>
      </fieldset>

      <Input label={t("groupForm.room")} value={f.room} onChange={(e) => set({ room: e.target.value })} />

      {err && <p role="alert" className="text-sm text-red-500">{err}</p>}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>{t("groupForm.cancel")}</Button>
        <Button loading={busy} onClick={submit}>{group ? t("groupForm.save") : t("groupForm.open")}</Button>
      </div>
    </div>
  );
}

/** "Toq · 18:00" or "Du, Ch · 18:00" — the short rhythm label for lists; empty when the group has none. */
export const rhythmLabel = (g: Pick<Group, "days" | "weekdays" | "startTime">, t: TFunction) => {
  if (!g.startTime) return "";
  const label = g.days
    ? g.days === "ODD"
      ? t("groupForm.oddShort")
      : t("groupForm.evenShort")
    : sortDays(g.weekdays)
        .map((d) => weekdayNames(t)[d - 1])
        .filter(Boolean)
        .join(", ");
  return label ? `${label} · ${g.startTime}` : "";
};
