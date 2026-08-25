import React, { useEffect } from "react";
import { cn } from "../../utils/cn";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
}) => {
  const isOpenResolved = open ?? isOpen;
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpenResolved) {
        onClose();
      }
    };
    if (isOpenResolved) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpenResolved, onClose]);

  if (!isOpenResolved) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          "relative w-full rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-fade-in z-10 max-h-[90vh] overflow-y-auto",
          maxWidthClasses[maxWidth]
        )}
      >
        <div className="flex items-start justify-between pb-3">
          <div>
            {title && (
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
};
