import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import {
  Home,
  BookOpen,
  Link2,
  Star,
  Zap,
  Settings as SettingsIcon,
  GraduationCap,
  X,
  NotebookPen,
  ClipboardCheck,
  Trophy,
  Timer,
  MessageCircle,
  DatabaseBackup,
  Sparkles,
  Crown,
  Gem,
  Moon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SIDEBAR_MENU } from '@/constants'
import { cn } from '@/utils/helpers'
import { supabase } from '@/utils/supabase/client'

const iconMap: Record<string, LucideIcon> = {
  Home,
  BookOpen,
  Link2,
  Star,
  Zap,
  Settings: SettingsIcon,
  NotebookPen,
  ClipboardCheck,
  Trophy,
  Timer,
  MessageCircle,
  DatabaseBackup,
}

interface SidebarProps {
  open?: boolean
  onClose?: () => void
  variant?: 'desktop' | 'mobile'
}

type PremiumTheme =
  | 'premium-dark'
  | 'premium-sparkle'

/*
 * =========================================================
 * PREMIUM STORAGE
 * =========================================================
 */

const PREMIUM_STORAGE_PREFIX =
  'studyhub_premium_v1_'

/*
 * Settings.tsx của bạn đang dùng chính xác key này:
 *
 * studyhub_premium_theme_v1_${user.id}
 *
 * Giá trị:
 * dark
 * sparkle
 */

const PREMIUM_THEME_PREFIX =
  'studyhub_premium_theme_v1_'

/*
 * =========================================================
 * ĐỌC PREMIUM THEME
 * =========================================================
 */

const readPremiumTheme = (
  userId: string,
): PremiumTheme => {
  if (typeof window === 'undefined') {
    return 'premium-sparkle'
  }

  /*
   * QUAN TRỌNG:
   * Key theo user được ưu tiên đầu tiên.
   */

  const keys = [
    `${PREMIUM_THEME_PREFIX}${userId}`,
    `studyhub_premium_theme_${userId}`,
    'studyhub_premium_theme_v1',
    'studyhub_premium_theme',
    'premium_theme',
    'studyhub_theme',
    'theme',
  ]

  for (const key of keys) {
    try {
      const value =
        window.localStorage.getItem(key)

      if (!value) continue

      const normalized = value
        .toLowerCase()
        .trim()
        .replace(/_/g, '-')
        .replace(/\s+/g, '-')

      /*
       * -----------------------------------------------------
       * DARK
       * -----------------------------------------------------
       */

      if (
        normalized === 'dark' ||
        normalized === 'premium-dark' ||
        normalized === 'premiumdark' ||
        normalized === 'premium-dark-theme'
      ) {
        return 'premium-dark'
      }

      /*
       * -----------------------------------------------------
       * SPARKLE / LIGHT
       * -----------------------------------------------------
       */

      if (
        normalized === 'sparkle' ||
        normalized === 'premium-sparkle' ||
        normalized === 'premiumsparkle' ||
        normalized === 'premium-sparkles' ||
        normalized === 'light'
      ) {
        return 'premium-sparkle'
      }
    } catch {
      // Bỏ qua localStorage lỗi
    }
  }

  return 'premium-sparkle'
}

/*
 * =========================================================
 * COMPONENT
 * =========================================================
 */

