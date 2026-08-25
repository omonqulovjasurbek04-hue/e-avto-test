import { motion } from "framer-motion";
import { Target, Heart, Lightbulb, Users } from "lucide-react";

const values = [
  { icon: Target, title: "Maqsadimiz", desc: "Haydovchilarni xavfsiz va o'qigan holda yo'lga chiqarish." },
  { icon: Heart, title: "Qadriyatlarimiz", desc: "Halollik, sifat va foydalanuvchi qulayligi." },
  { icon: Lightbulb, title: "Yondashuv", desc: "Zamonaviy va tushunarli o'quv materiallari." },
  { icon: Users, title: "Jamoa", desc: "Tajribali pedagoglar va dasturchilar birgalikda." },
];

export default function About() {
  return (
    <div className="container-page py-10 space-y-16">
      <section className="text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-extrabold text-slate-800 dark:text-slate-100"
        >
          Biz haqimizda
        </motion.h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-500">
          E-Avto Test — haydovchilik imtihoniga tayyorgarlik ko'rish uchun yaratilgan
          o'zbek tilidagi platforma. Bizning maqsadimiz har bir o'quvchini ishonchli
          va xavfsiz haydovchiga aylantirish.
        </p>
      </section>

      <section>
        <h2 className="mb-8 text-center text-3xl font-bold text-slate-800 dark:text-slate-100">
          Qadriyatlarimiz
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
          Bizning hikoyamiz
        </h2>
        <p className="text-slate-600 dark:text-slate-300">
          Platforma haydovchilik imtihoniga bir necha marta urinib ko'rgan, lekin yetarli
          material topa olmagan o'quvchilar tajribasidan ilhomlanib tashkil etilgan.
          Bugungi kunda minglab o'quvchilar bizning test va kurslarimiz orqali muvaffaqiyatga erishmoqda.
        </p>
      </section>
    </div>
  );
}
