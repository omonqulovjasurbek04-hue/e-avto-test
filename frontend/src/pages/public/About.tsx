import { motion } from "framer-motion";
import { Target, Heart, Lightbulb, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { siteService } from "@/services/site.service";
import { useLoad } from "@/hooks/useLoad";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import SafeHtml from "@/components/common/SafeHtml";

export default function About() {
  const { i18n } = useTranslation();
  const cms = useLoad(() => siteService.page("about").catch(() => null), [i18n.language]);
  useDocumentMeta(cms.data?.seoTitle || cms.data?.title, cms.data?.seoDescription);
  if (cms.loading) return <div className="container-page py-10" />;
  // A published CMS page with the slug "about" replaces the built-in text.
  if (cms.data) {
    return (
      <div className="container-page max-w-3xl py-10">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{cms.data.title}</h1>
        <SafeHtml html={cms.data.content} className="mt-6 space-y-3 text-slate-700 dark:text-slate-300" />
      </div>
    );
  }
  return <AboutDefault />;
}

function AboutDefault() {
  const { t } = useTranslation();

  const values = [
    { icon: Target, title: t("about.values.quality.title"), desc: t("about.values.quality.description") },
    { icon: Heart, title: t("about.values.accessibility.title"), desc: t("about.values.accessibility.description") },
    { icon: Lightbulb, title: t("about.values.innovation.title"), desc: t("about.values.innovation.description") },
    { icon: Users, title: t("about.team.title"), desc: t("about.team.description") },
  ];

  return (
    <div className="container-page py-10 space-y-16">
      <section className="text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-extrabold text-slate-800 dark:text-slate-100"
        >
          {t("about.title")}
        </motion.h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-500">
          {t("about.mission.description")}
        </p>
      </section>

      <section>
        <h2 className="mb-8 text-center text-3xl font-bold text-slate-800 dark:text-slate-100">
          {t("about.values.title")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">{v.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-900/50">
        <h2 className="mb-4 text-2xl font-bold text-slate-800 dark:text-slate-100">
          {t("about.values.title")}
        </h2>
        <p className="text-slate-600 dark:text-slate-300">
          {t("about.mission.description")}
        </p>
      </section>
    </div>
  );
}