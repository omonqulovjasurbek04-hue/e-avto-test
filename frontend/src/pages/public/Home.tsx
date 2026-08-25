import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  Car,
  Trophy,
  Users,
  Lightbulb,
  ShieldCheck,
  Star,
  ChevronDown,
  CheckCircle2,
  Clock,
  GraduationCap,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { courseService } from "@/services/course.service";
import type { Course } from "@/types/course";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import CourseCard from "@/components/course/CourseCard";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const MotionCard = motion(Card);

export default function Home() {
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
    {
      icon: BookOpen,
      title: "Keng qamrovli darslar",
      desc: "Yo'l belgilari, qoidalar va xavfsizlik bo'yicha tuzilgan kurslar.",
    },
    {
      icon: Trophy,
      title: "Reyting va natijalar",
      desc: "O'z natijangizni kuzating va boshqalar bilan raqobatlashing.",
    },
    {
      icon: ShieldCheck,
      title: "Ishonchli tayyorgarlik",
      desc: "Imtihon formatiga mos testlar bilan tayyorlaning.",
    },
    {
      icon: Users,
      title: "Minglab o'quvchilar",
      desc: "O'quvchilarimiz haydovchilik guvohnomasini muvaffaqiyatli olmoqda.",
    },
  ];

  const steps = [
    { n: 1, title: "Ro'yxatdan o'ting", desc: "Bepul hisob yarating va kurslarni ko'rib chiqing." },
    { n: 2, title: "Kurslarni o'ting", desc: "Video darslar va materiallar bilan o'rganing." },
    { n: 3, title: "Testlarni yeching", desc: "Bilimlaringizni amaliy testlar bilan sinang." },
    { n: 4, title: "Guvohnoma oling", desc: "Ishonch bilan imtihonga boring va muvaffaqiyat qozoning." },
  ];

  const stats = [
    { icon: Users, value: "15 000+", label: "Ro'yxatdan o'tgan" },
    { icon: BookOpen, value: "120+", label: "Darslar" },
    { icon: Trophy, value: "94%", label: "Muvaffaqiyat" },
    { icon: Star, value: "4.9", label: "Reyting" },
  ];

  const whyUs = [
    "O'zbek tilida tushunarli materiallar",
    "Mobil va kompyutarda ishlaydi",
    "Offline rejimda tayyorgarlik",
    "Mutaxassislar tomonidan tayyorlangan",
  ];

  const testimonials = [
    {
      name: "Aziz Karimov",
      text: "Bu platforma tufayli imtihondan birinchi urinishda o'tdim. Juda foydali!",
      rating: 5,
    },
    {
      name: "Malika Rahimova",
      text: "Testlar haqiqiy imtihonga juda o'xshash. Tavsiya qilaman.",
      rating: 5,
    },
    {
      name: "Jasur To'rayev",
      text: "Qulay interfeys va ajoyib darslar. Rahmat E-Avto Test!",
      rating: 4,
    },
  ];

  const faqs = [
    {
      q: "E-Avto Test nima uchun kerak?",
      a: "Haydovchilik imtihoniga tayyorgarlik ko'rish va bilimlarni sinash uchun.",
    },
    {
      q: "Kurslar bepulmi?",
      a: "Ro'yxatdan o'tish bepul. Ayrim kurslar va testlarga kirish to'liq ochiq.",
    },
    {
      q: "Mobil qurilmada ishlaydimi?",
      a: "Ha, platforma barcha qurilmalarda to'liq ishlaydi.",
    },
  ];

  return (
    <div className="space-y-20 pb-10">
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-slate-900 py-20 text-white">
        <div className="container-page flex flex-col items-center gap-10 lg:flex-row">
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="flex-1 text-center lg:text-left"
          >
            <Badge variant="accent" className="mb-4">
              Haydovchilik imtihoniga tayyorgarlik
            </Badge>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">E-AVTO TEST</h1>
            <p className="mt-4 text-lg text-white/80">
              Haydovchilik imtihoniga ishonch bilan tayyorlaning.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Button
                size="lg"
                variant="accent"
                rightIcon={<ChevronDown className="h-5 w-5" />}
                onClick={() => navigate(ROUTES.tests)}
              >
                Testlarni boshlash
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10"
                onClick={() => navigate(ROUTES.courses)}
              >
                Kurslarni ko'rish
              </Button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-1 items-center justify-center"
          >
            <div className="relative flex h-56 w-56 items-center justify-center rounded-full bg-white/10 backdrop-blur">
              <Car className="h-28 w-28 text-white" />
              <div className="absolute inset-0 animate-pulse rounded-full border-2 border-white/30" />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="container-page">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <h2 className="text-center text-3xl font-bold text-slate-800 dark:text-slate-100">
            Nima uchun bizni tanlashadi
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <MotionCard
                key={f.title}
                padded
                variants={fadeUp}
                className="text-center"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{f.desc}</p>
              </MotionCard>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="container-page">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mb-8 text-center"
        >
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            Mashhur kurslar
          </h2>
          <p className="mt-2 text-slate-500">Eng ko'p tanlangan kurslar bilan tanishing.</p>
        </motion.div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loadingCourses ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
            ))
          ) : popular.length > 0 ? (
            popular.map((c) => <CourseCard key={c.id} course={c} />)
          ) : (
            <p className="col-span-full text-center text-slate-500">Hozircha kurslar mavjud emas.</p>
          )}
        </div>
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => navigate(ROUTES.courses)}>
            Barcha kurslar
          </Button>
        </div>
      </section>

      <section className="container-page">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mb-10 text-center"
        >
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Qanday ishlaydi</h2>
        </motion.div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <MotionCard key={s.n} padded variants={fadeUp}>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white">
                {s.n}
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{s.desc}</p>
            </MotionCard>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-14 dark:bg-slate-900/50">
        <div className="container-page">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <motion.div
                key={s.label}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900"
              >
                <s.icon className="mb-3 h-8 w-8 text-brand-600" />
                <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{s.value}</p>
                <p className="mt-1 text-sm text-slate-500">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page">
        <div className="grid gap-10 lg:grid-cols-2">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
            <div className="mb-4 flex items-center gap-2 text-brand-600">
              <Lightbulb className="h-6 w-6" />
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                Nega biz eng yaxshimiz
              </h2>
            </div>
            <ul className="space-y-3">
              {whyUs.map((w) => (
                <li key={w} className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  {w}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="space-y-4"
          >
            {testimonials.map((t) => (
              <Card key={t.name} padded>
                <div className="mb-2 flex text-amber-500">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">"{t.text}"</p>
                <p className="mt-3 font-semibold text-slate-800 dark:text-slate-100">{t.name}</p>
              </Card>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="container-page">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mb-8 text-center"
        >
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            Tez-tez so'raladigan savollar
          </h2>
        </motion.div>
        <div className="mx-auto max-w-3xl space-y-3">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <summary className="flex cursor-pointer items-center justify-between font-medium text-slate-800 dark:text-slate-100">
                {item.q}
                <ChevronDown className="h-5 w-5 transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-slate-500">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="container-page">
        <Card padded className="bg-gradient-to-br from-brand-600 to-slate-900 text-center text-white">
          <GraduationCap className="mx-auto mb-4 h-10 w-10" />
          <h2 className="text-3xl font-bold">Hoziroq boshlang</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/80">
            Haydovchilik imtihoniga tayyorgarlik ko'rish uchun birinchi qadamni qo'ying.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="accent" size="lg" onClick={() => navigate(ROUTES.register)}>
              Ro'yxatdan o'tish
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10"
              onClick={() => navigate(ROUTES.courses)}
            >
              Kurslar
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
