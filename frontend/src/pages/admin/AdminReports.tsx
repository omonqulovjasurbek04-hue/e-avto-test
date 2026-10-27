import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardCheck, Download, Percent, Target, Users } from "lucide-react";
import { adminService } from "@/services/admin.service";
import { reportService } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import StatCard from "@/components/common/StatCard";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

const th = "px-4 py-3";
const thead = "bg-slate-50 dark:bg-slate-950 text-xs uppercase text-slate-500 dark:text-slate-400";
const wrap = "overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800";
const RANGES = ["7", "30", "90", "365"];
const DAY = 86_400_000;

/** Builds a CSV in the browser from rows already on screen (no extra endpoint, nothing more than the page shows). */
const downloadCsv = (name: string, header: string[], rows: (string | number)[][]) => {
  const cell = (v: string | number) => {
    const s = String(v);
    // Leading = + - @ would be run as a formula by spreadsheet apps.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

const minutes = (sec: number) => Math.round(sec / 60);

export default function AdminReports() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("tests");
  const [days, setDays] = useState("30");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("admin.reports.title")}</h2>
        <div className="w-48">
          <Select aria-label={t("admin.orders.period")} options={RANGES.map((value) => ({ value, label: t("admin.reports.lastDays", { count: Number(value) }) }))} value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
      </div>
      <Tabs activeTab={tab} onChange={setTab} tabs={[{ id: "tests", label: t("admin.reports.tabTests") }, { id: "teachers", label: t("admin.reports.tabTeachers") }]} />
      {tab === "tests" ? <TestsReport days={Number(days)} /> : <TeachersReport days={Number(days)} />}
    </div>
  );
}

function TestsReport({ days }: { days: number }) {
  const { t } = useTranslation();
  const [courseId, setCourseId] = useState("");
  const courses = useLoad(() => adminService.listCourses(), []);
  // Recomputed only when the period changes, so the request is not repeated on every render.
  const range = useMemo(() => ({ from: new Date(Date.now() - days * DAY).toISOString(), to: new Date(Date.now() + 1000).toISOString() }), [days]);
  const report = useLoad(() => reportService.tests(range.from, range.to, courseId || undefined), [range, courseId]);
  const r = report.data;
  const courseName = (name: string | null) => name ?? t("admin.reports.noCourse");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-64">
          <Select aria-label={t("admin.common.course")} options={[{ value: "", label: t("admin.lessons.allCourses") }, ...(courses.data ?? []).map((c) => ({ value: c.id, label: c.title }))]} value={courseId} onChange={(e) => setCourseId(e.target.value)} />
        </div>
        {r && r.rows.length > 0 && (
          <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => downloadCsv("test-results.csv",
            [t("admin.common.course"), t("admin.reports.attempts"), t("admin.reports.students"), t("admin.reports.passed"), t("admin.reports.passRate"), t("admin.reports.avgScore"), t("admin.reports.avgMinutes")],
            r.rows.map((row) => [courseName(row.course), row.attempts, row.students, row.passed, row.passRate, row.averageScore, minutes(row.averageSeconds)]))}>
            CSV
          </Button>
        )}
      </div>

      {report.loading && !r ? <Skeleton className="h-48 rounded-2xl" /> : report.error ? <ErrorState message={report.error} onRetry={report.reload} /> : !r ? null : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("admin.reports.attempts")} value={r.total.attempts} icon={<ClipboardCheck className="h-5 w-5" />} />
            <StatCard label={t("admin.reports.students")} value={r.total.students} icon={<Users className="h-5 w-5" />} />
            <StatCard label={t("admin.reports.avgScore")} value={`${r.total.averageScore}%`} icon={<Target className="h-5 w-5" />} color="amber" />
            <StatCard label={t("admin.reports.passRate")} value={`${r.total.passRate}%`} icon={<Percent className="h-5 w-5" />} color="green" />
          </div>
          <p className="text-xs text-slate-500">{t("admin.reports.testsHint")}</p>
          {r.rows.length === 0 ? <EmptyState title={t("admin.reports.noTests")} /> : (
            <div className={wrap}>
              <table className="w-full text-left text-sm">
                <thead className={thead}><tr><th className={th}>{t("admin.common.course")}</th><th className={th}>{t("admin.reports.attempts")}</th><th className={th}>{t("admin.reports.students")}</th><th className={th}>{t("admin.reports.passed")}</th><th className={th}>{t("admin.reports.passRate")}</th><th className={th}>{t("admin.reports.avgScore")}</th><th className={th}>{t("admin.reports.avgMinutes")}</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {r.rows.map((row) => (
                    <tr key={row.courseId ?? "none"}>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{courseName(row.course)}</td>
                      <td className="px-4 py-3">{row.attempts}</td>
                      <td className="px-4 py-3">{row.students}</td>
                      <td className="px-4 py-3">{row.passed}</td>
                      <td className="px-4 py-3"><Badge variant={row.passRate >= 70 ? "success" : row.passRate >= 40 ? "warning" : "danger"}>{row.passRate}%</Badge></td>
                      <td className="px-4 py-3">{row.averageScore}%</td>
                      <td className="px-4 py-3">{minutes(row.averageSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TeachersReport({ days }: { days: number }) {
  const { t } = useTranslation();
  // The past N days plus the coming week, so planned lessons are visible too.
  const range = useMemo(() => ({ from: new Date(Date.now() - days * DAY).toISOString(), to: new Date(Date.now() + 7 * DAY).toISOString() }), [days]);
  const report = useLoad(() => reportService.teachers(range.from, range.to), [range]);
  const rows = report.data?.rows;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{t("admin.reports.teachersHint", { count: days })}</p>
        {rows && rows.length > 0 && (
          <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => downloadCsv("teacher-workload.csv",
            [t("admin.groups.teacher"), t("admin.reports.groups"), t("admin.reports.students"), t("admin.reports.lessons"), t("admin.reports.done"), t("admin.reports.cancelled"), t("admin.reports.hours"), t("admin.reports.missing")],
            rows.map((r) => [r.name, r.activeGroups, r.students, r.lessons, r.done, r.cancelled, r.hours, r.attendanceMissing]))}>
            CSV
          </Button>
        )}
      </div>
      {report.loading && !rows ? <Skeleton className="h-48 rounded-2xl" /> : report.error ? <ErrorState message={report.error} onRetry={report.reload} /> : !rows || rows.length === 0 ? (
        <EmptyState title={t("admin.reports.noTeachers")} />
      ) : (
        <div className={wrap}>
          <table className="w-full text-left text-sm">
            <thead className={thead}><tr><th className={th}>{t("admin.groups.teacher")}</th><th className={th}>{t("admin.reports.groups")}</th><th className={th}>{t("admin.reports.students")}</th><th className={th}>{t("admin.reports.lessons")}</th><th className={th}>{t("admin.reports.done")}</th><th className={th}>{t("admin.reports.cancelled")}</th><th className={th}>{t("admin.reports.hours")}</th><th className={th}>{t("admin.reports.missing")}</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => (
                <tr key={r.teacherId}>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                  <td className="px-4 py-3">{r.activeGroups}</td>
                  <td className="px-4 py-3">{r.students}</td>
                  <td className="px-4 py-3">{r.lessons}</td>
                  <td className="px-4 py-3">{r.done}</td>
                  <td className="px-4 py-3">{r.cancelled}</td>
                  <td className="px-4 py-3">{r.hours}</td>
                  <td className="px-4 py-3">{r.attendanceMissing > 0 ? <Badge variant="warning">{r.attendanceMissing}</Badge> : "0"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
