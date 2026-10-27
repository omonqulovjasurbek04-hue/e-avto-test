import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Archive, CalendarDays, CalendarPlus, DoorOpen, GraduationCap, Plus, UserPlus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { adminPlatformService, teacherService, type Group, type GroupInput } from "@/services/platform.service";
import { adminService } from "@/services/admin.service";
import { courseService } from "@/services/course.service";
import { useLoad } from "@/hooks/useLoad";
import { useAuthStore } from "@/store/auth.store";
import { can } from "@/lib/permissions";
import { cn } from "@/utils/cn";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { GroupForm, rhythmLabel } from "@/components/groups/GroupForm";
import { MembersModal, SlotsModal } from "@/components/groups/GroupAdminModals";

/** "" = every room; NO_ROOM = groups without a room. */
const NO_ROOM = "__none__";

/**
 * Groups. A teacher sees and opens their own. A group manager (admin, front desk) also runs every group
 * here: opens one for any teacher, adds members, puts extra lessons on the schedule, archives — and sees
 * the groups by room, so a room's load is visible at a glance.
 */
export default function TeacherGroups() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const manager = can(me?.role, "groups:manage");
  const { data, loading, error, reload } = useLoad(() => teacherService.groups(), []);
  // "Open a group" from the dashboard arrives as ?new=1 and opens the form right away.
  const [opening, setOpening] = useState(useSearchParams()[0].get("new") === "1");
  const [busy, setBusy] = useState(false);
  const [room, setRoom] = useState("");
  const [membersOf, setMembersOf] = useState<Group | null>(null);
  const [slotsOf, setSlotsOf] = useState<Group | null>(null);
  const [archiving, setArchiving] = useState<Group | null>(null);
  // Published courses: groups are opened for the courses the school sells; a manager also picks the teacher.
  const courses = useLoad(() => (opening ? courseService.getCourses() : Promise.resolve([])), [opening]);
  const teachers = useLoad(
    () => (opening && manager ? adminService.listUsers({ role: "TEACHER", limit: 100 }).then((p) => p.items) : Promise.resolve([])),
    [opening, manager]
  );

  const open = async (input: GroupInput) => {
    setBusy(true);
    try {
      const g = manager ? await adminPlatformService.createGroup(input) : await teacherService.createGroup(input);
      toast.success(t("groupForm.created", { count: g.lessonsCreated }));
      setOpening(false);
      navigate(`/teacher/groups/${g.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!archiving) return;
    try {
      await adminPlatformService.archiveGroup(archiving.id);
      toast.success(t("admin.groups.archivedToast"));
      setArchiving(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.common.error"));
    }
  };

  const groups = data ?? [];
  const mine = groups.filter((g) => g.teacherId === me?.id);
  // Rooms in use (a group's own room), sorted; groups without one go last.
  const rooms = useMemo(() => [...new Set(groups.map((g) => g.room?.trim()).filter((r): r is string => Boolean(r)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [groups]);
  const byRoom = (r: string) => groups.filter((g) => (r === NO_ROOM ? !g.room?.trim() : g.room?.trim() === r));
  const sections = (room ? [room] : [...rooms, NO_ROOM]).map((r) => ({ room: r, list: byRoom(r) })).filter((s) => s.list.length > 0);

  const card = (g: Group, withTools: boolean) => (
    <Card key={g.id} className="transition hover:border-brand-400">
      <CardContent className="space-y-2 p-5">
        <Link to={`/teacher/groups/${g.id}`} className="block space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-slate-900 dark:text-white">{g.name}</h3>
            <Badge variant={g.status === "ACTIVE" ? "success" : "neutral"}>{g.status === "ACTIVE" ? t("teacher.groups.active") : t("teacher.groups.archived")}</Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">{g.course.title}</p>
          {withTools && (
            <p className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              <GraduationCap className="h-4 w-4" /> {g.teacher.name}
            </p>
          )}
          {rhythmLabel(g, t) && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400">
              <CalendarDays className="h-4 w-4" /> {rhythmLabel(g, t)}
            </p>
          )}
          <p className="flex items-center gap-1.5 text-sm text-slate-500">
            <Users className="h-4 w-4" /> {t("teacher.groups.students", { count: g._count.members, capacity: g.capacity })}
          </p>
        </Link>
        {withTools && g.status === "ACTIVE" && (
          <div className="flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <Button size="sm" variant="outline" leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setMembersOf(g)}>
              {t("admin.groups.members")}
            </Button>
            <Button size="sm" variant="outline" leftIcon={<CalendarPlus className="h-4 w-4" />} onClick={() => setSlotsOf(g)}>
              {t("admin.groups.schedule")}
            </Button>
            <button type="button" onClick={() => setArchiving(g)} aria-label={t("admin.common.archive")} title={t("admin.common.archive")} className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
              <Archive className="h-4 w-4" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{manager ? t("admin.groups.title") : t("teacher.groups.title")}</h1>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpening(true)}>
          {manager ? t("admin.groups.new") : t("groupForm.open")}
        </Button>
      </div>

      {loading && !data ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : groups.length === 0 ? (
        <EmptyState title={t("teacher.groups.empty")} description={t("teacher.groups.emptyHint")} />
      ) : !manager ? (
        <div className="grid gap-4 sm:grid-cols-2">{groups.map((g) => card(g, false))}</div>
      ) : (
        <div className="space-y-8">
          {/* The manager's own groups (when they also teach) first, as before. */}
          {mine.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">{t("teacher.groups.title")}</h2>
              <div className="grid gap-4 sm:grid-cols-2">{mine.map((g) => card(g, true))}</div>
            </section>
          )}

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("groupsByRoom.title")}</h2>
            <p className="mb-3 text-sm text-slate-500">{t("groupsByRoom.hint")}</p>
            {/* Room filter: every room, one room, or groups without a room. */}
            <div className="mb-4 flex flex-wrap gap-2">
              {["", ...rooms, ...(byRoom(NO_ROOM).length ? [NO_ROOM] : [])].map((r) => (
                <button
                  key={r || "all"}
                  type="button"
                  onClick={() => setRoom(r)}
                  aria-pressed={room === r}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                    room === r ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-400 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"
                  )}
                >
                  {r && <DoorOpen className="h-3.5 w-3.5" aria-hidden />}
                  {r === "" ? t("groupsByRoom.all") : r === NO_ROOM ? t("groupsByRoom.noRoom") : r}
                  <span className={cn("text-xs", room === r ? "text-brand-100" : "text-slate-400")}>{r === "" ? groups.length : byRoom(r).length}</span>
                </button>
              ))}
            </div>
            <div className="space-y-6">
              {sections.map((s) => (
                <div key={s.room}>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    <DoorOpen className="h-4 w-4" aria-hidden />
                    {s.room === NO_ROOM ? t("groupsByRoom.noRoom") : t("groupsByRoom.room", { room: s.room })}
                    <span className="font-normal normal-case text-slate-400">· {t("groupsByRoom.count", { count: s.list.length })}</span>
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">{s.list.map((g) => card(g, true))}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <Modal isOpen={opening} onClose={() => setOpening(false)} title={manager ? t("admin.groups.new") : t("groupForm.open")} maxWidth="lg">
        {opening && <GroupForm courses={courses.data ?? []} teachers={manager ? teachers.data ?? [] : undefined} busy={busy} onSubmit={open} onCancel={() => setOpening(false)} />}
      </Modal>
      {membersOf && (
        <MembersModal
          group={membersOf}
          onClose={() => {
            setMembersOf(null);
            reload();
          }}
        />
      )}
      {slotsOf && <SlotsModal group={slotsOf} onClose={() => setSlotsOf(null)} />}
      <ConfirmDialog
        open={archiving !== null}
        title={t("admin.groups.archiveTitle")}
        message={t("admin.groups.archiveText", { name: archiving?.name ?? "" })}
        confirmText={t("admin.common.archive")}
        onConfirm={archive}
        onCancel={() => setArchiving(null)}
      />
    </div>
  );
}
