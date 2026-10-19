import React, { InputHTMLAttributes, useCallback, useLayoutEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const { t } = useTranslation();
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    // Every password field gets a show/hide eye (unless the caller already put its own icon there).
    const isPassword = type === "password" && !rightIcon;
    const [revealed, setRevealed] = useState(false);
    const hasRight = Boolean(rightIcon) || isPassword;

    // Our own handle on the field (as well as the caller's ref, e.g. react-hook-form's register).
    const inputRef = useRef<HTMLInputElement | null>(null);
    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );
    // Switching type="password" <-> "text" makes the browser drop the caret to the start; remember
    // where the user was typing and put the caret (and any selection) back right after the switch.
    const caret = useRef<{ start: number; end: number; dir: "forward" | "backward" | "none" } | null>(null);
    const toggleReveal = () => {
      const el = inputRef.current;
      caret.current =
        el && el.selectionStart !== null && el.selectionEnd !== null
          ? { start: el.selectionStart, end: el.selectionEnd, dir: el.selectionDirection ?? "none" }
          : null;
      setRevealed((v) => !v);
    };
    useLayoutEffect(() => {
      const el = inputRef.current;
      const pos = caret.current;
      if (!el || !pos || document.activeElement !== el) return;
      caret.current = null;
      const restore = () => {
        if (document.activeElement === el) el.setSelectionRange(pos.start, pos.end, pos.dir);
      };
      restore();
      // The browser may move the caret again once it re-lays out the field; set it back once more.
      const frame = requestAnimationFrame(restore);
      return () => cancelAnimationFrame(frame);
    }, [revealed]);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={setRefs}
            id={inputId}
            type={isPassword && revealed ? "text" : type}
            className={cn(
              "w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-900 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
              leftIcon && "pl-10",
              hasRight && "pr-11",
              error
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500"
                : "border-slate-300 dark:border-slate-700 focus:border-brand-500 focus:ring-brand-500/20",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center text-slate-400 dark:text-slate-500">
              {rightIcon}
            </div>
          )}
          {isPassword && (
            <button
              type="button"
              // Keep the caret in the field when the eye is clicked.
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleReveal}
              aria-label={revealed ? t("common.hidePassword") : t("common.showPassword")}
              title={revealed ? t("common.hidePassword") : t("common.showPassword")}
              aria-pressed={revealed}
              aria-controls={inputId}
              disabled={props.disabled}
              className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error && <p className="text-xs font-medium text-red-500 animate-fade-in">{error}</p>}
        {!error && helperText && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }
>(({ className, label, error, id, ...props }, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          "w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-900 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500"
            : "border-slate-300 dark:border-slate-700 focus:border-brand-500 focus:ring-brand-500/20",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs font-medium text-red-500 animate-fade-in">{error}</p>}
    </div>
  );
});

Textarea.displayName = "Textarea";
