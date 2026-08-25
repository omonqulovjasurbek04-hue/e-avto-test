import React from "react";
import { Link } from "react-router-dom";
import { Button, Card, CardContent, Badge } from "../../components/ui";
import { mockCourses } from "../../data/mockCourses";
import {
  Car,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Trophy,
  Zap,
  ArrowRight,
  PlayCircle,
  HelpCircle,
  Award,
  Users,
  BookOpen,
  Sparkles,
} from "lucide-react";

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-20 pb-16">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-brand-500/15 via-blue-500/10 to-transparent blur-3xl -z-10" />

        <div className="container-page">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left text */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 dark:bg-brand-950/80 border border-brand-200 dark:border-brand-800 px-4 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>2025 YHXDX Yangi Imtihon Standartlari</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                Haydovchilik imtihoniga{" "}
                <span className="bg-gradient-to-r from-brand-600 to-blue-600 bg-clip-text text-transparent dark:from-brand-400 dark:to-blue-400">
                  100% ishonch
                </span>{" "}
                bilan tayyorlaning!
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Avtomobil nazariyasini oson video darslar orqali o'rganing, rasmiy 20 talik davlat testlarini ishlang va xatolaringizni bir zumda tahlil qiling.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link to="/tests" className="w-full sm:w-auto">
                  <Button size="lg" variant="primary" className="w-full shadow-lg shadow-brand-500/25 text-base" rightIcon={<ArrowRight className="h-5 w-5" />}>
                    Testni Boshlash (20 Savol)
                  </Button>
                </Link>
                <Link to="/courses" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full text-base" leftIcon={<BookOpen className="h-5 w-5" />}>
                    Kurslarni Ko'rish
                  </Button>
                </Link>
              </div>

              {/* Mini trust checklist */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>1000+ Rasmiy Savollar</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand-500 shrink-0" />
                  <span>20 daqiqa real timer</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>To'liq YHQ moddalari</span>
                </div>
              </div>
            </div>

            {/* Right Card / Visual Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 p-6 text-white shadow-2xl border border-slate-800">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="h-3 w-3 rounded-full bg-amber-500" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  </div>
                  <Badge variant="success" size="sm">
                    Imtihon Simulyatori
                  </Badge>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex justify-between items-center bg-slate-800/60 p-3 rounded-xl">
                    <span className="text-xs text-slate-400">Vaqt:</span>
                    <span className="text-sm font-mono font-bold text-amber-400">18:45</span>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-slate-800">
                    <img
                      src="https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&auto=format&fit=crop&q=80"
                      alt="Traffic sign question demo"
                      className="h-40 w-full object-cover"
                    />
                  </div>

                  <p className="text-sm font-semibold text-slate-200">
                    5-Savol: 2.1 "Bosh yo'l" belgisi haydovchiga qanday imtiyoz beradi?
                  </p>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/60 text-slate-300">
                      A) To'xtamasdan harakatlanish taqiqlanadi
                    </div>
                    <div className="p-2.5 rounded-lg bg-brand-600/30 border border-brand-500 text-brand-200 font-semibold flex items-center justify-between">
                      <span>B) Tartibga solinmagan chorrahadan birinchi o'tish</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 text-center">
                  <Link to="/tests">
                    <Button variant="accent" size="sm" className="w-full">
                      Hozir sinab ko'rish
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="border-y border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="container-page">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-brand-600 dark:text-brand-400">1000+</p>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Imtihon savollari</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">96%</p>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">O'quvchilar muvaffaqiyati</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-amber-500">24+</p>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Video darslar</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-blue-600 dark:text-blue-400">15,000+</p>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Topshirilgan testlar</p>
            </div>
          </div>
        </div>
      </section>

      {/* POPULAR COURSES */}
      <section className="container-page space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <Badge variant="primary" size="sm">O'quv dasturlari</Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
              Ommabop Yo'nalishlar
            </h2>
          </div>
          <Link to="/courses">
            <Button variant="ghost" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Barcha kurslar
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockCourses.slice(0, 3).map((course) => (
            <Card key={course.id} className="flex flex-col group hover:shadow-lg transition-all duration-300">
              <div className="relative h-48 overflow-hidden">
                <img
                  src={course.imageUrl}
                  alt={course.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <Badge variant="accent">
                    {course.category} Toifa
                  </Badge>
                </div>
              </div>
              <CardContent className="flex-1 flex flex-col justify-between p-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {course.description}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span>{course.totalLessons} ta dars</span>
                  </div>
                  <Link to={`/courses/${course.slug || course.id}`}>
                    <Button size="sm" variant="primary">
                      Ko'rish
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container-page space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="neutral">Oddiy va samarali</Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Qanday qilib 1-urinishda topshirasiz?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="rounded-2xl bg-white p-6 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-black text-lg">
              1
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white">Video darsni ko'ring</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Mavzuni qiziqarli va sodda tilda tushuntiruvchi videoni tomosha qiling.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 font-black text-lg">
              2
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white">Test ishlang</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Har bir mavzu bo'yicha maxsus tayyorlangan testlar bilan bilimingizni mustahkamlang.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 font-black text-lg">
              3
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white">Xatolarni tahlil qiling</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Adashgan savollaringizning qonuniy izohlarini o'qib, qayta xato qilmang.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-black text-lg">
              4
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white">Imtihondan o'ting</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              20 talik davlat andozasidagi imtihon simulyatorida 18+ ball oling va guvohnomaga ega bo'ling.
            </p>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="container-page">
        <div className="rounded-3xl bg-gradient-to-r from-brand-600 via-blue-600 to-indigo-700 p-8 sm:p-12 text-white text-center space-y-6 shadow-xl shadow-brand-500/20">
          <h2 className="text-3xl sm:text-4xl font-extrabold max-w-xl mx-auto leading-tight">
            Haydovchilik guvohnomasini olishga tayyormisiz?
          </h2>
          <p className="text-sm sm:text-base text-brand-100 max-w-lg mx-auto">
            Hoziroq ro'yxatdan o'ting yoki bepul sinov testini boshlang!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link to="/tests">
              <Button size="lg" variant="accent" className="w-full sm:w-auto font-bold">
                Bepul Test Ishlash
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Hisob Yaratish
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
