import React, { useEffect, useMemo, useState } from 'react'
import {
  Trophy,
  Medal,
  Crown,
  RefreshCw,
  Coins,
  Sparkles,
  TrendingUp,
  Star,
  Flame,
  Award,
  Users,
  Zap,
  ChevronUp,
} from 'lucide-react'
import { supabase } from '@/utils/supabase/client'

type LeaderboardType = 'exp' | 'coins'

interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
  level: number
  exp: number
  coins: number
}

interface LeaderboardConfig {
  key: LeaderboardType
  title: string
  subtitle: string
  icon: React.ReactNode
  accentIcon: React.ReactNode
  badge: string
}

const leaderboardConfigs: LeaderboardConfig[] = [
  {
    key: 'exp',
    title: 'EXP & Cấp độ',
    subtitle: 'Những người có thành tích học tập nổi bật',
    icon: <Sparkles className="h-5 w-5" />,
    accentIcon: <TrendingUp className="h-4 w-4" />,
    badge: 'EXP',
  },
  {
    key: 'coins',
    title: 'Xu vàng',
    subtitle: 'Ai đang sở hữu nhiều xu nhất?',
    icon: <Coins className="h-5 w-5" />,
    accentIcon: <Coins className="h-4 w-4" />,
    badge: 'XU',
  },
]

