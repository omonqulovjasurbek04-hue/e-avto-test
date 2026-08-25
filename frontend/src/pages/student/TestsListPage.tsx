import React from "react";
import { useNavigate } from "react-router-dom";
import { testService } from "../../services/test.service";
import { useTestStore } from "../../store/test.store";
import { Card, CardContent, Button, Badge } from "../../components/ui";
import {
  CheckSquare,
  Clock,
  Zap,
  Flame,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Award,
} from "lucide-react";
import { TestMode } from "../../types/test";
import { toast } from "sonner";

export const TestsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { startSession } = useTestStore();

  const handleStartTest = async (mode: TestMode, questionCount: number, timeLimitMinutes: number) => {
    try {
      const session = await testService.startTest({
        mode,
        questionCount,
        timeLimitSeconds: timeLimitMinutes * 60,
      });
      startSession(session);
      navigate(`/tests/${session.attemptId}`);
    } catch {
      toast.error("Testni boshlashda xatolik yuz berdi");
    }
  };

  const testModes = [
    {
      id: "EXAM_20" as TestMode,
      title: "Davlat Standart Imtihoni (20 Savol)",
      description:
        "YHXDX imtihon markazlaridagi real format. 20 ta tasodifiy savol, 20 daqiqa vaqt. O'tish bali: 18 ta to'g'ri javob (90%).",
      icon: <Award className="h-7 w-7 text-amber-500" />,
      questions: 20,
      time: 20,
      badge: "Eng ommabop",
      badgeVariant: "accent" as const,
      variant: "primary" as const,
    },
    {
      id: "LESSON_TOPIC" as TestMode,
      title: "Mavzulashtirilgan Sinov Testi",
      description:
        "O'tilgan darslar bo'yicha bilimlarni mustahkamlash. Yo'l belgilari, chorrahalar va manevrlar bo'yicha 15 ta savol.",
      icon: <CheckSquare className="h-7 w-7 text-brand-600" />,
      questions: 15,
      time: 15,
      badge: "O'quv mashqi",
      badgeVariant: "primary" as const,
      variant: "secondary" as const,
    },
    {
      id: "MARATHON" as TestMode,
      title: "Marafon Rejimi (To'liq Baza)",
      description:
        "Barcha 1000+ ta savolni birin-ketin to'xtovsiz ishlash. Bilimingizni maksimal darajada sinash uchun cheksiz vaqt.",
      icon: <Flame className="h-7 w-7 text-red-500" />,
      questions: 50,
      time: 60,
      badge: "Cheksiz tayyorgarlik",
      badgeVariant: "danger" as const,
      variant: "secondary" as const,
    },
    {
      id: "MISTAKES_PRACTICE" as TestMode,
      title: "Xatolar Ustida Ishlash",
      description:
        "Oldingi testlarda adashgan savollaringizni qayta ishlab, xatolaringizni bartaraf qiling.",
      icon: <AlertTriangle className="h-7 w-7 text-yellow-500" />,
      questions: 10,
      time: 10,
      badge: "Aqlli takrorlash",
      badgeVariant: "warning" as const,
      variant: "secondary" as const,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="max-w-2xl space-y-3">
        <Badge variant="primary">Imtihon Simulyatori</Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Test Topshirish Rejimlari
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          O'zingizga qulay rejimni tanlang va bilimingizni sinovdan o'tkazing.
        </p>
      </div>

      {/* Test Modes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {testModes.map((mode) => (
          <Card
            key={mode.id}
            className="p-6 flex flex-col justify-between hover:border-brand-500/50 hover:shadow-lg transition-all duration-300 space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
                  {mode.icon}
                </div>
                <Badge variant={mode.badgeVariant} size="sm">
                  {mode.badge}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {mode.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {mode.description}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-brand-600" />
                  {mode.questions} ta savol
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-500" />
                  {mode.time} daqiqa
                </span>
              </div>
            </div>

            <Button
              variant={mode.id === "EXAM_20" ? "primary" : "outline"}
              className="w-full font-bold"
              onClick={() => handleStartTest(mode.id, mode.questions, mode.time)}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Boshlash
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
