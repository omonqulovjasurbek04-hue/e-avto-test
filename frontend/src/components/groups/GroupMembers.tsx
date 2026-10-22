import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { teacherService, type GroupDetail, type StudentHit } from "@/services/platform.service";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatAccountId } from "@/utils/studentId";

/**
 * The students of a group with search-and-add and remove. Used by teachers for their own groups;
 * the server checks again that the caller may change this group.
 */
export function GroupMembers({ group, editable, onChanged }: { group: GroupDetail; editable: boolean; onChanged: () => void | Promise<void> }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query.trim(), 350);
  const [hits, setHits] = useState<StudentHit[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!editable || debounced.length < 2) return setHits([]);
    let alive = true;
    teacherService.searchStudents(debounced).then((r) => alive && setHits(r)).catch(() => alive && setHits([]));
    return () => {
      alive = false;
    };
  }, [debounced, editable]);

  const memberIds = new Set(group.members.map((m) => m.studentId));
  const run = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(id);
    try {
      await fn();
      toast.success(ok);
      setQuery("");
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {editable && (
        <div className="space-y-2">
          <Input label={t("groupForm.addStudent")} placeholder={t("groupForm.searchStudent")} leftIcon={<Search className="h-4 w-4" />} value={query} onChange={(e) => setQuery(e.target.value)} />
          {debounced.length >= 2 && (
            <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {hits.length === 0 && <li className="px-4 py-2.5 text-sm text-slate-500">{t("groupForm.noResults")}</li>}
              {hits.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span>
                    <span className="font-medium text-slate-900 dark:text-white">{s.name}</span>
                    <span className="ml-2 font-mono text-xs text-slate-500">{formatAccountId(s)}</span>
                    {s.phone && <span className="ml-2 text-xs text-slate-500">{s.phone}</span>}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={memberIds.has(s.id)}
                    loading={busy === s.id}
                    leftIcon={<UserPlus className="h-4 w-4" />}
                    onClick={() => run(s.id, () => teacherService.addMember(group.id, s.id), t("groupForm.added"))}
                  >
                    {t("groupForm.add")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {group.members.length === 0 ? (
        <p className="text-sm text-slate-500">{t("groupForm.empty")}</p>
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
                    onClick={() => run(m.studentId, () => teacherService.removeMember(group.id, m.studentId), t("groupForm.removed"))}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
