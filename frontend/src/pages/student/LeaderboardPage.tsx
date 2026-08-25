import React, { useEffect, useState } from "react";
import { resultService } from "../../services/result.service";
import { LeaderboardEntry } from "../../types/result";
import { Card, Badge, Spinner } from "../../components/ui";
import { Trophy, Flame, Award, Medal, Crown } from "lucide-react";

export const LeaderboardPage: React.FC = () => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      setIsLoading(true);
      const data = await resultService.getLeaderboard();
      setLeaders(data);
      setIsLoading(false);
    };
    fetchLeaders();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const topThree = leaders.slice(0, 3);
  const remainingLeaders = leaders.slice(3);

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="text-center space-y-3">
        <Badge variant="accent">Top O'quvchilar</Badge>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
          O'quvchilar Reytingi
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Eng faol va eng yuqori natija ko'rsatayotgan bo'lajak haydovchilar
        </p>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
        {/* 2nd Place */}
        {topThree[1] && (
          <Card className="p-6 text-center space-y-3 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 order-2 md:order-1">
            <div className="relative mx-auto w-16 h-16">
              <img
                src={topThree[1].avatarUrl}
                alt={topThree[1].name}
                className="h-16 w-16 rounded-full object-cover ring-4 ring-slate-300 shadow-md"
              />
              <span className="absolute -bottom-2 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-300 text-slate-900 font-extrabold text-xs shadow">
                2
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
              {topThree[1].name}
            </h3>
            <p className="text-lg font-black text-brand-600 dark:text-brand-400">
              {topThree[1].averageScore}% ball
            </p>
            <span className="text-[11px] text-slate-500 block">
              {topThree[1].testsCompleted} ta test topshirgan
            </span>
          </Card>
        )}

        {/* 1st Place (Winner) */}
        {topThree[0] && (
          <Card className="p-6 text-center space-y-4 border-2 border-amber-400 bg-gradient-to-b from-amber-500/10 to-transparent dark:from-amber-500/5 shadow-xl order-1 md:order-2 scale-105">
            <div className="mx-auto flex justify-center text-amber-500">
              <Crown className="h-8 w-8 fill-amber-400" />
            </div>
            <div className="relative mx-auto w-20 h-20">
              <img
                src={topThree[0].avatarUrl}
                alt={topThree[0].name}
                className="h-20 w-20 rounded-full object-cover ring-4 ring-amber-400 shadow-lg"
              />
              <span className="absolute -bottom-2 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-slate-950 font-black text-sm shadow">
                1
              </span>
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white truncate">
              {topThree[0].name}
            </h3>
            <p className="text-2xl font-black text-amber-500">
              {topThree[0].averageScore}% ball
            </p>
            <span className="text-xs text-slate-500 block">
              {topThree[0].testsCompleted} ta test topshirgan
            </span>
          </Card>
        )}

        {/* 3rd Place */}
        {topThree[2] && (
          <Card className="p-6 text-center space-y-3 border-amber-700/40 bg-slate-50/50 dark:bg-slate-900/50 order-3">
            <div className="relative mx-auto w-16 h-16">
              <img
                src={topThree[2].avatarUrl}
                alt={topThree[2].name}
                className="h-16 w-16 rounded-full object-cover ring-4 ring-amber-700/50 shadow-md"
              />
              <span className="absolute -bottom-2 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-700 text-white font-extrabold text-xs shadow">
                3
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
              {topThree[2].name}
            </h3>
            <p className="text-lg font-black text-brand-600 dark:text-brand-400">
              {topThree[2].averageScore}% ball
            </p>
            <span className="text-[11px] text-slate-500 block">
              {topThree[2].testsCompleted} ta test topshirgan
            </span>
          </Card>
        )}
      </div>

      {/* Full Leaderboard Table */}
      <Card className="overflow-hidden">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px]">
            <tr>
              <th className="p-4 w-16 text-center">O'rin</th>
              <th className="p-4">O'quvchi</th>
              <th className="p-4">Testlar Soni</th>
              <th className="p-4">O'rtacha Ball</th>
              <th className="p-4 text-right">Streak</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {leaders.map((entry) => (
              <tr
                key={entry.userId}
                className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition ${
                  entry.userId === "user-1" ? "bg-brand-50/50 dark:bg-brand-950/30 font-bold" : ""
                }`}
              >
                <td className="p-4 text-center font-bold text-slate-900 dark:text-white">
                  {entry.rank <= 3 ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      {entry.rank}
                    </span>
                  ) : (
                    `#${entry.rank}`
                  )}
                </td>
                <td className="p-4 flex items-center gap-3">
                  <img
                    src={entry.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                    alt={entry.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <span>{entry.name}</span>
                </td>
                <td className="p-4">{entry.testsCompleted} ta</td>
                <td className="p-4 font-bold text-brand-600 dark:text-brand-400">
                  {entry.averageScore}%
                </td>
                <td className="p-4 text-right">
                  <span className="inline-flex items-center gap-1 text-amber-500 font-semibold">
                    <Flame className="h-3.5 w-3.5" />
                    {entry.studyStreakDays} kun
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
