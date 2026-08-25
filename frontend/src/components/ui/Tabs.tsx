import React from "react";
import { cn } from "../../utils/cn";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div
      className={cn(
        "flex space-x-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80 overflow-x-auto",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all whitespace-nowrap",
              isActive
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-bold",
                  isActive
                    ? "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
