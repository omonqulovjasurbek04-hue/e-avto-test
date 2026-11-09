import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

export interface TimeInputProps {
  label?: string;
  /** "HH:mm" (24-hour) or "" */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

/**
 * A 24-hour time field ("HH:mm") that always shows 18:30, never "6:30 PM".
 * The native <input type="time"> follows the browser's locale (Chrome ignores `lang`), so this
 * pair of selects is used instead: the value stays "HH:mm" for the server.
 */
export function TimeInput({ label, value, onChange, error, helperText, id, disabled, required }: TimeInputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const parts = /^(\d{2}):(\d{2})/.exec(value);
  const hour = parts?.[1] ?? "";
  const minute = parts?.[2] ?? "";

  const setHour = (h: string) => onChange(h ? `${h}:${minute || "00"}` : "");
  const setMinute = (m: string) => onChange(hour ? `${hour}:${m}` : "");

  const selectClass = cn(
    "w-full appearance-none rounded-xl border bg-white px-3 py-2.5 pr-8 text-sm text-slate-900 transition focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 cursor-pointer",
    error
      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500"
      : "border-slate-300 dark:border-slate-700 focus:border-brand-500 focus:ring-brand-500/20",
    disabled && "cursor-not-allowed opacity-60"
  );

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <select
            id={inputId}
            aria-label={label ? `${label}: hours` : "hours"}
            value={hour}
            onChange={(e) => setHour(e.target.value)}
            disabled={disabled}
            required={required}
            className={selectClass}
          >
            <option value="">--</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        </div>
        <span className="font-semibold text-slate-400 dark:text-slate-500">:</span>
        <div className="relative flex-1">
          <select
            aria-label={label ? `${label}: minutes` : "minutes"}
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
            disabled={disabled || !hour}
            className={selectClass}
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        </div>
      </div>
      {error && <p className="text-xs font-medium text-red-500 animate-fade-in">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>}
    </div>
  );
}
