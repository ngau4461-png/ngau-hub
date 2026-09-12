import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play,
  Pause,
  RotateCcw,
  Clock3,
  Timer as TimerIcon,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Coins,
  Star,
  CheckCircle2,
  Brain,
  Flame,
  Trophy,
} from 'lucide-react'

import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import { useData } from '@/hooks/useData'
import { supabase } from '@/utils/supabase/client'

type FocusType = 'normal' | 'advanced'

interface FocusPreset {
  minutes: number
  seconds: number
  coins: number
  exp: number
}

interface TimerStorage {
  focusType: FocusType
  duration: number
  remaining: number
  running: boolean
  startedAt: number | null
  endAt: number | null
  totalStudied: number
  sessionId: string | null
}

interface RewardInfo {
  coins: number
  exp: number
  minutes: number
}

const STORAGE_KEY = 'studyhub_focus_timer_v2'

const NORMAL_PRESETS: FocusPreset[] = [
  { minutes: 5, seconds: 5 * 60, coins: 5, exp: 10 },
  { minutes: 15, seconds: 15 * 60, coins: 20, exp: 30 },
  { minutes: 30, seconds: 30 * 60, coins: 70, exp: 120 },
  { minutes: 60, seconds: 60 * 60, coins: 150, exp: 250 },
]

const ADVANCED_REWARD_MULTIPLIER = 3

const DEFAULT_TIMER: TimerStorage = {
  focusType: 'normal',
  duration: NORMAL_PRESETS[1].seconds,
  remaining: NORMAL_PRESETS[1].seconds,
  running: false,
  startedAt: null,
  endAt: null,
  totalStudied: 0,
  sessionId: null,
}

const createSessionId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const saveTimer = (timer: TimerStorage) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timer))
  } catch {
    // Ignore localStorage errors.
  }
}

const loadTimer = (): TimerStorage => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_TIMER

    const parsed = JSON.parse(raw) as Partial<TimerStorage>
    const focusType: FocusType =
      parsed.focusType === 'advanced' ? 'advanced' : 'normal'

    const duration =
      typeof parsed.duration === 'number' && parsed.duration > 0
        ? parsed.duration
        : DEFAULT_TIMER.duration

    const remaining =
      typeof parsed.remaining === 'number' && parsed.remaining >= 0
        ? parsed.remaining
        : duration

    if (focusType === 'advanced' && parsed.running) {
      return {
        ...DEFAULT_TIMER,
        focusType,
        duration,
        remaining: duration,
        totalStudied:
          typeof parsed.totalStudied === 'number'
            ? parsed.totalStudied
            : 0,
      }
    }

    return {
      focusType,
      duration,
      remaining,
      running: Boolean(parsed.running),
      startedAt:
        typeof parsed.startedAt === 'number' ? parsed.startedAt : null,
      endAt: typeof parsed.endAt === 'number' ? parsed.endAt : null,
      totalStudied:
        typeof parsed.totalStudied === 'number' ? parsed.totalStudied : 0,
      sessionId:
        typeof parsed.sessionId === 'string' ? parsed.sessionId : null,
    }
  } catch {
    return DEFAULT_TIMER
  }
}

const formatTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const formatStudiedTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) return `${minutes} phút`

  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60

  return remainMinutes === 0
    ? `${hours} giờ`
    : `${hours} giờ ${remainMinutes} phút`
}

