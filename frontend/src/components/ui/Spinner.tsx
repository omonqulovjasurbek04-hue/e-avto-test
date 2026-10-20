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

export const FullSpinner: React.FC = () => (
  <div className="flex min-h-screen w-full items-center justify-center">
    <Spinner size="lg" />
  </div>
);
