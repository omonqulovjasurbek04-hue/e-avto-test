import React from "react";
import { cn } from "../../utils/cn";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  max?: number;
  variant?: "brand" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  showValueLabel?: boolean;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  variant = "brand",
  size = "md",
  showValueLabel = false,
  className,
  ...props
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  const variantColors = {
    brand: "bg-brand-600",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
  };

  return (
    <div className={cn("w-full space-y-1", className)} {...props}>
      {showValueLabel && (
        <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
          <span>Jarayon</span>
          <span>{percentage}%</span>
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800",
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-out",
            variantColors[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export const CircularProgress: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}> = ({ percentage, size = 110, strokeWidth = 10, color = "#2563eb", label }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200 dark:text-slate-800"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl font-extrabold text-slate-900 dark:text-white">
          {percentage}%
        </span>
        {label && <span className="text-[10px] text-slate-500 dark:text-slate-400">{label}</span>}
      </div>
    </div>
  );
};
