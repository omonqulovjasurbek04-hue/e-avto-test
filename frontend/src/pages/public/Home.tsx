import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  Trophy,
  Users,
  Lightbulb,
  GraduationCap,
  ChevronDown,
  Send,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/constants/routes";
import { courseService } from "@/services/course.service";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import type { Course } from "@/types/course";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import CourseCard from "@/components/course/CourseCard";
import HeroCinematic from "@/components/home/HeroCinematic";

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

  const faqs = ["q1", "q2", "q3", "q4"].map((k) => ({ q: t(`home.faq.items.${k}.q`), a: t(`home.faq.items.${k}.a`) }));
  // Visitor questions go to the Telegram bot; the link is set per deployment (VITE_TELEGRAM_URL).
  const telegramUrl = import.meta.env.VITE_TELEGRAM_URL;

  return (
    <div className="space-y-20 pb-20">
      <HeroCinematic
        eyebrow={site.siteName || "E-AVTO TEST"}
        title={site.heroTitle || t("home.heroTitle")}
        subtitle={site.heroSubtitle || t("home.heroSubtitle")}
        actions={
          <>
            <Button size="lg" variant="primary" className="rounded-full px-8 py-3.5 font-bold shadow-lg shadow-brand-600/30" onClick={() => navigate(ROUTES.tests)}>
              {t("home.startTest")}
            </Button>
            <Button size="lg" variant="outline" className="rounded-full border-slate-900/25 bg-white/70 px-8 py-3.5 font-semibold text-slate-900 backdrop-blur-sm hover:bg-white dark:border-white/40 dark:bg-transparent dark:text-white dark:hover:bg-white/10" onClick={() => navigate(ROUTES.courses)}>
              {t("home.viewCourses")}
            </Button>
          </>
        }
      />

      <section className="container-page">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
          <div className="text-center space-y-2 mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700 dark:text-brand-400">{t("home.eyebrows.features")}</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("home.features.title")}</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <MotionCard key={f.title} padded variants={fadeUp} className="text-center space-y-3 rounded-2xl border-transparent dark:border-slate-800 p-6 hover:-translate-y-0.5 hover:shadow-lg transition">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                  <f.icon className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed dark:text-slate-400">{f.desc}</p>
              </MotionCard>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700 dark:text-brand-400">{t("home.eyebrows.courses")}</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("home.courses.title")}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t("home.courses.description")}</p>
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

      <section className="bg-slate-100 py-16 dark:bg-slate-900/40 dark:border-y dark:border-slate-800">
        <div className="container-page">
          <div className="text-center mb-12 space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700 dark:text-brand-400">{t("home.eyebrows.howItWorks")}</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("home.howItWorks.title")}</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md dark:border dark:border-slate-800 dark:bg-slate-900 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 font-display text-lg font-extrabold text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">{s.n}</div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed dark:text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 lg:px-12">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700 dark:text-brand-400">{t("home.eyebrows.faq")}</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{t("home.faq.title")}</h2>
        </motion.div>
        <div className="space-y-4">
          {faqs.map((item) => (
            <details key={item.q} className="group cursor-pointer rounded-xl bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md dark:border dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
              <summary className="flex list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{item.q}</h3>
                <ChevronDown className="h-6 w-6 shrink-0 text-brand-700 transition-transform group-open:rotate-180 dark:text-brand-400" />
              </summary>
              <p className="pt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl bg-slate-100 p-6 text-center sm:flex-row sm:text-left dark:bg-slate-900/60 dark:ring-1 dark:ring-slate-800">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            <Send className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 dark:text-white">{t("home.faq.telegram.title")}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("home.faq.telegram.description")}</p>
          </div>
          {telegramUrl && (
            <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <Button variant="primary" leftIcon={<Send className="h-4 w-4" />}>{t("home.faq.telegram.button")}</Button>
            </a>
          )}
        </div>
      </section>

      <section className="container-page">
        <Card padded className="border-0 bg-gradient-to-r from-brand-600 to-brand-700 text-center text-white shadow-xl shadow-brand-600/20 dark:bg-gradient-to-br dark:to-slate-900 dark:shadow-sm">
          <GraduationCap className="mx-auto mb-4 h-10 w-10" />
          <h2 className="text-3xl font-bold">{t("home.cta.title")}</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/80">{t("home.cta.description")}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="accent" size="lg" className="bg-white text-brand-700 hover:bg-slate-100 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400" onClick={() => navigate(ROUTES.register)}>{t("home.cta.button")}</Button>
            <Button size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10" onClick={() => navigate(ROUTES.courses)}>
              {t("nav.courses")}
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}