export const Sidebar: React.FC<SidebarProps> = ({
  open = false,
  onClose,
  variant = 'desktop',
}) => {
  // Keep the variant because MainLayout renders one desktop
  // sidebar and one mobile drawer. The mobile drawer is portaled
  // to <body> below, so it cannot be trapped by the page layout.
  const isMobile = variant === 'mobile'

  const [isPremium, setIsPremium] =
    useState(false)

  const [premiumTheme, setPremiumTheme] =
    useState<PremiumTheme>(
      'premium-sparkle',
    )

  /*
   * =========================================================
   * KIỂM TRA PREMIUM BAN ĐẦU
   * =========================================================
   */

  useEffect(() => {
    let mounted = true
    let currentUserId = ''

    /*
     * -------------------------------------------------------
     * Đồng bộ theme từ localStorage
     *
     * KHÔNG gọi Supabase mỗi lần đổi theme.
     * Chỉ đọc localStorage nên rất nhẹ.
     * -------------------------------------------------------
     */

    const syncThemeFromStorage = () => {
      if (!mounted || !currentUserId) {
        return
      }

      const premiumKey =
        `${PREMIUM_STORAGE_PREFIX}${currentUserId}`

      const enabled =
        window.localStorage.getItem(
          premiumKey,
        ) === 'true'

      const nextTheme = enabled
        ? readPremiumTheme(currentUserId)
        : 'premium-sparkle'

      setIsPremium((previous) =>
        previous === enabled
          ? previous
          : enabled,
      )

      setPremiumTheme((previous) =>
        previous === nextTheme
          ? previous
          : nextTheme,
      )
    }

    /*
     * -------------------------------------------------------
     * Lấy user một lần
     * -------------------------------------------------------
     */

    const checkPremium = async () => {
      try {
        const {
          data: { user },
        } =
          await supabase.auth.getUser()

        if (!mounted) return

        if (!user) {
          currentUserId = ''

          setIsPremium(false)
          setPremiumTheme(
            'premium-sparkle',
          )

          return
        }

        currentUserId = user.id

        const premiumKey =
          `${PREMIUM_STORAGE_PREFIX}${user.id}`

        const enabled =
          window.localStorage.getItem(
            premiumKey,
          ) === 'true'

        const theme = enabled
          ? readPremiumTheme(user.id)
          : 'premium-sparkle'

        setIsPremium(enabled)
        setPremiumTheme(theme)
      } catch (error) {
        console.error(
          'Không thể kiểm tra Premium:',
          error,
        )

        if (mounted) {
          setIsPremium(false)
          setPremiumTheme(
            'premium-sparkle',
          )
        }
      }
    }

    checkPremium()

    /*
     * =======================================================
     * ĐỒNG BỘ KHI SETTINGS THAY ĐỔI
     * =======================================================
     */

    const handleThemeChange = () => {
      syncThemeFromStorage()
    }

    /*
     * storage:
     * Dùng cho trường hợp thay đổi từ tab khác.
     */

    window.addEventListener(
      'storage',
      handleThemeChange,
    )

    /*
     * Custom events:
     * Dùng nếu Settings hoặc component khác phát event.
     */

    window.addEventListener(
      'studyhub-premium-changed',
      handleThemeChange,
    )

    window.addEventListener(
      'studyhub-theme-changed',
      handleThemeChange,
    )

    window.addEventListener(
      'studyhub-premium-theme-changed',
      handleThemeChange,
    )

    /*
     * =======================================================
     * FALLBACK ĐỒNG BỘ CÙNG TAB
     *
     * Đây là phần quan trọng.
     *
     * Settings thay localStorage trong cùng tab,
     * browser KHÔNG phát storage event.
     *
     * Vì vậy Sidebar kiểm tra key mỗi 300ms.
     * Không gọi Supabase, chỉ đọc localStorage.
     * =======================================================
     */

    const syncInterval =
      window.setInterval(() => {
        syncThemeFromStorage()
      }, 300)

    /*
     * =======================================================
     * CLEANUP
     * =======================================================
     */

    return () => {
      mounted = false

      window.clearInterval(
        syncInterval,
      )

      window.removeEventListener(
        'storage',
        handleThemeChange,
      )

      window.removeEventListener(
        'studyhub-premium-changed',
        handleThemeChange,
      )

      window.removeEventListener(
        'studyhub-theme-changed',
        handleThemeChange,
      )

      window.removeEventListener(
        'studyhub-premium-theme-changed',
        handleThemeChange,
      )
    }
  }, [])

  /*
   * =========================================================
   * THEME FLAGS
   * =========================================================
   */

  const isPremiumDark =
    isPremium &&
    premiumTheme === 'premium-dark'

  const isPremiumSparkle =
    isPremium &&
    premiumTheme === 'premium-sparkle'

  /*
   * =========================================================
   * MENU
   * =========================================================
   */

  const menuItems = useMemo(() => {
    let items = [...SIDEBAR_MENU]

    /*
     * -------------------------------------------------------
     * ĐỀ THI
     * -------------------------------------------------------
     */

    if (
      !items.some(
        (item) =>
          item.path === '/exams',
      )
    ) {
      const settingsIndex =
        items.findIndex(
          (item) =>
            item.path === '/settings',
        )

      const examsItem = {
        path: '/exams',
        label: 'Đề thi',
        icon: 'ClipboardCheck',
      }

      if (settingsIndex >= 0) {
        items.splice(
          settingsIndex,
          0,
          examsItem,
        )
      } else {
        items.push(examsItem)
      }
    }

    /*
     * -------------------------------------------------------
     * BẢNG XẾP HẠNG
     * -------------------------------------------------------
     */

    if (
      !items.some(
        (item) =>
          item.path ===
          '/leaderboard',
      )
    ) {
      const settingsIndex =
        items.findIndex(
          (item) =>
            item.path === '/settings',
        )

      const leaderboardItem = {
        path: '/leaderboard',
        label: 'Bảng xếp hạng',
        icon: 'Trophy',
      }

      if (settingsIndex >= 0) {
        items.splice(
          settingsIndex,
          0,
          leaderboardItem,
        )
      } else {
        items.push(
          leaderboardItem,
        )
      }
    }

    /*
     * -------------------------------------------------------
     * NHIỆM VỤ
     * -------------------------------------------------------
     */

    if (
      !items.some(
        (item) =>
          item.path === '/timer',
      )
    ) {
      const settingsIndex =
        items.findIndex(
          (item) =>
            item.path === '/settings',
        )

      const timerItem = {
        path: '/timer',
        label: 'Nhiệm vụ',
        icon: 'Timer',
      }

      if (settingsIndex >= 0) {
        items.splice(
          settingsIndex,
          0,
          timerItem,
        )
      } else {
        items.push(timerItem)
      }
    }

    /*
     * -------------------------------------------------------
     * CHAT
     * -------------------------------------------------------
     */

    if (
      !items.some(
        (item) =>
          item.path === '/chat',
      )
    ) {
      const settingsIndex =
        items.findIndex(
          (item) =>
            item.path === '/settings',
        )

      const chatItem = {
        path: '/chat',
        label: 'Chat',
        icon: 'MessageCircle',
      }

      if (settingsIndex >= 0) {
        items.splice(
          settingsIndex,
          0,
          chatItem,
        )
      } else {
        items.push(chatItem)
      }
    }

    /*
     * -------------------------------------------------------
     * NGÂU AI
     * -------------------------------------------------------
     */

    if (
      !items.some(
        (item) =>
          item.path === '/ngau-ai',
      )
    ) {
      const settingsIndex =
        items.findIndex(
          (item) =>
            item.path === '/settings',
        )

      const ngauAIItem = {
        path: '/ngau-ai',
        label: 'Ngâu AI',
        icon: 'Sparkles',
      }

      if (settingsIndex >= 0) {
        items.splice(
          settingsIndex,
          0,
          ngauAIItem,
        )
      } else {
        items.push(ngauAIItem)
      }
    }

    /*
     * -------------------------------------------------------
     * SAO LƯU
     *
     * CHỈ HIỆN KHI PREMIUM
     * -------------------------------------------------------
     */

    items = items.filter(
      (item) =>
        item.path !== '/backups',
    )

    if (isPremium) {
      const settingsIndex =
        items.findIndex(
          (item) =>
            item.path === '/settings',
        )

      const backupsItem = {
        path: '/backups',
        label: 'Sao lưu',
        icon: 'DatabaseBackup',
      }

      if (settingsIndex >= 0) {
        items.splice(
          settingsIndex,
          0,
          backupsItem,
        )
      } else {
        items.push(
          backupsItem,
        )
      }
    }

    return items
  }, [isPremium])

  /*
   * =========================================================
   * SIDEBAR CLASS
   * =========================================================
   */

  /*
   * =========================================================
   * RESPONSIVE SIDEBAR
   * =========================================================
   *
   * Mobile:
   * - fixed to the LEFT edge of the viewport
   * - never participates in the page flex layout
   * - max width is the viewport minus a small margin
   * - slides completely outside the screen when closed
   *
   * Desktop:
   * - returns to the normal sticky sidebar layout
   * - always stays visible
   *
   * This is intentionally CSS-responsive so the parent does not have
   * to render a different sidebar component/variant on Android.
   */
  const sidebarClass = cn(
    isMobile
      ? `
          fixed
          left-0
          top-0
          bottom-0
          z-[9999]
          flex
          h-[100dvh]
          w-[min(320px,86vw)]
          max-w-[calc(100vw-16px)]
          flex-col
          overflow-hidden
          transform
          transition-transform
          duration-300
          ease-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `
      : `
          hidden
          lg:flex
          relative
          top-0
          w-64
          xl:w-72
          h-screen
          flex-shrink-0
          flex-col
          overflow-hidden
        `,
    isPremiumDark
      ? `
          bg-[#080914]
          text-slate-100
          border-r
          border-violet-500/20
          shadow-[10px_0_45px_rgba(76,29,149,0.16)]
        `
      : isPremiumSparkle
        ? `
            bg-white
            text-gray-900
            border-r
            border-violet-200/70
            shadow-[10px_0_45px_rgba(139,92,246,0.10)]
          `
        : `
            bg-white
            dark:bg-gray-900
            border-r
            border-gray-100
            dark:border-gray-700/60
          `,
  )

  const sidebarContent = (
    <>
      {/* =====================================================
          MOBILE OVERLAY
      ====================================================== */}

      {isMobile && open && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={onClose}
          className="
            fixed
            inset-0
            z-[50]
            cursor-default
            bg-black/50
            backdrop-blur-[3px]
            lg:hidden
          "
        />
      )}

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={sidebarClass}
        style={
          isMobile
            ? {
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                width: 'min(320px, 86vw)',
                maxWidth: 'calc(100vw - 16px)',
                height: '100dvh',
                zIndex: 9999,
              }
            : undefined
        }
      >
        {/* ===================================================
            PREMIUM BACKGROUND
        ==================================================== */}

        {isPremium && (
          <div
            className="
              pointer-events-none
              absolute
              inset-0
              z-0
              overflow-hidden
            "
          >
            {/* DARK */}

            {isPremiumDark && (
              <>
                <div
                  className="
                    absolute
                    -left-24
                    -top-24
                    h-72
                    w-72
                    rounded-full
                    bg-violet-700/10
                    blur-3xl
                  "
                />

                <div
                  className="
                    absolute
                    -right-24
                    top-1/3
                    h-64
                    w-64
                    rounded-full
                    bg-fuchsia-700/8
                    blur-3xl
                  "
                />

                <div
                  className="
                    absolute
                    -bottom-24
                    -left-20
                    h-72
                    w-72
                    rounded-full
                    bg-indigo-700/8
                    blur-3xl
                  "
                />

                <div
                  className="
                    absolute
                    inset-y-0
                    left-0
                    w-px
                    bg-violet-400/20
                  "
                />
              </>
            )}

            {/* SPARKLE */}

            {isPremiumSparkle && (
              <>
                <div
                  className="
                    absolute
                    -left-20
                    -top-20
                    h-64
                    w-64
                    rounded-full
                    bg-violet-300/25
                    blur-3xl
                  "
                />

                <div
                  className="
                    absolute
                    -right-20
                    top-1/3
                    h-60
                    w-60
                    rounded-full
                    bg-pink-300/20
                    blur-3xl
                  "
                />

                <div
                  className="
                    absolute
                    -bottom-20
                    -left-16
                    h-64
                    w-64
                    rounded-full
                    bg-indigo-300/20
                    blur-3xl
                  "
                />
              </>
            )}
          </div>
        )}

        {/* ===================================================
            TOP PREMIUM LINE
        ==================================================== */}

        {isPremium && (
          <div
            className="
              pointer-events-none
              absolute
              left-0
              right-0
              top-0
              z-30
              h-[2px]
              bg-gradient-to-r
              from-violet-500
              via-fuchsia-400
              to-indigo-500
            "
          />
        )}

        {/* ===================================================
            HEADER
        ==================================================== */}

        <div
          className={cn(
            `
              relative
              z-10
              flex
              h-16
              flex-shrink-0
              items-center
              gap-3
              overflow-hidden
              px-4
              sm:px-5
              border-b
            `,
            isPremiumDark
              ? 'border-violet-500/15'
              : isPremiumSparkle
                ? 'border-violet-100'
                : 'border-gray-100 dark:border-gray-700/60',
          )}
        >
          {/* Header glow */}

          {isPremium && (
            <div
              className="
                pointer-events-none
                absolute
                -right-10
                -top-10
                h-28
                w-28
                rounded-full
                bg-violet-500/15
                blur-3xl
              "
            />
          )}

          {/* LOGO */}

          <div
            className={cn(
              `
                relative
                flex
                h-10
                w-10
                flex-shrink-0
                items-center
                justify-center
                rounded-xl
              `,
              isPremium
                ? `
                    bg-gradient-to-br
                    from-violet-500
                    via-fuchsia-500
                    to-indigo-600
                    shadow-[0_0_25px_rgba(139,92,246,0.40)]
                  `
                : `
                    bg-gradient-to-br
                    from-primary-500
                    to-primary-700
                    shadow-soft
                  `,
            )}
          >
            {isPremium ? (
              <Gem
                className="h-5 w-5 text-white"
                strokeWidth={2}
              />
            ) : (
              <GraduationCap
                className="h-5 w-5 text-white"
                strokeWidth={2.2}
              />
            )}

            {isPremium && (
              <Sparkles
                className="
                  absolute
                  -right-1
                  -top-1
                  h-3.5
                  w-3.5
                  text-yellow-300
                  drop-shadow-[0_0_5px_rgba(253,224,71,0.8)]
                  animate-pulse
                "
                strokeWidth={2.5}
              />
            )}
          </div>

          {/* BRAND */}

          <div className="relative min-w-0 flex-1">
            <h1
              className={cn(
                `
                  truncate
                  text-base
                  font-black
                  tracking-tight
                `,
                isPremium
                  ? `
                      bg-gradient-to-r
                      from-violet-400
                      via-fuchsia-400
                      to-indigo-400
                      bg-clip-text
                      text-transparent
                    `
                  : `
                      text-gray-900
                      dark:text-gray-50
                    `,
              )}
            >
              Ngâu Hub
            </h1>

            {isPremium ? (
              <div className="mt-0.5 flex items-center gap-1.5">
                {isPremiumDark ? (
                  <Moon
                    className="h-3 w-3 text-violet-300"
                    fill="currentColor"
                  />
                ) : (
                  <Crown
                    className="h-3 w-3 text-amber-400"
                    fill="currentColor"
                  />
                )}

                <p
                  className={cn(
                    `
                      text-[9px]
                      font-black
                      uppercase
                      tracking-[0.16em]
                    `,
                    isPremiumDark
                      ? 'text-violet-300'
                      : 'text-violet-600',
                  )}
                >
                  Premium Edition
                </p>
              </div>
            ) : (
              <p
                className="
                  truncate
                  text-[10px]
                  font-medium
                  text-gray-500
                  dark:text-gray-400
                "
              >
                Link Học Tập
              </p>
            )}
          </div>

          {/* CLOSE */}

          {/* Close button: mobile only. */}
          <button
              type="button"
              onClick={onClose}
              aria-label="Đóng menu"
              className={cn(
                `
                  relative
                  flex
                  h-9
                  w-9
                  flex-shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  transition-all
                  active:scale-95
                  lg:hidden
                `,
                isPremiumDark
                  ? `
                      text-violet-300
                      hover:bg-violet-500/10
                    `
                  : isPremiumSparkle
                    ? `
                        text-violet-500
                        hover:bg-violet-50
                      `
                    : `
                        text-gray-500
                        dark:text-gray-400
                        hover:bg-gray-100
                        dark:hover:bg-gray-700
                      `,
              )}
            >
              <X className="h-5 w-5" />
            </button>
        </div>

        {/* ===================================================
            PREMIUM STATUS
        ==================================================== */}

        {isPremium && (
          <div className="relative z-10 px-3 pt-3">
            <div
              className={cn(
                `
                  relative
                  overflow-hidden
                  rounded-2xl
                  border
                  px-3
                  py-2.5
                `,
                isPremiumDark
                  ? `
                      border-violet-500/20
                      bg-gradient-to-r
                      from-violet-500/10
                      via-fuchsia-500/10
                      to-indigo-500/10
                    `
                  : `
                      border-violet-200
                      bg-gradient-to-r
                      from-violet-50
                      via-fuchsia-50
                      to-indigo-50
                    `,
              )}
            >
              <div className="relative flex items-center gap-2.5">
                <div
                  className="
                    flex
                    h-8
                    w-8
                    flex-shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-gradient-to-br
                    from-amber-300
                    via-yellow-400
                    to-orange-400
                    shadow-[0_0_16px_rgba(251,191,36,0.35)]
                  "
                >
                  <Crown
                    className="h-4 w-4 text-white"
                    fill="currentColor"
                    strokeWidth={1.8}
                  />
                </div>

                <div className="min-w-0">
                  <p
                    className={cn(
                      `
                        truncate
                        text-[11px]
                        font-extrabold
                      `,
                      isPremiumDark
                        ? 'text-white'
                        : 'text-gray-800',
                    )}
                  >
                    Premium đang hoạt động
                  </p>

                  <p
                    className={cn(
                      `
                        text-[9px]
                        font-semibold
                      `,
                      isPremiumDark
                        ? 'text-violet-300'
                        : 'text-violet-600',
                    )}
                  >
                    {isPremiumDark
                      ? '🌙 Premium Dark'
                      : '✨ Premium Sparkle'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            MENU
        ==================================================== */}

        <nav
          className="
            relative
            z-10
            min-h-0
            flex-1
            space-y-1
            overflow-y-auto
            overscroll-contain
            p-3
            pb-[max(0.75rem,env(safe-area-inset-bottom))]
          "
        >
          <p
            className={cn(
              `
                px-3
                pb-2
                pt-3
                text-[10px]
                font-black
                uppercase
                tracking-[0.14em]
              `,
              isPremiumDark
                ? 'text-violet-300/50'
                : isPremiumSparkle
                  ? 'text-violet-400'
                  : 'text-gray-400 dark:text-gray-500',
            )}
          >
            {isPremium
              ? 'Premium Menu'
              : 'Menu'}
          </p>

          {menuItems.map((item) => {
            const Icon =
              iconMap[item.icon] ||
              Home

            const isBackup =
              item.path === '/backups'

            const isLeaderboard =
              item.path ===
              '/leaderboard'

            const isTimer =
              item.path === '/timer'

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => {
                  // On mobile this closes the drawer. On desktop, onClose
                  // is normally undefined, so nothing else is affected.
                  onClose?.()
                }}
                className={({ isActive }) =>
                  cn(
                    `
                      group
                      relative
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      px-3
                      py-2.5
                      text-sm
                      font-medium
                      transition-all
                      duration-200
                      active:scale-[0.98]
                    `,

                    /*
                     * ACTIVE
                     */

                    isActive
                      ? isPremiumDark
                        ? `
                            bg-gradient-to-r
                            from-violet-500/15
                            via-fuchsia-500/10
                            to-indigo-500/15
                            text-white
                            shadow-[0_4px_22px_rgba(139,92,246,0.12)]
                          `
                        : isPremiumSparkle
                          ? `
                              bg-gradient-to-r
                              from-violet-100
                              via-fuchsia-50
                              to-indigo-100
                              text-violet-700
                              shadow-[0_4px_20px_rgba(139,92,246,0.10)]
                            `
                          : `
                              bg-primary-50
                              dark:bg-primary-900/30
                              text-primary-700
                              dark:text-primary-300
                              shadow-sm
                            `
                      : isPremiumDark
                        ? `
                            text-slate-300
                            hover:bg-white/[0.045]
                            hover:text-white
                          `
                        : isPremiumSparkle
                          ? `
                              text-gray-600
                              hover:bg-violet-50/80
                              hover:text-violet-700
                            `
                          : `
                              text-gray-600
                              dark:text-gray-300
                              hover:bg-gray-50
                              dark:hover:bg-gray-700/50
                              hover:text-gray-900
                              dark:hover:text-gray-100
                            `,

                    /*
                     * BACKUP
                     */

                    isBackup &&
                      isPremium &&
                      (
                        isPremiumDark
                          ? `
                              bg-gradient-to-r
                              from-amber-500/[0.07]
                              via-violet-500/[0.08]
                              to-indigo-500/[0.08]
                            `
                          : `
                              bg-gradient-to-r
                              from-amber-50
                              via-violet-50
                              to-indigo-50
                            `
                      ),
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active indicator */}

                    {isActive && (
                      <span
                        className={cn(
                          `
                            absolute
                            left-0
                            top-1/2
                            h-6
                            w-1
                            -translate-y-1/2
                            rounded-r-full
                          `,
                          isPremium
                            ? `
                                bg-gradient-to-b
                                from-violet-400
                                via-fuchsia-400
                                to-indigo-500
                                shadow-[0_0_12px_rgba(168,85,247,0.7)]
                              `
                            : 'bg-primary-500',
                        )}
                      />
                    )}

                    {/* Icon */}

                    <span
                      className={cn(
                        `
                          relative
                          flex
                          h-9
                          w-9
                          flex-shrink-0
                          items-center
                          justify-center
                          rounded-lg
                          transition-all
                          duration-200
                        `,

                        isPremiumDark
                          ? isActive
                            ? `
                                bg-violet-500/15
                                text-violet-300
                              `
                            : `
                                bg-white/[0.045]
                                text-slate-400
                                group-hover:bg-violet-500/10
                                group-hover:text-violet-300
                              `
                          : isPremiumSparkle
                            ? isActive
                              ? `
                                  bg-gradient-to-br
                                  from-violet-100
                                  to-indigo-100
                                  text-violet-600
                                `
                              : `
                                  bg-violet-50
                                  text-violet-500
                                  group-hover:bg-white
                                `
                            : isActive
                              ? `
                                  bg-primary-100
                                  dark:bg-primary-800/50
                                  text-primary-600
                                  dark:text-primary-300
                                `
                              : `
                                  bg-gray-50
                                  dark:bg-gray-800
                                  text-gray-500
                                  dark:text-gray-400
                                `,

                        isBackup &&
                          `
                            text-amber-500
                          `,
                      )}
                    >
                      <Icon
                        className="h-[18px] w-[18px]"
                        strokeWidth={2}
                      />

                      {isBackup && (
                        <Sparkles
                          className="
                            absolute
                            -right-1
                            -top-1
                            h-3
                            w-3
                            text-amber-400
                            drop-shadow-[0_0_5px_rgba(251,191,36,0.7)]
                            animate-pulse
                          "
                          strokeWidth={2.5}
                        />
                      )}
                    </span>

                    {/* LABEL */}

                    <span
                      className={cn(
                        `
                          min-w-0
                          flex-1
                          truncate
                        `,
                        isPremium &&
                          isActive &&
                          `
                            font-extrabold
                          `,
                      )}
                    >
                      {item.label}
                    </span>

                    {/* BACKUP BADGE */}

                    {isBackup && (
                      <span
                        className={cn(
                          `
                            hidden
                            items-center
                            gap-1
                            rounded-full
                            px-2
                            py-0.5
                            text-[8px]
                            font-black
                            uppercase
                            tracking-wide
                            sm:inline-flex
                          `,
                          isPremiumDark
                            ? `
                                bg-amber-400/10
                                text-amber-300
                                border
                                border-amber-400/10
                              `
                            : `
                                bg-gradient-to-r
                                from-amber-100
                                to-violet-100
                                text-violet-700
                              `,
                        )}
                      >
                        <Crown
                          className="h-2.5 w-2.5"
                          fill="currentColor"
                        />
                        PRO
                      </span>
                    )}

                    {/* BXH */}

                    {isLeaderboard && (
                      <Trophy
                        className="
                          h-3.5
                          w-3.5
                          text-amber-400
                          opacity-70
                          transition-transform
                          group-hover:scale-110
                        "
                        strokeWidth={2}
                      />
                    )}

                    {/* TIMER */}

                    {isTimer && (
                      <span
                        className="
                          hidden
                          h-1.5
                          w-1.5
                          rounded-full
                          bg-emerald-400
                          opacity-70
                          sm:block
                        "
                      />
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* ===================================================
            FOOTER
        ==================================================== */}

        <div
          className={cn(
            `
              relative
              z-10
              flex-shrink-0
              border-t
              p-3
              sm:p-4
              pb-[max(0.75rem,env(safe-area-inset-bottom))]
            `,
            isPremiumDark
              ? 'border-violet-500/15'
              : isPremiumSparkle
                ? 'border-violet-100'
                : 'border-gray-100 dark:border-gray-700/60',
          )}
        >
          {isPremium ? (
            <div
              className={cn(
                `
                  relative
                  overflow-hidden
                  rounded-2xl
                  border
                  p-4
                  text-white
                `,
                isPremiumDark
                  ? `
                      border-violet-500/20
                      bg-gradient-to-br
                      from-[#12101f]
                      via-[#19152b]
                      to-[#0c1020]
                      shadow-[0_8px_35px_rgba(0,0,0,0.35)]
                    `
                  : `
                      border-violet-200/50
                      bg-gradient-to-br
                      from-violet-600
                      via-fuchsia-600
                      to-indigo-700
                      shadow-[0_8px_30px_rgba(124,58,237,0.25)]
                    `,
              )}
            >
              {/* Glow */}

              <div
                className="
                  pointer-events-none
                  absolute
                  -right-10
                  -top-10
                  h-28
                  w-28
                  rounded-full
                  bg-violet-400/15
                  blur-2xl
                "
              />

              <div
                className="
                  pointer-events-none
                  absolute
                  -bottom-12
                  -left-8
                  h-28
                  w-28
                  rounded-full
                  bg-fuchsia-400/10
                  blur-2xl
                "
              />

              {/* Sparkles */}

              <Sparkles
                className="
                  absolute
                  right-4
                  top-4
                  h-4
                  w-4
                  text-yellow-200/80
                  animate-pulse
                "
              />

              <Sparkles
                className="
                  absolute
                  bottom-5
                  right-12
                  h-2.5
                  w-2.5
                  text-violet-200/70
                "
              />

              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-lg
                      bg-white/10
                    "
                  >
                    {isPremiumDark ? (
                      <Moon
                        className="h-4 w-4 text-violet-200"
                        fill="currentColor"
                      />
                    ) : (
                      <Crown
                        className="h-4 w-4 text-yellow-200"
                        fill="currentColor"
                      />
                    )}
                  </span>

                  <div>
                    <p className="text-sm font-black">
                      Ngâu Hub Premium
                    </p>

                    <p className="text-[9px] font-semibold text-white/65">
                      {isPremiumDark
                        ? 'Premium Dark ✦'
                        : 'Premium Sparkle ✦'}
                    </p>
                  </div>
                </div>

                <p
                  className="
                    text-[10px]
                    font-medium
                    leading-relaxed
                    text-white/80
                  "
                >
                  {isPremiumDark ? (
                    <>
                      Phiên Bản 1.0.2
                      <br />
                      Cám Ơn Bạn Đã Sử Dụng Ứng Dụng - Ngâu Hub
                    </>
                  ) : (
                    <>
                      Phiên Bản 1.0.2
                      <br />
                      Cám Ơn Bạn Đã Sử Dụng Ứng Dụng - Ngâu Hub 
                    </>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div
              className="
                relative
                overflow-hidden
                rounded-2xl
                bg-gradient-to-br
                from-primary-500
                via-primary-600
                to-primary-700
                p-4
                text-white
                shadow-soft
              "
            >
              <div
                className="
                  pointer-events-none
                  absolute
                  -right-8
                  -top-8
                  h-24
                  w-24
                  rounded-full
                  bg-white/15
                  blur-2xl
                "
              />

              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="
                      flex
                      h-7
                      w-7
                      items-center
                      justify-center
                      rounded-lg
                      bg-white/15
                    "
                  >
                    <Sparkles
                      className="h-3.5 w-3.5"
                      strokeWidth={2}
                    />
                  </span>

                  <p className="text-sm font-bold">
                    Phiên Bản 1.0.2
                  </p>
                </div>

                <p
                  className="
                    text-[11px]
                    leading-relaxed
                    text-white/90
                  "
                >
                  Ứng Dụng Được Phát triển
                  Bởi Ngâu Penta Với Mục Đích
                  Lưu Và Tra Cứu Nhanh Kiến Thức :D
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )

  // Mobile drawer is portaled directly to <body>. This is intentional:
  // it prevents any parent transform/flex/overflow from changing the
  // fixed drawer's containing block on Android WebView.
  if (isMobile && typeof document !== 'undefined') {
    return createPortal(sidebarContent, document.body)
  }

  return sidebarContent
}