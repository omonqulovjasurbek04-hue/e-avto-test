import React from "react";
import { cn } from "../../utils/cn";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "danger";
  title?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = "info",
  title,
  children,
  className,
  ...props
}) => {
  const icons = {
    info: <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />,
    danger: <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />,
  };

  const variantStyles = {
    info: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-200",
    success: "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200",
    warning: "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200",
    danger: "bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200",
  };

  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border p-4 text-sm leading-relaxed",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}
      <div className="space-y-1">
        {title && <h5 className="font-semibold">{title}</h5>}
        <div className="text-slate-700 dark:text-slate-300">{children}</div>
      </div>
    </div>
  );
};
