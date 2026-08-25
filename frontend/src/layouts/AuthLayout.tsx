import React from "react";
import { Link, Outlet } from "react-router-dom";
import { Car, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export const AuthLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Left visual brand hero banner (hidden on small mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-900 via-brand-950 to-blue-950 p-12 text-white flex-col justify-between overflow-hidden">
        {/* Background glow circle */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />

        {/* Top brand */}
        <Link to="/" className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/30">
            <Car className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">E-AVTO TEST</h1>
            <p className="text-xs text-brand-300 font-medium">Haydovchilik Imtihoni Platformasi</p>
          </div>
        </Link>

        {/* Center content */}
        <div className="relative z-10 max-w-lg space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 border border-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-300">
            <Zap className="h-3.5 w-3.5" /> 2025 YHQ Standartlari
          </span>
          <h2 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            Nazariyani oson o'rganing va 1-urinishdayoq topshiring!
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            1000 dan ortiq rasmiy test savollari, real vaqtli timer, xatolar tahlili va professional video darsliklar sizni kutmoqda.
          </p>

          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>Davlat YHXDX andozasidagi 20 talik sinov testi</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>Har bir savolga YHQ moddalari bo'yicha tushuntirish</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>O'quvchi progressi va shaxsiy bilim reytingi</span>
            </div>
          </div>
        </div>

        {/* Bottom footer text */}
        <div className="relative z-10 text-xs text-slate-400">
          © {new Date().getFullYear()} E-Avto Test. Barcha huquqlar himoyalangan.
        </div>
      </div>

      {/* Right Form Outlet */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
