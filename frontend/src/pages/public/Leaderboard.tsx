import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Info, ListChecks, Target, Trophy, UserRound, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { userService } from "@/services/user.service";
import { courseService } from "@/services/course.service";
import type { Course } from "@/types/course";
import type { Leaderboard as Board, LeaderboardEntry, LeaderboardSort } from "@/types/result";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatNumber } from "@/utils/money";
import { cn } from "@/utils/cn";

const TOP_SIZE = 10;
const SORTS: { value: LeaderboardSort; icon: LucideIcon }[] = [
  { value: "points", icon: Trophy },
  { value: "accuracy", icon: Target },
  { value: "tests", icon: ListChecks },
];
type TopRow = Pick<LeaderboardEntry, "rank" | "name" | "tests" | "accuracy" | "points"> & { isMe?: boolean };
/** Sample rows shown until ten real students are listed (labelled as samples on the page). */
const SAMPLE_TOP: TopRow[] = [
  { rank: 1, name: "Azizbek Karimov", tests: 42, accuracy: 95, points: 2850 },
  { rank: 2, name: "Madina Aliyeva", tests: 38, accuracy: 93, points: 2640 },
  { rank: 3, name: "Sardor Rahimov", tests: 35, accuracy: 91, points: 2420 },
  { rank: 4, name: "Malika Sobirova", tests: 24, accuracy: 89, points: 1810 },
  { rank: 5, name: "Javohir Islomov", tests: 21, accuracy: 84, points: 1530 },
  { rank: 6, name: "Dilnoza Usmonova", tests: 19, accuracy: 82, points: 1290 },
  { rank: 7, name: "Bekzod Tursunov", tests: 17, accuracy: 80, points: 1150 },
  { rank: 8, name: "Nilufar Qodirova", tests: 15, accuracy: 78, points: 980 },
  { rank: 9, name: "Otabek Yusupov", tests: 13, accuracy: 76, points: 860 },
  { rank: 10, name: "Shahnoza Ergasheva", tests: 11, accuracy: 74, points: 720 },
];
// Avatar backgrounds (initials): gold, silver, bronze, then brand blues.
const AVATAR = [
  "bg-gradient-to-br from-amber-400 to-amber-600",
  "bg-gradient-to-br from-slate-300 to-slate-500",
  "bg-gradient-to-br from-orange-300 to-orange-600",
  "bg-gradient-to-br from-brand-500 to-brand-700",
  "bg-gradient-to-br from-sky-500 to-blue-700",
  "bg-gradient-to-br from-indigo-500 to-indigo-700",
  "bg-gradient-to-br from-cyan-500 to-cyan-700",
  "bg-gradient-to-br from-blue-500 to-blue-800",
  "bg-gradient-to-br from-violet-500 to-violet-700",
  "bg-gradient-to-br from-teal-500 to-teal-700",
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function Leaderboard() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [courseId, setCourseId] = useState("");
  const [sort, setSort] = useState<LeaderboardSort>("points");
  const [courses, setCourses] = useState<Course[]>([]);
  const [data, setData] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    courseService.getCourses().then(setCourses).catch(() => setCourses([]));
  }, [i18n.language]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    userService
      .getLeaderboard({ courseId: courseId || undefined, sort })
      .then((d) => active && setData(d))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [courseId, sort, attempt, isAuthenticated]);

  const toggleVisibility = async () => {
    if (!data?.me) return;
    setSaving(true);
    try {
      const next = !data.me.visible;
      await userService.setLeaderboardVisibility(next);
      toast.success(next ? t("rating.nowVisible") : t("rating.nowHidden"));
      setAttempt((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const entries = data?.entries ?? [];
  // Until ten real students are listed, the "top ten" card shows clearly labelled sample rows.
  const realTop = entries.slice(0, TOP_SIZE);
  const isSample = realTop.length < TOP_SIZE;
  const top: TopRow[] = isSample ? SAMPLE_TOP : realTop;

  return (
    <div className="pb-16">
      {/* Header follows the theme: light blue wash by day, deep blue by night. */}
      <section className="relative overflow-hidden border-b border-brand-100 bg-gradient-to-br from-white via-brand-50 to-sky-100 text-slate-900 dark:border-slate-800 dark:from-slate-950 dark:via-brand-950 dark:to-slate-900 dark:text-white">
        <div className="container-page relative py-12 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-700 dark:text-brand-300">{t("rating.eyebrow")}</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{t("rating.title")}</h1>
          <p className="mt-2 max-w-xl text-slate-600 dark:text-slate-300">{t("rating.subtitle")}</p>
        </div>
      </section>

      <div className="container-page mt-8 space-y-8">
        {/* Filters: course on the left, sort as a segmented switch on the right — one card. */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-end lg:justify-between dark:border-slate-800 dark:bg-slate-950">
          <div className="w-full lg:max-w-sm">
            <Select
              label={t("rating.filterCourse")}
              options={[{ value: "", label: t("rating.allCourses") }, ...courses.map((c) => ({ value: c.id, label: c.title }))]}
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <p id="rating-sort" className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("rating.sortBy")}</p>
            <div role="radiogroup" aria-labelledby="rating-sort" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
              {SORTS.map(({ value, icon: Icon }) => {
                const active = sort === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSort(value)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4",
                      active
                        ? "bg-white text-brand-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-white dark:ring-slate-700"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active ? "text-brand-600 dark:text-brand-400" : "")} />
                    {t(`rating.sort_${value}`)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* The viewer's own place (private) and the consent switch. */}
        {isAuthenticated && data?.me && (
          <div className="flex flex-col gap-4 rounded-2xl border border-brand-200 bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-brand-800 dark:bg-brand-950/40">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white">
                {data.me.rank ?? "—"}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {data.me.rank ? t("rating.myRank", { rank: data.me.rank }) : t("rating.myNoTests")}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {t("rating.myLine", { points: formatNumber(data.me.points), tests: data.me.tests, accuracy: data.me.accuracy })}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{data.me.visible ? t("rating.visibleHint") : t("rating.hiddenHint")}</p>
              </div>
            </div>
            <Button
              variant={data.me.visible ? "outline" : "primary"}
              loading={saving}
              leftIcon={data.me.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              onClick={toggleVisibility}
            >
              {data.me.visible ? t("rating.hideMe") : t("rating.showMe")}
            </Button>
          </div>
        )}
        {!isAuthenticated && (
          <div className="flex flex-col gap-4 rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 to-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-brand-900/60 dark:from-brand-950/50 dark:to-slate-900">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/30">
                <UserRound className="h-5 w-5" />
              </span>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {t("rating.guestHint")} <span className="font-semibold text-slate-900 dark:text-white">{t("rating.loginLink")}</span>.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link to={ROUTES.login}>
                <Button size="sm" variant="primary" className="rounded-full px-5">{t("nav.login")}</Button>
              </Link>
              <Link to={ROUTES.register}>
                <Button size="sm" variant="outline" className="rounded-full bg-white/70 px-5 dark:bg-transparent">{t("nav.register")}</Button>
              </Link>
            </div>
          </div>
        )}

        {data && (
          <section aria-labelledby="top10" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 id="top10" className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Trophy className="h-5 w-5 text-amber-500" /> {t("rating.top10")}
            </h2>
            <ol className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/80">
              {top.map((e) => (
                <li key={e.rank} className={cn("flex items-center gap-4 py-3", e.isMe && "rounded-xl bg-brand-50 px-2 dark:bg-brand-950/40")}>
                  <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white", AVATAR[(e.rank - 1) % AVATAR.length])}>
                    {initials(e.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                      {e.rank}. {e.name}
                      {e.isMe && <span className="ml-2 text-xs font-medium text-brand-600 dark:text-brand-400">({t("rating.you")})</span>}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t("rating.testsAccuracy", { tests: e.tests, accuracy: e.accuracy })}</p>
                  </div>
                  <p className={cn("text-lg font-bold tabular-nums", e.rank === 1 ? "text-amber-500" : "text-slate-900 dark:text-white")}>{formatNumber(e.points)}</p>
                </li>
              ))}
            </ol>
            {isSample && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t("rating.sampleNote")}</p>}
          </section>
        )}

        {loading && !data ? (
          <Skeleton className="h-96 rounded-2xl" />
        ) : error ? (
          <ErrorState onRetry={() => setAttempt((n) => n + 1)} />
        ) : null}

        {/* How points are counted (the server applies exactly these rules). */}
        {data && (
          <section aria-labelledby="rules" className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 id="rules" className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Info className="h-4 w-4 text-brand-500" /> {t("rating.rulesTitle")}
            </h2>
            <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2 dark:text-slate-300">
              <li>{t("rating.rulePerCorrect", { n: data.rules.perCorrect })}</li>
              <li>{t("rating.rulePerfect", { n: data.rules.perfectBonus })}</li>
              <li>{t("rating.ruleFirstTry", { n: data.rules.firstTryPassBonus })}</li>
              <li>{t("rating.ruleWrong")}</li>
              <li className="sm:col-span-2">{t("rating.ruleRetake")}</li>
            </ul>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t("rating.privacyNote")}</p>
          </section>
        )}
      </div>
    </div>
  );
}