export default function Timer() {
  const navigate = useNavigate()
  const { addCoins, addExp } = useData()
  const { showToast } = useToast()

  const [timer, setTimer] = useState<TimerStorage>(() => loadTimer())
  const [completedReward, setCompletedReward] = useState<RewardInfo | null>(null)
  const completionLock = useRef<string | null>(null)

  const preset = useMemo(() => {
    return (
      NORMAL_PRESETS.find(item => item.seconds === timer.duration) ?? {
        minutes: Math.max(1, Math.round(timer.duration / 60)),
        seconds: timer.duration,
        coins: 0,
        exp: 0,
      }
    )
  }, [timer.duration])

  const isAdvanced = timer.focusType === 'advanced'

  const rewardCoins = isAdvanced
    ? preset.coins * ADVANCED_REWARD_MULTIPLIER
    : preset.coins

  const rewardExp = isAdvanced
    ? preset.exp * ADVANCED_REWARD_MULTIPLIER
    : preset.exp

  const progress = useMemo(() => {
    if (timer.duration <= 0) return 0
    return Math.min(
      100,
      Math.max(
        0,
        ((timer.duration - timer.remaining) / timer.duration) * 100,
      ),
    )
  }, [timer.duration, timer.remaining])

  const ringRadius = 128
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset =
    ringCircumference - (progress / 100) * ringCircumference

  useEffect(() => {
    saveTimer(timer)
  }, [timer])

  useEffect(() => {
    if (!timer.running) return

    const interval = window.setInterval(() => {
      setTimer(current => {
        if (!current.running) return current

        const remaining = current.endAt
          ? Math.max(0, Math.ceil((current.endAt - Date.now()) / 1000))
          : Math.max(0, current.remaining - 1)

        if (remaining > 0) {
          return { ...current, remaining }
        }

        return {
          ...current,
          remaining: 0,
          running: false,
          endAt: null,
          startedAt: null,
        }
      })
    }, 250)

    return () => window.clearInterval(interval)
  }, [timer.running])

  useEffect(() => {
    if (timer.running || timer.remaining !== 0 || !timer.sessionId) return

    const sessionId = timer.sessionId
    if (completionLock.current === sessionId) return
    completionLock.current = sessionId

    const currentPreset =
      NORMAL_PRESETS.find(item => item.seconds === timer.duration) ?? {
        minutes: Math.max(1, Math.round(timer.duration / 60)),
        seconds: timer.duration,
        coins: 0,
        exp: 0,
      }

    const minutes = Math.max(1, Math.round(timer.duration / 60))
    const coins =
      timer.focusType === 'advanced'
        ? currentPreset.coins * ADVANCED_REWARD_MULTIPLIER
        : currentPreset.coins
    const exp =
      timer.focusType === 'advanced'
        ? currentPreset.exp * ADVANCED_REWARD_MULTIPLIER
        : currentPreset.exp

    setTimer(current => ({
      ...current,
      totalStudied: current.totalStudied + current.duration,
      sessionId: null,
    }))

    try {
      if (coins > 0) {
        void Promise.resolve(addCoins(coins)).catch(error =>
          console.error('Lỗi cộng xu:', error),
        )
      }
    } catch (error) {
      console.error('Lỗi cộng xu:', error)
    }

    try {
      if (exp > 0) {
        void Promise.resolve(addExp(exp)).catch(error =>
          console.error('Lỗi cộng EXP:', error),
        )
      }
    } catch (error) {
      console.error('Lỗi cộng EXP:', error)
    }

    void supabase
      .rpc('add_focus_minutes', { p_minutes: minutes })
      .then(({ error }) => {
        if (error) console.error('Lỗi cập nhật focus_minutes:', error)
      })
      .catch(error => console.error('Lỗi Supabase:', error))

    try {
      showToast(
        'success',
        `Hoàn thành ${minutes} phút tập trung! +${coins} xu +${exp} EXP`,
      )
    } catch (error) {
      console.error('Lỗi hiển thị toast:', error)
    }

    setCompletedReward({ coins, exp, minutes })

    const redirectTimer = window.setTimeout(() => {
      navigate('/')
    }, 1200)

    return () => window.clearTimeout(redirectTimer)
  }, [
    timer.running,
    timer.remaining,
    timer.sessionId,
    timer.duration,
    timer.focusType,
    addCoins,
    addExp,
    showToast,
    navigate,
  ])

  useEffect(() => {
    if (!isAdvanced || !timer.running) return

    const cancelAdvanced = () => {
      setTimer(current => {
        if (!current.running || current.focusType !== 'advanced') {
          return current
        }

        return {
          ...current,
          running: false,
          remaining: current.duration,
          startedAt: null,
          endAt: null,
          sessionId: null,
        }
      })

      try {
        showToast(
          'warning',
          'Chế độ nâng cao đã bị hủy vì bạn rời khỏi trang.',
        )
      } catch (error) {
        console.error('Lỗi hiển thị toast:', error)
      }
    }

    const handleVisibility = () => {
      if (document.hidden) cancelAdvanced()
    }

    const handleBlur = () => cancelAdvanced()
    const handlePageHide = () => cancelAdvanced()

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [isAdvanced, timer.running, showToast])

  const startTimer = () => {
    completionLock.current = null
    setCompletedReward(null)

    setTimer(current => {
      const now = Date.now()
      const remaining =
        current.remaining <= 0 ? current.duration : current.remaining

      return {
        ...current,
        remaining,
        running: true,
        startedAt: now,
        endAt: now + remaining * 1000,
        sessionId: current.sessionId ?? createSessionId(),
      }
    })
  }

  const pauseTimer = () => {
    setTimer(current => {
      if (!current.running) return current

      const remaining = current.endAt
        ? Math.max(0, Math.ceil((current.endAt - Date.now()) / 1000))
        : current.remaining

      return {
        ...current,
        remaining,
        running: false,
        endAt: null,
      }
    })
  }

  const resetTimer = () => {
    completionLock.current = null

    setTimer(current => ({
      ...current,
      remaining: current.duration,
      running: false,
      startedAt: null,
      endAt: null,
      sessionId: null,
    }))

    setCompletedReward(null)
  }

  const changeFocusType = (type: FocusType) => {
    if (timer.running) return

    completionLock.current = null
    const nextPreset =
      NORMAL_PRESETS.find(item => item.seconds === timer.duration) ??
      NORMAL_PRESETS[1]

    setTimer(current => ({
      ...current,
      focusType: type,
      duration: nextPreset.seconds,
      remaining: nextPreset.seconds,
      running: false,
      startedAt: null,
      endAt: null,
      sessionId: null,
    }))

    setCompletedReward(null)
  }

  const changeDuration = (seconds: number) => {
    if (timer.running) return

    completionLock.current = null

    setTimer(current => ({
      ...current,
      duration: seconds,
      remaining: seconds,
      startedAt: null,
      endAt: null,
      sessionId: null,
    }))

    setCompletedReward(null)
  }

  return (
    <div className="relative min-h-full overflow-hidden pb-6">
      <style>{`
        @keyframes timerGlow {
          0%,100% { transform: scale(1); opacity:.45; }
          50% { transform: scale(1.08); opacity:.75; }
        }
        @keyframes timerFloat {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes sparklePulse {
          0%,100% { opacity:.3; transform:scale(.8) rotate(0deg); }
          50% { opacity:1; transform:scale(1.1) rotate(15deg); }
        }
        .timer-glow { animation: timerGlow 4s ease-in-out infinite; }
        .timer-float { animation: timerFloat 3.5s ease-in-out infinite; }
        .timer-sparkle { animation: sparklePulse 2.5s ease-in-out infinite; }
      `}</style>

      {/* Premium-looking soft background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="timer-glow absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl dark:bg-indigo-600/10" />
        <div className="timer-glow absolute -right-24 top-64 h-80 w-80 rounded-full bg-fuchsia-400/15 blur-3xl dark:bg-fuchsia-600/10" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-300/10 blur-3xl dark:bg-sky-600/10" />
      </div>

      <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6">
        {/* Header */}
        <section className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-100/40 backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/85 dark:shadow-black/20 sm:p-7">
          <Sparkles className="timer-sparkle pointer-events-none absolute right-7 top-6 h-5 w-5 text-violet-400" />
          <Sparkles
            className="timer-sparkle pointer-events-none absolute bottom-7 right-20 h-3.5 w-3.5 text-pink-400"
            style={{ animationDelay: '0.8s' }}
          />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-black tracking-wider text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                <Brain className="h-3.5 w-3.5" />
                FOCUS MODE
              </div>

              <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                Nhiệm vụ
              </h1>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                Tập trung học, hoàn thành phiên và nhận xu + EXP.
              </p>
            </div>

            <div className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50/90 p-3 dark:border-gray-700 dark:bg-gray-800/80 sm:w-auto sm:px-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                <Flame className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  Đã tập trung
                </div>
                <div className="truncate font-black text-gray-900 dark:text-white">
                  {formatStudiedTime(timer.totalStudied)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mode selector - mobile friendly */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <button
            type="button"
            disabled={timer.running}
            onClick={() => changeFocusType('normal')}
            className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all sm:rounded-3xl sm:p-5 ${
              !isAdvanced
                ? 'border-indigo-400 bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/20'
                : 'border-gray-200 bg-white/90 text-gray-900 hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-700 dark:bg-gray-900/90 dark:text-white'
            } ${timer.running ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  !isAdvanced
                    ? 'bg-white/15'
                    : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                }`}
              >
                <TimerIcon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="font-black">Tập trung thường</h2>
                <p
                  className={`mt-0.5 text-xs ${
                    !isAdvanced
                      ? 'text-indigo-100'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Có thể tạm dừng
                </p>
              </div>

              {!isAdvanced && <CheckCircle2 className="h-5 w-5 shrink-0" />}
            </div>
          </button>

          <button
            type="button"
            disabled={timer.running}
            onClick={() => changeFocusType('advanced')}
            className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all sm:rounded-3xl sm:p-5 ${
              isAdvanced
                ? 'border-violet-400 bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-xl shadow-violet-500/20'
                : 'border-gray-200 bg-white/90 text-gray-900 hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-700 dark:bg-gray-900/90 dark:text-white'
            } ${timer.running ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  isAdvanced
                    ? 'bg-white/15'
                    : 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400'
                }`}
              >
                <Sparkles className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="font-black">Tập trung nâng cao</h2>
                <p
                  className={`mt-0.5 text-xs ${
                    isAdvanced
                      ? 'text-violet-100'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Thưởng x3 • không rời trang
                </p>
              </div>

              {isAdvanced && <CheckCircle2 className="h-5 w-5 shrink-0" />}
            </div>
          </button>
        </section>

        {isAdvanced && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-black">Chế độ nâng cao đang bật</div>
              <p className="mt-1 text-xs leading-5 opacity-90 sm:text-sm">
                Rời khỏi trang khi đang chạy sẽ hủy phiên và không nhận thưởng.
              </p>
            </div>
          </div>
        )}

        {/* Main timer */}
        <Card className="overflow-hidden border-0 bg-transparent shadow-none">
          <CardBody className="p-0">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 p-4 shadow-2xl shadow-indigo-100/50 backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/90 dark:shadow-black/20 sm:p-7">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />

              <div className="grid items-center gap-6 lg:grid-cols-[220px_minmax(320px,380px)_220px] lg:justify-center lg:gap-10">
                {/* Rewards */}
                <div className="order-2 grid grid-cols-2 gap-3 lg:order-1 lg:grid-cols-1">
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-3 dark:border-amber-900/40 dark:bg-amber-950/20 sm:p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                        <Coins className="h-4.5 w-4.5" />
                      </div>
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-200">
                        Xu
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                      +{rewardCoins}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/20 sm:p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                        <Star className="h-4.5 w-4.5" />
                      </div>
                      <span className="text-xs font-bold text-indigo-800 dark:text-indigo-200">
                        EXP
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                      +{rewardExp}
                    </div>
                  </div>
                </div>

                {/* Timer */}
                <div className="order-1 flex flex-col items-center lg:order-2">
                  <div className="relative h-[270px] w-[270px] sm:h-[330px] sm:w-[330px]">
                    <div className="timer-glow absolute inset-8 rounded-full bg-gradient-to-br from-indigo-500/20 via-violet-500/15 to-fuchsia-500/20 blur-2xl" />

                    <svg
                      viewBox="0 0 300 300"
                      className="relative h-full w-full -rotate-90"
                    >
                      <defs>
                        <linearGradient
                          id="timerGradient"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="50%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#d946ef" />
                        </linearGradient>
                      </defs>

                      <circle
                        cx="150"
                        cy="150"
                        r={ringRadius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="11"
                        className="text-gray-100 dark:text-gray-800"
                      />

                      <circle
                        cx="150"
                        cy="150"
                        r={ringRadius}
                        fill="none"
                        stroke="url(#timerGradient)"
                        strokeWidth="11"
                        strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringOffset}
                        className="transition-all duration-300"
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="timer-float mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm dark:bg-indigo-950/60 dark:text-indigo-400">
                        {isAdvanced ? (
                          <Sparkles className="h-5 w-5" />
                        ) : (
                          <Clock3 className="h-5 w-5" />
                        )}
                      </div>

                      <div className="text-[3.1rem] font-black tracking-tight text-gray-900 dark:text-white sm:text-6xl">
                        {formatTime(timer.remaining)}
                      </div>

                      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 sm:text-xs">
                        {timer.running
                          ? 'Đang tập trung'
                          : timer.remaining === 0
                            ? 'Hoàn thành'
                            : 'Sẵn sàng'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <Trophy className="h-3.5 w-3.5 text-amber-500" />
                    {preset.minutes} phút
                    {isAdvanced && ' • x3'}
                  </div>
                </div>

                {/* Controls */}
                <div className="order-3 space-y-3">
                  <Button
                    type="button"
                    onClick={timer.running ? pauseTimer : startTimer}
                    className="h-14 w-full rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-base font-black text-white shadow-xl shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:shadow-2xl"
                  >
                    {timer.running ? (
                      <>
                        <Pause className="mr-2 h-5 w-5" />
                        Tạm dừng
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5 fill-current" />
                        {timer.remaining === timer.duration
                          ? 'Bắt đầu'
                          : 'Tiếp tục'}
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetTimer}
                    className="h-12 w-full rounded-2xl font-bold"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Đặt lại
                  </Button>

                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                      <p className="text-xs leading-5 text-indigo-700 dark:text-indigo-300">
                        Hoàn thành phiên sẽ cộng phút thật vào BXH.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {completedReward && (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-black text-emerald-900 dark:text-emerald-200">
                        Phiên hoàn thành!
                      </div>
                      <div className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-300 sm:text-sm">
                        +{completedReward.coins} xu • +{completedReward.exp} EXP •{' '}
                        {completedReward.minutes} phút BXH
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCompletedReward(null)}
                      className="shrink-0 text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-300"
                    >
                      Đã hiểu
                    </button>
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Duration */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">
                Thời lượng
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                Chọn nhanh thời gian học.
              </p>
            </div>

            <div className="hidden rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300 sm:block">
              {formatTime(timer.remaining)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {NORMAL_PRESETS.map(item => {
              const active = timer.duration === item.seconds
              const coins = isAdvanced
                ? item.coins * ADVANCED_REWARD_MULTIPLIER
                : item.coins
              const exp = isAdvanced
                ? item.exp * ADVANCED_REWARD_MULTIPLIER
                : item.exp

              return (
                <button
                  key={item.seconds}
                  type="button"
                  disabled={timer.running}
                  onClick={() => changeDuration(item.seconds)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    active
                      ? 'border-indigo-400 bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'border-gray-200 bg-white/90 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg dark:border-gray-700 dark:bg-gray-900/90'
                  } ${timer.running ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <div className="flex items-end justify-between">
                    <span
                      className={`text-2xl font-black ${
                        active ? 'text-white' : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {item.minutes}
                    </span>
                    <span
                      className={`pb-0.5 text-xs font-bold ${
                        active ? 'text-indigo-100' : 'text-gray-400'
                      }`}
                    >
                      phút
                    </span>
                  </div>

                  <div
                    className={`mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold ${
                      active
                        ? 'text-indigo-100'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5" />
                      +{coins}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5" />
                      +{exp}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Bottom stats */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/90">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Clock3 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Đã học
                </div>
                <div className="mt-0.5 font-black text-gray-900 dark:text-white">
                  {formatStudiedTime(timer.totalStudied)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/90">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <Flame className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Chế độ
                </div>
                <div className="mt-0.5 font-black text-gray-900 dark:text-white">
                  {isAdvanced ? 'Nâng cao' : 'Thường'}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/90">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Hệ số thưởng
                </div>
                <div className="mt-0.5 font-black text-gray-900 dark:text-white">
                  x{isAdvanced ? ADVANCED_REWARD_MULTIPLIER : 1}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
