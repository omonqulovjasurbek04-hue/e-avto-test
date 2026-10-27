import { Link } from "react-router-dom";
import { BookOpenCheck, Car, ClipboardCheck, Flame, Mail, Phone, Target, TrendingUp, User as UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { useLoad } from "@/hooks/useLoad";
import { userService, type Readiness } from "@/services/user.service";
import { formatAccountId } from "@/utils/studentId";
import { cn } from "@/utils/cn";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

const LEVEL_TONE: Record<Readiness["level"], { ring: string; text: string }> = {
  ready: { ring: "stroke-emerald-600", text: "text-emerald-700 dark:text-emerald-400" },
  almost: { ring: "stroke-brand-600", text: "text-brand-700 dark:text-brand-400" },
  notYet: { ring: "stroke-amber-500", text: "text-amber-700 dark:text-amber-400" },
};

/** Percent ring: a full circle track with the filled share drawn on top. */
function ReadinessRing({ percent, level }: { percent: number; level: Readiness["level"] }) {
  const { t } = useTranslation();
  const r = 54;
  const length = 2 * Math.PI * r;
  return (
    <div className="relative h-40 w-40">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="64" cy="64" r={r} fill="none" strokeWidth="12" className="stroke-brand-100 dark:stroke-slate-800" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - Math.min(100, Math.max(0, percent)) / 100)}
          className={cn("transition-[stroke-dashoffset] duration-700", LEVEL_TONE[level].ring)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-slate-900 dark:text-white">{percent}%</span>
        <span className="text-xs text-slate-500">{t("profilePage.readiness")}</span>
      </div>
    </div>
  );
}

/** One input of the readiness score with its own bar. */
function Factor({ icon: Icon, label, value, detail, weight }: { icon: typeof Target; label: string; value: number; detail: string; weight: number }) {
  return (
    <li>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
          <Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden /> {label}
          <span className="text-xs font-normal text-slate-400">· {weight}%</span>
        </span>
        <span className="font-semibold text-slate-900 dark:text-white">{value}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-brand-600 transition-[width] duration-700" style={{ width: `${value}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </li>
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: stats, loading, error, reload } = useLoad(() => userService.getStatistics(), []);

  if (!user) {
    return (
      <div className="container-page py-8">
        <ErrorState title={t("common.error")} message={t("auth.login.title")} />
      </div>
    );
  }

  const ready = stats?.readiness;
  const cards = stats
    ? [
        { value: String(stats.totalTests), label: t("profilePage.tests"), tone: "text-brand-700 dark:text-brand-400" },
        { value: `${stats.averageScore}%`, label: t("profilePage.average"), tone: "text-emerald-700 dark:text-emerald-400" },
        { value: t("profilePage.days", { count: stats.studyStreakDays }), label: t("profilePage.streak"), tone: "text-amber-700 dark:text-amber-400" },
        { value: `${ready?.lessons.completed ?? 0}/${ready?.lessons.total ?? 0}`, label: t("profilePage.lessons"), tone: "text-slate-900 dark:text-white" },
      ]
    : [];

  return (
    <div className="container-page space-y-6 py-8">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
          <UserIcon className="h-6 w-6 text-brand-600" />
          {t("profile.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("profile.description")}</p>
      </header>

      {/* Who the student is, and the four numbers that sum up their work so far. */}
      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-white to-brand-50/60 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
        <CardContent className="flex flex-col gap-6 p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <Link to={ROUTES.settings} className="shrink-0 rounded-full" aria-label={t("photo.change")}>
              <Avatar name={user.name} src={user.avatarUrl} color="bg-brand-600" size="lg" className="h-20 w-20 text-2xl" />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-2xl font-bold text-slate-900 dark:text-white">{user.name}</h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  {formatAccountId(user)}
                </span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                {user.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" aria-hidden /> {user.email}
                  </span>
                )}
                {user.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" aria-hidden /> {user.phone}
                  </span>
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-lg bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                  {t(`roles.${user.role}`, user.role)}
                </span>
                {ready?.courses.map((c) => (
                  <span key={c.title} className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                    <Car className="h-4 w-4" aria-hidden /> {t("profilePage.candidate", { course: c.category ?? c.title })}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {loading && !stats ? (
            <Skeleton className="h-24 w-full rounded-2xl xl:w-[34rem]" />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[36rem]">
              {cards.map((c) => (
                <div key={c.label} className="rounded-2xl bg-white/90 px-3 py-4 text-center shadow-sm dark:bg-slate-800/70">
                  <p className={cn("text-2xl font-bold", c.tone)}>{c.value}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">{c.label}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !ready ? (
        <Skeleton className="h-64 w-full rounded-3xl" />
      ) : ready ? (
        // Readiness for the state exam: the score, what it means, and the three things it is made of.
        <Card className="rounded-3xl border border-slate-200 dark:border-slate-800">
          <CardContent className="grid gap-8 p-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
            <div className="flex flex-col items-center gap-3">
              <ReadinessRing percent={ready.percent} level={ready.level} />
              <p className={cn("flex items-center gap-1.5 text-sm font-bold", LEVEL_TONE[ready.level].text)}>
                <TrendingUp className="h-4 w-4" aria-hidden /> {t(`profilePage.level.${ready.level}`)}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t("profilePage.readinessTitle")}</h3>
              <p className="mt-1 text-sm text-slate-500">{t(`profilePage.advice.${ready.level}`)}</p>
              <ul className="mt-5 space-y-4">
                <Factor
                  icon={BookOpenCheck}
                  label={t("profilePage.factorLessons")}
                  value={ready.lessons.percent}
                  weight={40}
                  detail={t("profilePage.factorLessonsDetail", { done: ready.lessons.completed, total: ready.lessons.total })}
                />
                <Factor
                  icon={Target}
                  label={t("profilePage.factorScore")}
                  value={ready.recentAverage}
                  weight={40}
                  detail={ready.recentTests ? t("profilePage.factorScoreDetail", { count: ready.recentTests }) : t("profilePage.noExams")}
                />
                <Factor
                  icon={ClipboardCheck}
                  label={t("profilePage.factorPassed")}
                  value={ready.recentPassRate}
                  weight={20}
                  detail={ready.recentTests ? t("profilePage.factorPassedDetail") : t("profilePage.noExams")}
                />
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
                <Link to={ROUTES.tests} className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
                  <Flame className="mr-1 inline h-4 w-4" aria-hidden />
                  {t("profilePage.practise")} →
                </Link>
                <Link to={ROUTES.settings} className="font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300">
                  {t("profile.editProfile")} →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
