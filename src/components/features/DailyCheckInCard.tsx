import React, { useState } from 'react'
import { Gift, Calendar, Check } from 'lucide-react'
import { useData } from '@/hooks/useData'
import { useToast } from '@/hooks/useToast'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
} from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/helpers'

export const DailyCheckInCard: React.FC<{ className?: string }> = ({ className }) => {
  const {
    getProfile,
    getDailyRewards,
    canCheckInToday,
    claimDailyReward,
  } = useData()
  const { showToast } = useToast()
  const [isClaiming, setIsClaiming] = useState(false)

  const profile = getProfile()
  const rewards = getDailyRewards()
  const canClaim = canCheckInToday()
  const checkInStreak = profile.checkInStreak || 0
  const nextDayIdx = rewards.findIndex((r) => !r.claimed)
  const nextDay = nextDayIdx >= 0 ? rewards[nextDayIdx] : null

  const handleClaim = async () => {
    if (!canClaim || isClaiming) return
    setIsClaiming(true)
    try {
      const res = claimDailyReward()
      if (!res.success) {
        showToast('error', res.error || 'Điểm danh thất bại, hãy thử lại')
        return
      }
      showToast(
        'success',
        `🎁 Điểm danh ngày ${res.day}! +${res.coins} Xu · +${res.exp} EXP · Chuỗi ${res.checkInStreak} ngày`
      )
      if (res.equipment) {
        showToast('info', `🎁 Bạn nhận thêm trang bị: ${res.equipment.name}`)
      }
    } catch (e) {
      showToast('error', 'Điểm danh thất bại, hãy thử lại')
    } finally {
      setIsClaiming(false)
    }
  }

  const dayNames = ['Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'CN']

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center gap-3 px-5 py-4 sm:px-6 sm:py-5">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
          <Calendar className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base sm:text-lg">Điểm danh hàng ngày</CardTitle>
          <CardDescription>Nhận Xu + EXP mỗi ngày</CardDescription>
        </div>
      </CardHeader>

      <CardBody className="px-5 pb-5 pt-0 sm:px-6 space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-100 dark:border-orange-800/40 p-4">
              <p className="text-xs text-orange-600/80 dark:text-orange-400/80 font-medium mb-1">
                Chuỗi ngày
              </p>
              <p className="text-3xl sm:text-4xl font-extrabold text-orange-600 dark:text-orange-400 tabular-nums tracking-tight">
                {checkInStreak}
                <span className="text-lg font-semibold ml-1 text-orange-500/80">ngày</span>
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!canClaim}
              loading={isClaiming}
              onClick={handleClaim}
              className={cn(
                'h-12 min-h-[44px] rounded-2xl text-base font-semibold',
                canClaim &&
                  'bg-gradient-to-r from-primary-500 via-indigo-500 to-violet-500 hover:from-primary-600 hover:via-indigo-600 hover:to-violet-600 shadow-md hover:shadow-lg'
              )}
            >
              {canClaim ? 'Điểm danh ngay!' : 'Đã điểm danh hôm nay'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {rewards.map((r, idx) => {
            const isClaimed = r.claimed
            const isNext =
              !isClaimed && (nextDay === null ? idx === 0 : r.day === nextDay.day)
            const isBonus = r.day === 7
            const isTodayCandidate = canClaim && isNext

            return (
              <div
                key={r.day}
                className={cn(
                  'relative rounded-xl p-1.5 sm:p-2 text-center border-2 transition-all duration-300 min-h-[72px] sm:min-h-[80px] flex flex-col items-center justify-center gap-0.5',
                  isClaimed
                    ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-900/20'
                    : 'border-transparent bg-white/50 dark:bg-gray-800/40'
                )}
              >
                {isTodayCandidate && (
                  <div
                    className={cn(
                      'absolute inset-0 rounded-xl border-2 border-transparent',
                      'bg-gradient-to-r from-primary-500 via-fuchsia-500 to-primary-500 animate-pulse',
                      'opacity-60 -z-0 p-[2px]',
                      '[mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)]',
                      '[mask-composite:exclude]'
                    )}
                  />
                )}

                <div className="relative z-10 w-full flex flex-col items-center gap-0.5">
                  <div className="flex items-center justify-center gap-0.5">
                    {isClaimed ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary-500 text-white shadow-sm">
                        <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={3} />
                      </span>
                    ) : isBonus ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white shadow-sm">
                        <Gift className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.25} />
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-xs sm:text-sm font-bold',
                          isTodayCandidate
                            ? 'bg-gradient-to-br from-primary-500 to-indigo-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300'
                        )}
                      >
                        {r.day}
                      </span>
                    )}
                  </div>

                  <p
                    className={cn(
                      'text-[10px] sm:text-xs font-semibold leading-tight',
                      isClaimed
                        ? 'text-primary-700 dark:text-primary-300'
                        : isTodayCandidate
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {dayNames[idx] || `N${r.day}`}
                  </p>

                  {isTodayCandidate && !isClaimed && (
                    <span className="inline-block text-[9px] sm:text-[10px] font-bold text-white bg-gradient-to-r from-primary-500 to-fuchsia-500 rounded-md px-1.5 py-0.5 leading-none shadow-sm">
                      Hôm nay
                    </span>
                  )}

                  <p
                    className={cn(
                      'text-[10px] sm:text-xs font-semibold tabular-nums mt-0.5',
                      isClaimed
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    {r.coins.toLocaleString()} 🪙
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardBody>
    </Card>
  )
}

export default DailyCheckInCard
