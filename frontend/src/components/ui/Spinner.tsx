import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

export const Spinner: React.FC<{ size?: "sm" | "md" | "lg"; className?: string }> = ({
  size = "md",
  className,
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-10 w-10",
  };

  return <Loader2 className={cn("animate-spin text-brand-600", sizeClasses[size], className)} />;
};

export const LoadingScreen: React.FC<{ text?: string }> = ({ text = "Yuklanmoqda..." }) => (
  <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-3">
    <Spinner size="lg" />
    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{text}</p>
  </div>
);