const Leaderboard: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [activeType, setActiveType] =
    useState<LeaderboardType>('exp')

  const loadLeaderboard = async () => {
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setCurrentUserId(user?.id ?? null)

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          avatar_url,
          level,
          exp,
          coins
        `)

      if (error) {
        console.error('Lỗi tải bảng xếp hạng:', error)
        setUsers([])
        return
      }

      const normalizedUsers: Profile[] = (data ?? []).map(
        (profile) => ({
          id: profile.id,
          username: profile.username ?? null,
          avatar_url: profile.avatar_url ?? null,
          level:
            profile.level !== null &&
            profile.level !== undefined
              ? Number(profile.level)
              : 1,
          exp:
            profile.exp !== null &&
            profile.exp !== undefined
              ? Number(profile.exp)
              : 0,
          coins:
            profile.coins !== null &&
            profile.coins !== undefined
              ? Number(profile.coins)
              : 0,
        })
      )

      setUsers(normalizedUsers)
    } catch (error) {
      console.error('Lỗi:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const activeConfig =
    leaderboardConfigs.find(
      (item) => item.key === activeType
    ) ?? leaderboardConfigs[0]

  const sortedUsers = useMemo(() => {
    const copied = [...users]

    if (activeType === 'coins') {
      return copied.sort(
        (a, b) =>
          Number(b.coins ?? 0) -
          Number(a.coins ?? 0)
      )
    }

    return copied.sort((a, b) => {
      const levelDiff =
        Number(b.level ?? 1) -
        Number(a.level ?? 1)

      if (levelDiff !== 0) {
        return levelDiff
      }

      return (
        Number(b.exp ?? 0) -
        Number(a.exp ?? 0)
      )
    })
  }, [users, activeType])

  const currentUserRank =
    currentUserId !== null
      ? sortedUsers.findIndex(
          (user) => user.id === currentUserId
        ) + 1
      : 0

  const currentUser =
    currentUserRank > 0
      ? sortedUsers[currentUserRank - 1]
      : null

  const getUsername = (user: Profile) => {
    return user.username?.trim() || 'Người dùng'
  }

  const getInitials = (name: string) => {
    if (!name) return 'ND'

    return name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((word) =>
        word.charAt(0).toUpperCase()
      )
      .join('')
  }

  const formatNumber = (
    value: number | null | undefined
  ) => {
    return new Intl.NumberFormat('vi-VN').format(
      Number(value ?? 0)
    )
  }

  const getScore = (user: Profile) => {
    if (activeType === 'coins') {
      return `${formatNumber(user.coins)} xu`
    }

    return `${formatNumber(user.exp)} EXP`
  }

  const getShortScore = (user: Profile) => {
    if (activeType === 'coins') {
      return formatNumber(user.coins)
    }

    return formatNumber(user.exp)
  }

  const getAccentText = () => {
    if (activeType === 'coins') {
      return 'text-amber-500 dark:text-amber-400'
    }

    return 'text-indigo-600 dark:text-indigo-400'
  }

  const getAccentBg = () => {
    if (activeType === 'coins') {
      return 'bg-amber-100/80 dark:bg-amber-900/30'
    }

    return 'bg-indigo-100/80 dark:bg-indigo-900/30'
  }

  const getAccentGradient = () => {
    if (activeType === 'coins') {
      return 'from-amber-400 via-orange-400 to-yellow-500'
    }

    return 'from-indigo-500 via-blue-500 to-violet-600'
  }

  const getProgressWidth = (user: Profile) => {
    if (!sortedUsers[0]) return 0

    let current = 0
    let max = 0

    if (activeType === 'coins') {
      current = Number(user.coins ?? 0)
      max = Number(sortedUsers[0].coins ?? 0)
    } else {
      current = Number(user.exp ?? 0)
      max = Number(sortedUsers[0].exp ?? 0)
    }

    if (max <= 0) return 0

    return Math.min(
      100,
      Math.max(4, (current / max) * 100)
    )
  }

  const getRankIcon = (index: number) => {
    if (index === 0) {
      return (
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 text-white shadow-lg shadow-amber-300/30">
          <Crown className="h-5 w-5" />

          <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-yellow-200" />
        </div>
      )
    }

    if (index === 1) {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-200 to-slate-400 text-white shadow-md">
          <Medal className="h-5 w-5" />
        </div>
      )
    }

    if (index === 2) {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-300 to-orange-500 text-white shadow-md">
          <Medal className="h-5 w-5" />
        </div>
      )
    }

    return (
      <div className="flex h-10 w-10 items-center justify-center">
        <span className="text-sm font-extrabold text-slate-400 dark:text-slate-500">
          #{index + 1}
        </span>
      </div>
    )
  }

  const getTopCardClass = (index: number) => {
    if (index === 0) {
      return `
        border-yellow-300/70
        bg-gradient-to-br
        from-yellow-50
        via-amber-50
        to-orange-50
        shadow-xl
        shadow-yellow-200/40
        dark:border-yellow-700/40
        dark:from-yellow-950/40
        dark:via-amber-950/30
        dark:to-orange-950/20
        dark:shadow-none
        md:-translate-y-4
      `
    }

    if (index === 1) {
      return `
        border-slate-200/80
        bg-gradient-to-br
        from-white
        to-slate-50
        shadow-lg
        dark:border-slate-700
        dark:from-slate-800
        dark:to-slate-900
      `
    }

    return `
      border-orange-200/80
      bg-gradient-to-br
      from-orange-50
      to-amber-50
      shadow-lg
      dark:border-orange-800/40
      dark:from-orange-950/30
      dark:to-slate-900
    `
  }

  const getTopBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-yellow-200 bg-yellow-100 px-3 py-1.5 text-[10px] font-black tracking-wide text-yellow-700 shadow-sm dark:border-yellow-700/30 dark:bg-yellow-900/30 dark:text-yellow-300">
          <Crown className="h-3.5 w-3.5" />
          QUÁN QUÂN
        </div>
      )
    }

    if (rank === 2) {
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-200 px-3 py-1.5 text-[10px] font-black tracking-wide text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
          <Medal className="h-3.5 w-3.5" />
          HẠNG 2
        </div>
      )
    }

    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-100 px-3 py-1.5 text-[10px] font-black tracking-wide text-orange-700 shadow-sm dark:border-orange-700/30 dark:bg-orange-900/30 dark:text-orange-300">
        <Medal className="h-3.5 w-3.5" />
        HẠNG 3
      </div>
    )
  }

  const getAvatar = (
    user: Profile,
    large = false
  ) => {
    const username = getUsername(user)

    return (
      <div
        className={`
          relative
          flex
          shrink-0
          items-center
          justify-center
          overflow-hidden
          rounded-full
          bg-slate-100
          dark:bg-slate-800
          ${
            large
              ? 'h-24 w-24 border-4 border-white shadow-xl dark:border-slate-700'
              : 'h-11 w-11 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700'
          }
        `}
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={username}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span
            className={`
              font-black
              ${
                large
                  ? 'text-2xl text-indigo-600 dark:text-indigo-400'
                  : 'text-sm text-slate-500 dark:text-slate-300'
              }
            `}
          >
            {getInitials(username)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="relative min-w-0 space-y-5 overflow-hidden pb-8 sm:space-y-6">
      {/* Decorative premium glow */}
      <div className="pointer-events-none absolute -left-32 -top-28 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/10" />

      <div className="pointer-events-none absolute right-[-120px] top-56 h-96 w-96 rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-500/10" />

      <div className="pointer-events-none absolute left-1/3 top-[45%] h-64 w-64 rounded-full bg-blue-300/5 blur-3xl" />

      {/* Header */}
      <section className="relative overflow-hidden rounded-[26px] border border-white/60 bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-600 p-5 text-white shadow-xl shadow-indigo-200/30 sm:rounded-[30px] sm:p-8 dark:border-slate-700/60 dark:shadow-none">
        {/* Glow */}
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-fuchsia-300/20 blur-3xl" />

        {/* Sparkles */}
        <Sparkles className="pointer-events-none absolute right-7 top-7 h-4 w-4 animate-pulse text-yellow-200/80" />
        <Sparkles className="pointer-events-none absolute bottom-8 left-1/2 h-3 w-3 animate-pulse text-white/50" />
        <Star className="pointer-events-none absolute right-20 bottom-10 h-3 w-3 text-blue-100/60" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-lg backdrop-blur-md sm:h-16 sm:w-16">
              <Trophy className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>

            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/15 px-2.5 py-1 text-[9px] font-black tracking-[0.12em] backdrop-blur-sm sm:text-[10px]">
                  NGAUHUB
                </span>

                <Sparkles className="h-3.5 w-3.5 text-yellow-200 sm:h-4 sm:w-4" />
              </div>

              <h1 className="truncate text-2xl font-black tracking-tight sm:text-3xl">
                Bảng xếp hạng
              </h1>

              <p className="mt-1 max-w-xl text-xs leading-relaxed text-blue-100 sm:text-sm">
                Thi đua học tập · Tích xu · Chinh phục thành tích
              </p>
            </div>
          </div>

          <button
            onClick={loadLeaderboard}
            disabled={loading}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white shadow-sm backdrop-blur-md transition active:scale-[0.98] hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? 'animate-spin' : ''
              }`}
            />

            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </section>

      {/* Tabs */}
      <section className="relative grid grid-cols-2 gap-2.5 sm:gap-3">
        {leaderboardConfigs.map((config) => {
          const active = activeType === config.key

          return (
            <button
              key={config.key}
              onClick={() =>
                setActiveType(config.key)
              }
              className={`
                group
                relative
                min-w-0
                overflow-hidden
                rounded-2xl
                border
                p-3
                text-left
                transition-all
                duration-200
                active:scale-[0.98]
                sm:p-4
                ${
                  active
                    ? 'border-indigo-300 bg-white shadow-lg shadow-indigo-100/60 dark:border-indigo-700 dark:bg-slate-800 dark:shadow-none'
                    : 'border-slate-200/80 bg-white/80 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/70'
                }
              `}
            >
              {active && (
                <div
                  className={`
                    absolute inset-x-0 top-0 h-1 bg-gradient-to-r
                    ${getAccentGradient()}
                  `}
                />
              )}

              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <div
                  className={`
                    flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition sm:h-11 sm:w-11
                    ${
                      active
                        ? `bg-gradient-to-br ${getAccentGradient()} text-white shadow-md`
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                    }
                  `}
                >
                  {config.icon}
                </div>

                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white sm:text-base">
                      {config.title}
                    </p>

                    {active && (
                      <span className="hidden shrink-0 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[8px] font-black text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300 sm:inline">
                        ĐANG XEM
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block">
                    {config.subtitle}
                  </p>

                  <p className="mt-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 sm:hidden">
                    {config.badge}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </section>

      {/* Current user */}
      {currentUserId &&
        currentUserRank > 0 &&
        currentUser && (
          <section className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-r from-indigo-50 via-blue-50 to-violet-50 p-4 shadow-sm dark:border-indigo-800/50 dark:from-indigo-950/30 dark:via-blue-950/30 dark:to-violet-950/20 sm:p-5">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-indigo-300/20 blur-3xl" />

            <Sparkles className="pointer-events-none absolute right-4 top-4 h-4 w-4 text-indigo-300/50" />

            <div className="relative flex items-center gap-3 sm:gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400 sm:h-12 sm:w-12">
                <Award className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 sm:text-xs">
                  Vị trí của bạn
                </p>

                <div className="mt-0.5 flex min-w-0 items-center gap-2">
                  <p className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                    #{currentUserRank}
                  </p>

                  <span className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300 sm:text-sm">
                    {getUsername(currentUser)}
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p
                  className={`text-base font-black sm:text-lg ${getAccentText()}`}
                >
                  {getScore(currentUser)}
                </p>

                <p className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  Lv. {currentUser.level ?? 1}
                </p>
              </div>
            </div>
          </section>
        )}

      {/* Top 3 */}
      {!loading && sortedUsers.length >= 3 && (
        <section className="relative">
          <div className="mb-4 flex items-center gap-2 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
              <Trophy className="h-4 w-4" />
            </div>

            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white sm:text-base">
                Top 3
              </h2>

              <p className="text-[10px] text-slate-400 sm:text-xs">
                Những người dẫn đầu
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
            {[1, 0, 2].map((userIndex) => {
              const user = sortedUsers[userIndex]

              if (!user) return null

              const rank = userIndex + 1
              const isFirst = userIndex === 0

              return (
                <div
                  key={user.id}
                  className={`
                    relative
                    min-w-0
                    overflow-hidden
                    rounded-2xl
                    border
                    p-2.5
                    text-center
                    transition-all
                    duration-300
                    hover:-translate-y-1
                    sm:rounded-[26px]
                    sm:p-6
                    ${getTopCardClass(userIndex)}
                  `}
                >
                  {isFirst && (
                    <>
                      <div className="pointer-events-none absolute left-1/2 top-0 h-20 w-28 -translate-x-1/2 rounded-full bg-yellow-300/20 blur-2xl sm:h-24 sm:w-40" />

                      <Sparkles className="absolute right-2 top-2 h-3.5 w-3.5 text-yellow-400 sm:right-4 sm:top-4 sm:h-5 sm:w-5" />

                      <div className="absolute left-2 top-2 rounded-full bg-yellow-400 px-1.5 py-0.5 text-[8px] font-black text-white shadow-sm sm:left-4 sm:top-4 sm:px-2 sm:text-[9px]">
                        #1
                      </div>
                    </>
                  )}

                  <div className="relative">
                    <div className="mb-2 flex justify-center sm:mb-3">
                      <div
                        className={`
                          flex
                          items-center
                          justify-center
                          overflow-hidden
                          rounded-full
                          border-2
                          border-white
                          bg-slate-100
                          shadow-lg
                          dark:border-slate-700
                          dark:bg-slate-800
                          ${
                            isFirst
                              ? 'h-16 w-16 ring-2 ring-yellow-200/80 dark:ring-yellow-800/40 sm:h-24 sm:w-24 sm:ring-4'
                              : 'h-14 w-14 sm:h-20 sm:w-20'
                          }
                        `}
                      >
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={getUsername(user)}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span
                            className={`
                              font-black
                              ${
                                isFirst
                                  ? 'text-lg text-yellow-600 dark:text-yellow-400 sm:text-2xl'
                                  : 'text-base text-slate-500 dark:text-slate-300 sm:text-xl'
                              }
                            `}
                          >
                            {getInitials(
                              getUsername(user)
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mb-2 flex justify-center">
                      {getTopBadge(rank)}
                    </div>

                    <h3
                      className={`
                        truncate
                        font-black
                        text-slate-900
                        dark:text-white
                        ${
                          isFirst
                            ? 'text-xs sm:text-xl'
                            : 'text-[11px] sm:text-lg'
                        }
                      `}
                    >
                      {getUsername(user)}
                    </h3>

                    <p className="mt-0.5 truncate text-[9px] font-semibold text-slate-500 dark:text-slate-400 sm:mt-1 sm:text-xs">
                      Lv. {user.level ?? 1}
                    </p>

                    <div
                      className={`
                        mx-auto
                        mt-2
                        inline-flex
                        max-w-full
                        items-center
                        gap-1
                        rounded-lg
                        px-2
                        py-1
                        sm:mt-4
                        sm:gap-2
                        sm:rounded-xl
                        sm:px-4
                        sm:py-2
                        ${getAccentBg()}
                      `}
                    >
                      {activeConfig.accentIcon}

                      <span
                        className={`truncate text-[9px] font-black sm:text-sm ${getAccentText()}`}
                      >
                        <span className="sm:hidden">
                          {getShortScore(user)}
                        </span>

                        <span className="hidden sm:inline">
                          {getScore(user)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Full leaderboard */}
      <section className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-[26px]">
        {/* Header */}
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 px-4 py-4 dark:border-slate-700 dark:from-slate-800 dark:via-slate-800 dark:to-indigo-950/20 sm:px-5 sm:py-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getAccentBg()} ${getAccentText()} sm:h-11 sm:w-11`}
            >
              {activeConfig.icon}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-sm font-black text-slate-900 dark:text-white sm:text-base">
                {activeConfig.title}
              </h2>

              <p className="mt-0.5 hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                {activeConfig.subtitle}
              </p>

              <p className="mt-0.5 text-[10px] font-medium text-slate-400 sm:hidden">
                Xếp hạng toàn bộ người dùng
              </p>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300 sm:px-3 sm:text-xs">
              <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />

              {sortedUsers.length}
              <span className="hidden sm:inline">
                người
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center px-5 py-20">
            <div className="relative mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/20">
                <RefreshCw className="h-7 w-7 animate-spin text-indigo-500" />
              </div>

              <Sparkles className="absolute -right-1 -top-1 h-4 w-4 animate-pulse text-indigo-400" />
            </div>

            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Đang tải bảng xếp hạng...
            </p>
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
              <Trophy className="h-8 w-8 text-slate-400" />
            </div>

            <p className="font-bold text-slate-600 dark:text-slate-300">
              Chưa có dữ liệu bảng xếp hạng
            </p>

            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Hãy bắt đầu học tập để trở thành người đứng đầu!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {sortedUsers.map((user, index) => {
              const isCurrentUser =
                user.id === currentUserId

              const progress =
                getProgressWidth(user)

              return (
                <div
                  key={user.id}
                  className={`
                    group
                    relative
                    flex
                    min-w-0
                    items-center
                    gap-2.5
                    px-3
                    py-3
                    transition
                    sm:gap-4
                    sm:px-5
                    sm:py-4
                    ${
                      isCurrentUser
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                    }
                  `}
                >
                  {isCurrentUser && (
                    <div className="absolute bottom-0 left-0 top-0 w-1 bg-gradient-to-b from-indigo-500 to-violet-500" />
                  )}

                  {/* Rank */}
                  <div className="flex w-8 shrink-0 justify-center sm:w-10">
                    {getRankIcon(index)}
                  </div>

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {getAvatar(user)}

                    {index < 3 && (
                      <div
                        className={`
                          absolute
                          -bottom-1
                          -right-1
                          flex
                          h-4
                          w-4
                          items-center
                          justify-center
                          rounded-full
                          border-2
                          border-white
                          text-[7px]
                          font-black
                          text-white
                          dark:border-slate-800
                          ${
                            index === 0
                              ? 'bg-yellow-400'
                              : index === 1
                              ? 'bg-slate-400'
                              : 'bg-orange-400'
                          }
                        `}
                      >
                        {index + 1}
                      </div>
                    )}
                  </div>

                  {/* User */}
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white sm:text-sm">
                        {getUsername(user)}
                      </p>

                      {isCurrentUser && (
                        <span className="shrink-0 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[8px] font-black text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300 sm:px-2 sm:text-[10px]">
                          BẠN
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex min-w-0 items-center gap-2">
                      <span className="shrink-0 text-[9px] font-bold text-slate-400 sm:text-xs">
                        Lv.{user.level ?? 1}
                      </span>

                      <div className="h-1.5 min-w-0 max-w-[150px] flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${getAccentGradient()} transition-all duration-500`}
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="shrink-0 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {activeType === 'coins' ? (
                        <Coins className="h-3.5 w-3.5 text-amber-500 sm:h-4 sm:w-4" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-indigo-500 sm:h-4 sm:w-4" />
                      )}

                      <p
                        className={`text-xs font-black sm:text-sm ${getAccentText()}`}
                      >
                        <span className="hidden sm:inline">
                          {getScore(user)}
                        </span>

                        <span className="sm:hidden">
                          {getShortScore(user)}
                        </span>
                      </p>
                    </div>

                    <p className="mt-0.5 text-[9px] font-medium text-slate-400 sm:text-[10px]">
                      {activeType === 'exp'
                        ? `Lv. ${user.level ?? 1}`
                        : 'Xu vàng'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Statistics */}
      {!loading && sortedUsers.length > 0 && (
        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                <Users className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-[9px] font-bold uppercase tracking-wide text-slate-400 sm:text-[10px]">
                  Người chơi
                </p>

                <p className="text-base font-black text-slate-900 dark:text-white sm:text-lg">
                  {formatNumber(sortedUsers.length)}
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                <Crown className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-[9px] font-bold uppercase tracking-wide text-slate-400 sm:text-[10px]">
                  Dẫn đầu
                </p>

                <p className="truncate text-sm font-black text-slate-900 dark:text-white sm:text-base">
                  {getUsername(sortedUsers[0])}
                </p>
              </div>
            </div>
          </div>

          <div className="relative col-span-2 overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-r from-indigo-50 to-violet-50 p-3 shadow-sm dark:border-indigo-800/40 dark:from-indigo-950/30 dark:to-violet-950/20 sm:col-span-1 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400">
                <Zap className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-[9px] font-bold uppercase tracking-wide text-indigo-400 sm:text-[10px]">
                  Mục tiêu
                </p>

                <p className="truncate text-xs font-black text-indigo-700 dark:text-indigo-300 sm:text-sm">
                  Leo lên hạng cao hơn!
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Bottom hint */}
      {!loading && sortedUsers.length > 0 && (
        <div className="relative flex items-center justify-center gap-2 px-3 text-center text-[10px] leading-relaxed text-slate-400 dark:text-slate-500 sm:text-xs">
          <Flame className="h-4 w-4 shrink-0" />

          <span>
            Học đều mỗi ngày để leo hạng và mở khóa thành tích mới!
          </span>

          <ChevronUp className="hidden h-3.5 w-3.5 sm:block" />
        </div>
      )}
    </div>
  )
}

export default Leaderboard