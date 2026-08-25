import { cn } from "@/utils/cn";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "brand" | "green" | "amber" | "red" | "slate";
}

const colors = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
  green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  red: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export default function StatCard({ label, value, icon, color = "brand" }: StatCardProps) {
  return (
    <div className="card-base flex items-center gap-4 p-5">
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", colors[color])}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}
