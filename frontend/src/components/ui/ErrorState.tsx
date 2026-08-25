import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Xatolik yuz berdi", message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-12 text-center dark:border-red-900/50 dark:bg-red-950/30">
      <AlertTriangle className="h-10 w-10 text-red-500" />
      <h3 className="mt-3 text-lg font-semibold text-red-700 dark:text-red-300">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-red-500">{message}</p>}
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Qayta urinish
        </Button>
      )}
    </div>
  );
}
