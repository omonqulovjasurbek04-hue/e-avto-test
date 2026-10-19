import React, { useCallback, useLayoutEffect, useRef } from "react";
import { Phone } from "lucide-react";
import { Input, type InputProps } from "./Input";

/** Digits after the country code, at most 9 (e.g. "901234567"). */
const localDigits = (value: string): string => {
  let d = value.replace(/\D/g, "");
  // A pasted full number: "+998 90 123 45 67", "998901234567" or the old "8 90 123 45 67".
  if (d.length >= 12 && d.startsWith("998")) d = d.slice(3);
  else if (d.length === 10 && d.startsWith("8")) d = d.slice(1);
  return d.slice(0, 9);
};

/** "901234567" → "90 123-45-67" (partial input is formatted as far as it goes). */
const format = (d: string): string => {
  let out = d.slice(0, 2);
  if (d.length > 2) out += " " + d.slice(2, 5);
  if (d.length > 5) out += "-" + d.slice(5, 7);
  if (d.length > 7) out += "-" + d.slice(7, 9);
  return out;
};

/** Caret index in the formatted text that sits right after the n-th digit. */
const caretAfterDigits = (formatted: string, n: number): number => {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]) && ++seen === n) return i + 1;
  }
  return formatted.length;
};

export interface PhoneInputProps extends Omit<InputProps, "value" | "onChange" | "type" | "leftIcon" | "defaultValue"> {
  /** Full number as stored by the form: "+998901234567", a partial "+99890", or "". */
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * Uzbek mobile number field: a fixed "+998" prefix and the "00 000-00-00" mask. The form gets the
 * canonical "+998XXXXXXXXX" (or what has been typed so far); the caret stays where the user types,
 * and Backspace jumps over the separators instead of getting stuck on them.
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = "", onChange, className, ...props }, ref) => {
    const digits = localDigits(value.startsWith("+998") ? value.slice(4) : value);
    const display = format(digits);

    const inputRef = useRef<HTMLInputElement | null>(null);
    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    // How many digits should sit before the caret after the next render.
    const pendingCaret = useRef<number | null>(null);
    useLayoutEffect(() => {
      const el = inputRef.current;
      if (el && pendingCaret.current !== null && document.activeElement === el) {
        const pos = caretAfterDigits(display, pendingCaret.current);
        el.setSelectionRange(pos, pos);
      }
      pendingCaret.current = null;
    }, [display]);

    const emit = (d: string, digitsBeforeCaret: number) => {
      pendingCaret.current = Math.min(digitsBeforeCaret, d.length);
      onChange?.(d ? `+998${d}` : "");
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const caret = e.target.selectionStart ?? raw.length;
      const next = localDigits(raw);
      // A pasted "+998…" number loses its country-code digits, so count the caret from the end then.
      const before = raw.replace(/\D/g, "").length > 9 ? next.length : raw.slice(0, caret).replace(/\D/g, "").length;
      emit(next, before);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      props.onKeyDown?.(e);
      const el = e.currentTarget;
      const start = el.selectionStart ?? 0;
      if (e.key !== "Backspace" || start !== el.selectionEnd || start === 0) return;
      // Caret right after a space or dash: delete the digit in front of it instead.
      if (/\d/.test(display[start - 1] ?? "")) return;
      e.preventDefault();
      const before = display.slice(0, start).replace(/\D/g, "").length;
      if (before === 0) return;
      emit(digits.slice(0, before - 1) + digits.slice(before), before - 1);
    };

    return (
      <Input
        {...props}
        ref={setRefs}
        type="tel"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        // No maxLength: the browser would cut a pasted "+998 90 123 45 67" before it is cleaned up;
        // localDigits() already keeps at most 9 digits.
        placeholder={props.placeholder ?? "00 000-00-00"}
        leftIcon={
          <span className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span data-phone-prefix className="text-sm font-medium text-slate-700 dark:text-slate-200">
              +998
            </span>
            <span aria-hidden="true" className="h-5 w-px bg-slate-300 dark:bg-slate-700" />
          </span>
        }
        className={["pl-[5.75rem] tabular-nums", className].filter(Boolean).join(" ")}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";
