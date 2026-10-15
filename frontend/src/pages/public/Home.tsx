import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  Trophy,
  Users,
  Lightbulb,
  Star,
  ChevronDown,
  GraduationCap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/constants/routes";
import { courseService } from "@/services/course.service";
import { siteService } from "@/services/site.service";
import { useLoad } from "@/hooks/useLoad";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import type { Course } from "@/types/course";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import CourseCard from "@/components/course/CourseCard";
import HeroPositionedVideo from "@/components/home/HeroPositionedVideo";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const MotionCard = motion(Card);

export default function Home() {
  const { t } = useTranslation();
  const site = useSiteSettings();
  const navigate = useNavigate();
  const [popular, setPopular] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    let active = true;
    setLoadingCourses(true);
    courseService
      .getCourses({ sort: "newest" })
      .then((data) => {
        if (active) setPopular(data.slice(0, 3));
      })
      .catch(() => {
        if (active) setPopular([]);
      })
      .finally(() => {
        if (active) setLoadingCourses(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const features = [
    { icon: BookOpen, title: t("home.features.items.test.title"), desc: t("home.features.items.test.description") },
    { icon: Trophy, title: t("home.features.items.results.title"), desc: t("home.features.items.results.description") },
    { icon: Lightbulb, title: t("home.features.items.progress.title"), desc: t("home.features.items.progress.description") },
    { icon: Users, title: t("home.features.items.access.title"), desc: t("home.features.items.access.description") },
  ];

  const steps = [
    { n: 1, title: t("home.howItWorks.steps.register.title"), desc: t("home.howItWorks.steps.register.description") },
    { n: 2, title: t("home.howItWorks.steps.choose.title"), desc: t("home.howItWorks.steps.choose.description") },
    { n: 3, title: t("home.howItWorks.steps.test.title"), desc: t("home.howItWorks.steps.test.description") },
    { n: 4, title: t("home.howItWorks.steps.learn.title"), desc: t("home.howItWorks.steps.learn.description") },
  ];

  // Real numbers from the database (no marketing placeholders). A pass rate is shown only once tests exist.
  const live = useLoad(() => siteService.stats(), []);
  const fmt = (n: number | undefined) => (n === undefined ? "—" : new Intl.NumberFormat("uz-UZ").format(n));
  const stats = [
    { icon: Users, value: fmt(live.data?.users), label: t("home.stats.users") },
    { icon: BookOpen, value: fmt(live.data?.questions), label: t("home.stats.questions") },
    { icon: Trophy, value: live.data?.passRate == null ? "—" : `${live.data.passRate}%`, label: t("home.stats.passRate") },
    { icon: Star, value: fmt(live.data?.testsTaken), label: t("home.stats.tests") },
  ];

  const whyUs = [
    t("home.whyUs.items.official"),
    t("home.whyUs.items.free"),
    t("home.whyUs.items.convenient"),
    t("home.whyUs.items.mobile"),
  ];

  const faqs = [
    { q: t("faq.questions.q1.q"), a: t("faq.questions.q1.a") },
    { q: t("faq.questions.q2.q"), a: t("faq.questions.q2.a") },
    { q: t("faq.questions.q3.q"), a: t("faq.questions.q3.a") },
  ];

  return (
    <div className="space-y-20 pb-10">
      <section className="relative overflow-hidden min-h-[600px] lg:min-h-[660px] flex items-center py-20 lg:py-28 bg-slate-950 text-white border-b border-slate-800">
        <HeroPositionedVideo />
        <div className="absolute top-1/4 -left-20 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl pointer-events-none" />
        <div className="container-page relative z-10 max-w-7xl mx-auto w-full">
          <motion.div initial="hidden" animate="show" variants={fadeUp} className="max-w-2xl text-left space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md text-xs font-bold text-white shadow-lg">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{site.heroTitle || t("home.heroTitle")}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight drop-shadow-md">
              {(site.siteName || "E-AVTO TEST").toUpperCase()}
            </h1>
            <p className="text-base sm:text-lg text-slate-200/90 max-w-xl leading-relaxed">
              {site.heroSubtitle || t("home.heroSubtitle")}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button size="lg" variant="primary" className="font-bold shadow-xl shadow-brand-500/30 px-7 py-3.5" onClick={() => navigate(ROUTES.tests)}>
                {t("home.startTest")}
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md px-6 py-3.5 font-semibold" onClick={() => navigate(ROUTES.courses)}>
                {t("home.viewCourses")}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="container-page">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">{t("home.features.title")}</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <MotionCard key={f.title} padded variants={fadeUp} className="text-center space-y-3 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-lg transition">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <f.icon className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </MotionCard>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">{t("home.courses.title")}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("home.courses.description")}</p>
          </div>
          <Link to={ROUTES.courses}>
            <Button variant="outline" size="sm">{t("common.viewAll")}</Button>
          </Link>
        </div>
        {loadingCourses ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-slate-100/60 dark:bg-slate-900/40 py-16 border-y border-slate-200/80 dark:border-slate-800">
        <div className="container-page">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">{t("home.howItWorks.title")}</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
                <div className="text-2xl font-black text-brand-600 dark:text-brand-400">{s.n}</div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{s.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page">
        <div className="rounded-3xl bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-800 p-8 sm:p-12 text-white shadow-xl">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 text-center">
            {stats.map((s) => (
              <div key={s.label} className="space-y-1">
                <div className="text-3xl sm:text-5xl font-black">{s.value}</div>
                <div className="text-xs sm:text-sm text-white/80 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page">
        <div className="grid gap-10 lg:grid-cols-2">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
            <div className="mb-4 flex items-center gap-2 text-brand-600">
              <Lightbulb className="h-6 w-6" />
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t("home.whyUs.title")}</h2>
            </div>
            <ul className="space-y-3">
              {whyUs.map((w) => (
                <li key={w} className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {w}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="space-y-4">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t("home.testimonials.title")}</h2>
          </motion.div>
        </div>
      </section>

      <section className="container-page">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t("home.faq.title")}</h2>
        </motion.div>
        <div className="mx-auto max-w-3xl space-y-3">
          {faqs.map((item) => (
            <details key={item.q} className="group rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <summary className="flex cursor-pointer items-center justify-between font-medium text-slate-800 dark:text-slate-100">
                {item.q}
                <ChevronDown className="h-5 w-5 transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-slate-500">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => navigate(ROUTES.faq)}>{t("common.viewAll")}</Button>
        </div>
      </section>

      <section className="container-page">
        <Card padded className="bg-gradient-to-br from-brand-600 to-slate-900 text-center text-white">
          <GraduationCap className="mx-auto mb-4 h-10 w-10" />
          <h2 className="text-3xl font-bold">{t("home.cta.title")}</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/80">{t("home.cta.description")}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="accent" size="lg" onClick={() => navigate(ROUTES.register)}>{t("home.cta.button")}</Button>
            <Button size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10" onClick={() => navigate(ROUTES.courses)}>
              {t("nav.courses")}
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}