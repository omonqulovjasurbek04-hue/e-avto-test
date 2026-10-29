import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Archive, ArchiveRestore, Check, CalendarDays, CalendarPlus, DoorOpen, GraduationCap, Plus, UserPlus, Users, Pencil, Trash2 } from "lucide-react";
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

/** What a click on a card does while choosing: pick for deleting / archiving / bringing back, or open the edit form. */
type PickMode = "delete" | "archive" | "restore" | "edit";

/**
 * Groups. A teacher sees and opens their own. A group manager (admin, front desk) also runs every group
 * here: opens one for any teacher, adds members, puts extra lessons on the schedule, deletes (several at once) — and sees
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
  // "Delete", "archive" and "edit" turn on choosing; the chosen groups are handled together (delete after a confirmation).
  const [mode, setMode] = useState<PickMode | null>(null);
  const selecting = mode !== null;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  // Finished groups (past their end date) move to the archive by themselves; this switch shows them.
  const [showArchive, setShowArchive] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  // Published courses: groups are opened for the courses the school sells; a manager also picks the teacher.
  const formOpen = opening || editing !== null;
  const courses = useLoad(() => (formOpen ? courseService.getCourses() : Promise.resolve([])), [formOpen]);
  const teachers = useLoad(
    () => (formOpen && manager ? adminService.listUsers({ role: "TEACHER", limit: 100 }).then((p) => p.items) : Promise.resolve([])),
    [formOpen, manager]
  );

  const save = async (input: GroupInput) => {
    if (!editing) return;
    setBusy(true);
    try {
      await teacherService.updateGroup(editing.id, input);
      toast.success(t("admin.common.saved"));
      setEditing(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

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

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const stopSelecting = () => {
    setMode(null);
    setSelected(new Set());
  };
  const startPicking = (m: PickMode) => {
    setSelected(new Set());
    setMode(m);
  };

  // Deletes, archives or brings back the chosen groups, one request each; a partial failure is reported as such.
  const applySelected = async () => {
    if (mode === "edit" || mode === null) return;
    setConfirming(false);
    setWorking(true);
    const ids = [...selected];
    const action = { delete: teacherService.deleteGroup, archive: teacherService.archiveGroup, restore: teacherService.restoreGroup }[mode];
    const results = await Promise.allSettled(ids.map((id) => action(id)));
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed === 0) toast.success(mode === "delete" ? t("groupDelete.done", { count: ids.length }) : t(mode === "archive" ? "groupArchive.archived" : "groupArchive.restored", { count: ids.length }));
    else if (mode === "delete") toast.error(t("groupDelete.partly", { done: ids.length - failed, failed }));
    // A finished group comes back only with a later end date: say how.
    else toast.error(t("groupArchive.partly", { done: ids.length - failed, failed }), mode === "restore" ? { description: t("groupArchive.ended") } : undefined);
    setWorking(false);
    stopSelecting();
    reload();
  };

  const all = data ?? [];
  const archivedCount = all.filter((g) => g.status === "ARCHIVED").length;
  const groups = all.filter((g) => (showArchive ? g.status === "ARCHIVED" : g.status !== "ARCHIVED"));
  const mine = groups.filter((g) => g.teacherId === me?.id);
  // Rooms in use (a group's own room), sorted; groups without one go last.
  const rooms = useMemo(() => [...new Set(groups.map((g) => g.room?.trim()).filter((r): r is string => Boolean(r)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [groups]);
  const byRoom = (r: string) => groups.filter((g) => (r === NO_ROOM ? !g.room?.trim() : g.room?.trim() === r));
  const sections = (room ? [room] : [...rooms, NO_ROOM]).map((r) => ({ room: r, list: byRoom(r) })).filter((s) => s.list.length > 0);

  const card = (g: Group, withTools: boolean) => (
    <Card
      key={g.id}
      className={cn(
        "transition hover:border-brand-400",
        mode === "edit" && "border-dashed border-brand-300",
        selected.has(g.id) && (mode === "delete" ? "border-red-400 ring-2 ring-red-200 dark:ring-red-500/30" : "border-brand-400 ring-2 ring-brand-200 dark:ring-brand-500/30")
      )}
    >
      <CardContent className="space-y-2 p-5">
        <Link
          to={`/teacher/groups/${g.id}`}
          onClick={(e) => {
            // While choosing, a click picks the group (or opens its edit form) instead of opening it.
            if (!selecting) return;
            e.preventDefault();
            if (mode === "edit") {
              setEditing(g);
              stopSelecting();
            } else toggle(g.id);
          }}
          className="block space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-slate-900 dark:text-white">{g.name}</h3>
            {mode === "edit" && <Pencil className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />}
            {selecting && mode !== "edit" && (
              <span
                aria-hidden
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2",
                  !selected.has(g.id) ? "border-slate-300 dark:border-slate-600" : mode === "delete" ? "border-red-500 bg-red-500 text-white" : "border-brand-600 bg-brand-600 text-white"
                )}
              >
                {selected.has(g.id) && <Check className="h-4 w-4" />}
              </span>
            )}
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
        {withTools && !selecting && g.status === "ACTIVE" && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <Button size="sm" variant="outline" leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setMembersOf(g)}>
              {t("admin.groups.members")}
            </Button>
            <Button size="sm" variant="outline" leftIcon={<CalendarPlus className="h-4 w-4" />} onClick={() => setSlotsOf(g)}>
              {t("admin.groups.schedule")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const chip = "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition";
  const idle = "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-400 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700";
  // Edit and archive sit with the archive switch, at the end of the room row (their own row on a phone).
  const tools = !selecting && (
    <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
      {groups.length > 0 && (
        <button type="button" onClick={() => startPicking("edit")} className={cn(chip, idle)}>
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          {t("groupArchive.edit")}
        </button>
      )}
      {groups.length > 0 && (
        <button type="button" onClick={() => startPicking(showArchive ? "restore" : "archive")} className={cn(chip, idle)}>
          {showArchive ? <ArchiveRestore className="h-3.5 w-3.5" aria-hidden /> : <Archive className="h-3.5 w-3.5" aria-hidden />}
          {showArchive ? t("groupArchive.restore") : t("groupArchive.archive")}
        </button>
      )}
      {(archivedCount > 0 || showArchive) && (
        <button
          type="button"
          onClick={() => {
            setShowArchive((v) => !v);
            setRoom("");
          }}
          aria-pressed={showArchive}
          className={cn(chip, showArchive ? "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900" : idle)}
        >
          <Archive className="h-3.5 w-3.5" aria-hidden />
          {showArchive ? t("groupArchive.back") : t("groupArchive.show", { count: archivedCount })}
        </button>
      )}
    </div>
  );
  const hint = { delete: "groupDelete.pickHint", archive: "groupArchive.pickArchive", restore: "groupArchive.pickRestore", edit: "groupArchive.pickEdit" } as const;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{manager ? t("admin.groups.title") : t("teacher.groups.title")}</h1>
        {!selecting && (
          <div className="flex flex-wrap gap-2">
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpening(true)}>
              {manager ? t("admin.groups.new") : t("groupForm.open")}
            </Button>
            {groups.length > 0 && (
              <Button variant="outline" className="text-red-600 hover:border-red-300 hover:bg-red-50 dark:text-red-400" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => startPicking("delete")}>
                {t("common.delete")}
              </Button>
            )}
          </div>
        )}
      </div>
      {/* While choosing, the actions stay in sight (pinned under the top bar) however long the list is. */}
      {mode && (
        <div className="sticky top-16 z-20 -mt-2 mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <p className="mr-auto basis-full text-sm text-slate-600 sm:basis-auto dark:text-slate-300">{t(hint[mode])}</p>
          {mode !== "edit" && (
            <Button size="sm" variant="ghost" onClick={() => setSelected(selected.size === groups.length ? new Set() : new Set(groups.map((g) => g.id)))}>
              {selected.size === groups.length ? t("groupDelete.none") : t("groupDelete.all")}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={stopSelecting}>
            {t("common.cancel")}
          </Button>
          {mode === "delete" && (
            <Button size="sm" variant="danger" loading={working} disabled={selected.size === 0} leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirming(true)}>
              {t("groupDelete.deleteSelected", { count: selected.size })}
            </Button>
          )}
          {(mode === "archive" || mode === "restore") && (
            <Button
              size="sm"
              loading={working}
              disabled={selected.size === 0}
              leftIcon={mode === "archive" ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
              onClick={applySelected}
            >
              {t(mode === "archive" ? "groupArchive.archiveSelected" : "groupArchive.restoreSelected", { count: selected.size })}
            </Button>
          )}
        </div>
      )}

      {loading && !data ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : all.length === 0 ? (
        <EmptyState title={t("teacher.groups.empty")} description={t("teacher.groups.emptyHint")} />
      ) : !manager ? (
        <div className="space-y-4">
          {tools}
          {groups.length === 0 ? (
            <EmptyState title={showArchive ? t("groupArchive.empty") : t("teacher.groups.empty")} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">{groups.map((g) => card(g, false))}</div>
          )}
        </div>
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
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex flex-wrap gap-2">
                {["", ...rooms, ...(byRoom(NO_ROOM).length ? [NO_ROOM] : [])].map((r) => (
                  <button key={r || "all"} type="button" onClick={() => setRoom(r)} aria-pressed={room === r} className={cn(chip, room === r ? "bg-brand-600 text-white" : idle)}>
                    {r && <DoorOpen className="h-3.5 w-3.5" aria-hidden />}
                    {r === "" ? t("groupsByRoom.all") : r === NO_ROOM ? t("groupsByRoom.noRoom") : r}
                  </button>
                ))}
              </div>
              {tools}
            </div>
            {groups.length === 0 && <EmptyState title={showArchive ? t("groupArchive.empty") : t("teacher.groups.empty")} />}
            <div className="space-y-6">
              {sections.map((s) => (
                <div key={s.room}>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    <DoorOpen className="h-4 w-4" aria-hidden />
                    {s.room === NO_ROOM ? t("groupsByRoom.noRoom") : s.room}
                    <span className="font-normal normal-case text-slate-400">· {t("groupsByRoom.count", { count: s.list.length })}</span>
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">{s.list.map((g) => card(g, true))}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={t("groupArchive.editTitle", { name: editing?.name ?? "" })} maxWidth="lg">
        {editing && (
          <GroupForm group={editing} courses={courses.data ?? []} teachers={manager ? teachers.data ?? [] : undefined} busy={busy} onSubmit={save} onCancel={() => setEditing(null)} />
        )}
      </Modal>
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
        open={confirming}
        title={t("groupDelete.title", { count: selected.size })}
        message={t("groupDelete.text")}
        confirmText={t("common.delete")}
        onConfirm={applySelected}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
