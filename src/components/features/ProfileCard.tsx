import React from 'react'
import { Flame, Coins, Star, User } from 'lucide-react'
import { useData } from '@/hooks/useData'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/helpers'

export const ProfileCard: React.FC<{ className?: string }> = ({ className }) => {
  const { getProfile, getExpProgress, getUserRank } = useData()

  const profile = getProfile()
  const progress = getExpProgress()
  const rank = getUserRank()

  const avatar = profile.avatar || '🧑‍🎓'
  const displayName = profile.name || 'Học sinh'

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 pb-16 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl border-2 border-white/30 shadow-lg">
            <span>{avatar}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/80 font-medium">Chào mừng quay lại 👋</p>
            <h2 className="text-xl font-bold truncate">{displayName}</h2>
            {rank !== undefined && (
              <p className="text-xs text-white/80 mt-0.5">
                Hạng #{rank.rank} trên bảng xếp hạng
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-5 -mt-10 relative space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 p-3 text-center">
            <div className="flex justify-center mb-1">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Coins className="h-5 w-5" />
              </div>
            </div>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400 tabular-nums">
              {profile.coins.toLocaleString()}
            </p>
            <p className="text-[11px] text-amber-600/70 dark:text-amber-400/70 font-medium">Xu 🪙</p>
          </div>

          <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40 p-3 text-center">
            <div className="flex justify-center mb-1">
              <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-800/40 flex items-center justify-center text-violet-600 dark:text-violet-400">
                <Star className="h-5 w-5 fill-current" />
              </div>
            </div>
            <p className="text-lg font-bold text-violet-700 dark:text-violet-400 tabular-nums">
              {profile.exp.toLocaleString()}
            </p>
            <p className="text-[11px] text-violet-600/70 dark:text-violet-400/70 font-medium">EXP ⭐</p>
          </div>

          <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/40 p-3 text-center">
            <div className="flex justify-center mb-1">
              <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-800/40 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <Flame className="h-5 w-5 fill-current" />
              </div>
            </div>
            <p className="text-lg font-bold text-orange-700 dark:text-orange-400 tabular-nums">
              {profile.streak}
            </p>
            <p className="text-[11px] text-orange-600/70 dark:text-orange-400/70 font-medium">Streak 🔥</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {progress.level}
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Level {progress.level}</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              {progress.currentExp} / {progress.neededExp} EXP
            </p>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-700/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 via-indigo-500 to-violet-500 transition-all duration-700"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="flex justify-end mt-1.5">
            <span className="text-[11px] font-semibold text-primary-600 dark:text-primary-400">
              {progress.percent}% đến Level {progress.level + 1}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
