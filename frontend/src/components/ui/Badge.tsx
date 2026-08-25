import React from "react";
import { cn } from "../../utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "success" | "warning" | "danger" | "neutral" | "accent";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  size = "md",
  children,
  ...props
}) => {
  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 font-medium",
    md: "text-xs px-2.5 py-1 font-semibold",
  };

  const variantStyles = {
    primary:
      "bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300 border border-brand-200 dark:border-brand-800",
    success:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
    warning:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
    danger:
      "bg-red-50 text-red-700 dark:bg-red-950/70 dark:text-red-300 border border-red-200 dark:border-red-800",
    neutral:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
    accent:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full shrink-0 tracking-wide transition-colors",
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
