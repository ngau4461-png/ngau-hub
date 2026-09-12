import React from 'react'
import { Trophy, Flame, Coins, Star, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useData } from '@/hooks/useData'
import { Card, CardHeader, CardTitle, CardBody, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/helpers'

const rankStyles: Record<number, { badge: string; icon: string; label: string }> = {
  1: {
    badge: 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-amber-200 dark:shadow-amber-900/40 shadow-md',
    icon: '🥇',
    label: 'Vô địch',
  },
  2: {
    badge: 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800 shadow-gray-200 dark:shadow-gray-900/40 shadow-md',
    icon: '🥈',
    label: 'Á quân',
  },
  3: {
    badge: 'bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-orange-200 dark:shadow-orange-900/40 shadow-md',
    icon: '🥉',
    label: 'Hạng 3',
  },
}

export const Leaderboard: React.FC<{ className?: string; limit?: number }> = ({
  className,
  limit = 10,
}) => {
  const { getLeaderboard, getUserRank, getProfile } = useData()

  const leaderboard = getLeaderboard(limit)
  const myRank = getUserRank()
  const profile = getProfile()

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Bảng xếp hạng 🏆
          </CardTitle>
          <CardDescription>Cùng cạnh tranh leo rank cùng bạn bè</CardDescription>
        </div>
        <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-4 w-4" />}>
          Xem tất cả
        </Button>
      </CardHeader>
      <CardBody className="pt-2 space-y-2">
        {leaderboard.map((entry) => {
          const isMe = entry.id === profile.id
          const style = rankStyles[entry.rank || 0]
          return (
            <div
              key={entry.id}
              className={cn(
                'flex items-center gap-3 p-2.5 sm:p-3 rounded-xl transition-all',
                isMe
                  ? 'bg-gradient-to-r from-primary-50 via-indigo-50 to-violet-50 dark:from-primary-900/30 dark:via-indigo-900/30 dark:to-violet-900/30 border border-primary-200 dark:border-primary-700/40 ring-2 ring-primary-500/10'
                  : 'border border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/40'
              )}
            >
              <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
                {style ? (
                  <span className="text-2xl drop-shadow-sm">{style.icon}</span>
                ) : (
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/60',
                      isMe && '!bg-primary-600 !text-white'
                    )}
                  >
                    {entry.rank}
                  </div>
                )}
              </div>

              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700/60 flex items-center justify-center text-2xl flex-shrink-0">
                <span>{entry.avatar || '🧑‍🎓'}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    className={cn(
                      'text-sm font-semibold truncate',
                      isMe
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-gray-900 dark:text-gray-100'
                    )}
                  >
                    {entry.name}
                  </p>
                  {isMe && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-600 text-white uppercase tracking-wide">
                      Bạn
                    </span>
                  )}
                  {style && !isMe && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 uppercase tracking-wide">
                      {style.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-4 h-4 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center text-[9px] font-bold">
                      L
                    </span>
                    <span className="tabular-nums font-semibold">{entry.level}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500 fill-current" />
                    <span className="tabular-nums font-semibold">{entry.exp.toLocaleString()}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Flame className="h-3 w-3 text-orange-500 fill-current" />
                    <span className="tabular-nums font-semibold">{entry.streak}</span>
                  </span>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1 flex-shrink-0 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-100 dark:border-amber-800/40">
                <Coins className="h-3.5 w-3.5" />
                <span className="tabular-nums">{entry.coins.toLocaleString()}</span>
              </div>
            </div>
          )
        })}

        {myRank && !leaderboard.some((e) => e.id === profile.id) && (
          <>
            <div className="relative py-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dashed border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white dark:bg-gray-800/60 px-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  ↓ Hạng của bạn ↓
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary-50 via-indigo-50 to-violet-50 dark:from-primary-900/30 dark:via-indigo-900/30 dark:to-violet-900/30 border border-primary-200 dark:border-primary-700/40 ring-2 ring-primary-500/10">
              <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold !bg-primary-600 !text-white shadow-sm">
                  {myRank.rank}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700/60 flex items-center justify-center text-2xl flex-shrink-0">
                <span>{myRank.avatar || '🧑‍🎓'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-primary-700 dark:text-primary-300 truncate">
                    {myRank.name}
                  </p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-600 text-white uppercase tracking-wide">
                    Bạn
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap">
                  <span>Lv.{myRank.level}</span>
                  <span>⭐ {myRank.exp.toLocaleString()}</span>
                  <span>🔥 {myRank.streak}</span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1 flex-shrink-0 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-100 dark:border-amber-800/40">
                <Coins className="h-3.5 w-3.5" />
                <span className="tabular-nums">{myRank.coins.toLocaleString()}</span>
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  )
}
