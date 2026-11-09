import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { teacherService, type GroupDetail } from "@/services/platform.service";
import { Button } from "@/components/ui/Button";

/**
 * The students of a group with remove. Adding happens in AddStudentModal (the header's icon).
 * The server checks again that the caller may change this group.
 */
export function GroupMembers({
  group,
  editable,
  onAdd,
  onChanged,
}: {
  group: GroupDetail;
  editable: boolean;
  onAdd?: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);

  const remove = async (studentId: string) => {
    setBusy(studentId);
    try {
      await teacherService.removeMember(group.id, studentId);
      toast.success(t("groupForm.removed"));
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return group.members.length === 0 ? (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
      <p className="text-sm text-slate-500">{t("groupForm.empty")}</p>
      {editable && onAdd && (
        <Button size="sm" leftIcon={<UserPlus className="h-4 w-4" />} onClick={onAdd}>
          {t("groupForm.addStudent")}
        </Button>
      )}
    </div>
  ) : (
    <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
      {group.members.map((m) => (
        <li key={m.studentId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span className="font-medium text-slate-900 dark:text-white">{m.student.name}</span>
          <span className="flex items-center gap-3">
            <span className="text-slate-500">{m.student.phone ?? ""}</span>
            {editable && (
              <Button
                size="sm"
                variant="ghost"
                aria-label={t("groupForm.remove")}
                loading={busy === m.studentId}
                onClick={() => void remove(m.studentId)}
              >
                <UserMinus className="h-4 w-4" />
              </Button>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
