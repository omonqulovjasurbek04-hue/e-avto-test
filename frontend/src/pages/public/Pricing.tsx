import { useTranslation } from "react-i18next";
import CoursePackages from "@/components/course/CoursePackages";

/** Every course's packages on one page (kept for old links; the course pages show their own packages). */
export default function Pricing() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t("pricing.title")}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">{t("pricing.subtitle")}</p>
      <div className="mt-8">
        <CoursePackages />
      </div>
    </div>
  );
}
