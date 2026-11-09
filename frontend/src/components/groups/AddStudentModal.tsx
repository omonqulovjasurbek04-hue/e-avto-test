import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { teacherService, type GroupDetail, type StudentHit } from "@/services/platform.service";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatAccountId } from "@/utils/studentId";

/**
 * Search-and-add for a group, opened from the header's icon as an overlay over the page.
 * The server checks again that the caller may change this group.
 */
export function AddStudentModal({
  group,
  isOpen,
  onClose,
  onAdded,
}: {
  group: GroupDetail;
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query.trim(), 350);
  const [hits, setHits] = useState<StudentHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setHits([]);
      setAdded(new Set());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    setLoading(true);
    teacherService
      .searchStudents(debounced)
      .then((r) => alive && setHits(r))
      .catch(() => alive && setHits([]))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [debounced, isOpen]);

  const memberIds = new Set([...group.members.map((m) => m.studentId), ...added]);

  const add = async (student: StudentHit) => {
    setBusy(student.id);
    try {
      await teacherService.addMember(group.id, student.id);
      setAdded((prev) => new Set(prev).add(student.id));
      toast.success(t("groupForm.added"));
      setQuery("");
      setHits([]);
      await onAdded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("groupForm.addStudent")} maxWidth="lg">
      <div className="space-y-3">
        <Input
          autoFocus
          label={t("groupForm.addStudent")}
          placeholder={t("groupForm.searchStudent")}
          leftIcon={<Search className="h-4 w-4" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <ul className="max-h-80 divide-y divide-slate-200 overflow-y-auto rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {loading && hits.length === 0 && <li className="px-4 py-2.5 text-sm text-slate-500">{t("common.loading")}</li>}
          {!loading && hits.length === 0 && <li className="px-4 py-2.5 text-sm text-slate-500">{t("groupForm.noResults")}</li>}
          {hits.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="min-w-0">
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
                onClick={() => void add(s)}
              >
                {memberIds.has(s.id) ? t("groupForm.added") : t("groupForm.add")}
              </Button>
            </li>
          ))}
        </ul>

        <p className="text-xs text-slate-500">{t("groupForm.searchStudentHint")}</p>
      </div>
    </Modal>
  );
}
