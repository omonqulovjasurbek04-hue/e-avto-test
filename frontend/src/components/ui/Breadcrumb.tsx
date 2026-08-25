import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {item.to ? (
            <Link to={item.to} className="hover:text-brand-600">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
          )}
          {i < items.length - 1 && <ChevronRight className="h-4 w-4" />}
        </span>
      ))}
    </nav>
  );
}
