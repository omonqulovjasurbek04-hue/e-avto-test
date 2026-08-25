import { useEffect, useState, type ReactNode } from "react";
import { Trophy, Medal, Crown } from "lucide-react";
import { userService } from "@/services/user.service";
import type { LeaderboardEntry } from "@/types/result";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn } from "@/utils/cn";

const medalStyles: Record<number, { ring: string; bg: string; label: string; icon: ReactNode }> = {
  1: {
    ring: "ring-amber-400 border-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    label: "1-o'rin",
    icon: <Crown className="h-5 w-5 text-amber-500" />,
  },
  2: {
    ring: "ring-slate-300 border-slate-300",
    bg: "bg-slate-50 dark:bg-slate-800/60",
    label: "2-o'rin",
    icon: <Medal className="h-5 w-5 text-slate-400" />,
  },
  3: {
    ring: "ring-amber-700 border-amber-700",
    bg: "bg-amber-100/50 dark:bg-amber-900/30",
    label: "3-o'rin",
    icon: <Medal className="h-5 w-5 text-amber-700" />,
  },
};

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    userService
      .getLeaderboard()
      .then((data) => setEntries(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="container-page py-8">
        <Skeleton className="mb-6 h-8 w-64" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-8">
        <ErrorState onRetry={load} />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="container-page py-8">
        <EmptyState
          icon={<Trophy className="h-12 w-12" />}
          title="Reyting hozircha bo'sh"
          description="Tez orada o'quvchilar paydo bo'ladi."
        />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
          <Trophy className="h-6 w-6 text-amber-500" />
          O'quvchilar Reytingi
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Eng yaxshi natijalarga erishgan o'quvchilar.
        </p>
      </header>

      <div className="space-y-3">
        {entries.map((e, idx) => {
          const rank = idx + 1;
          const medal = medalStyles[rank];
          const isTop = rank <= 3;
          return (
            <Card
              key={e.id}
              className={cn(
                "transition-all",
                isTop && "border-2",
                isTop && medal?.ring
              )}
            >
              <CardContent
                className={cn(
                  "flex items-center gap-4 p-4",
                  isTop && medal?.bg
                )}
              >
                <div className="flex w-8 items-center justify-center">
                  {isTop ? (
                    medal?.icon
                  ) : (
                    <span className="text-lg font-bold text-slate-400">{rank}</span>
                  )}
                </div>
                <Avatar name={e.name} color={e.avatarColor} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 dark:text-white">{e.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {e.tests} ta test · O'rtacha {Math.round(e.averageScore)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-brand-600 dark:text-brand-400">
                    {e.points}
                  </p>
                  <p className="text-[11px] text-slate-400">ball</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
