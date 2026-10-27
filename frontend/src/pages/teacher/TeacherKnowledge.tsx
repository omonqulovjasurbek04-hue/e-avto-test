import { useTranslation } from "react-i18next";
import { GroupKnowledgePanel } from "@/components/knowledge/GroupKnowledgePanel";

/** Knowledge control for teachers: their own groups, one at a time; a student opens their own page. */
export default function TeacherKnowledge() {
  const { t } = useTranslation();
  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("knowledge.title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("knowledge.subtitle")}</p>
      <GroupKnowledgePanel />
    </div>
  );
}
