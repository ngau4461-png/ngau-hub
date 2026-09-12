import React, { useEffect, useMemo, useState } from 'react'
import { Menu, Sun, Moon, Search as SearchIcon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { cn, getInitials } from '@/utils/helpers'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { useNavigate, useLocation } from 'react-router-dom'

interface HeaderProps {
  onOpenSidebar: () => void
  globalSearch: string
  setGlobalSearch: (v: string) => void
}

interface UserProfile {
  username: string
  avatarUrl: string | null
  level: number
  exp: number
  lastCheckIn: string | null
}

const DEFAULT_PROFILE: UserProfile = {
  username: 'Người dùng',
  avatarUrl: null,
  level: 1,
  exp: 0,
  lastCheckIn: null,
}

/**
 * Lấy profile người dùng từ localStorage
 */
const loadUserProfile = (): UserProfile => {
  try {
    const saved = localStorage.getItem('user_profile')

    if (!saved) {
      return DEFAULT_PROFILE
    }

    const parsed = JSON.parse(saved)

    return {
      ...DEFAULT_PROFILE,
      ...parsed,
    }
  } catch {
    return DEFAULT_PROFILE
  }
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  globalSearch,
  setGlobalSearch,
}) => {
  const { isDark, toggleTheme } = useTheme()

  const navigate = useNavigate()
  const location = useLocation()

  /**
   * Profile hiện tại của tài khoản
   *
   * Lấy từ cùng một nguồn với Settings.tsx:
   * localStorage → user_profile
   */
  const [profile, setProfile] = useState<UserProfile>(() =>
    loadUserProfile()
  )

  /**
   * Đồng bộ Header khi Settings thay đổi tên/avatar.
   *
   * Event này được Settings.tsx phát ra sau khi lưu profile.
   */
  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfile(loadUserProfile())
    }

    window.addEventListener('user-profile-updated', handleProfileUpdate)

    return () => {
      window.removeEventListener(
        'user-profile-updated',
        handleProfileUpdate
      )
    }
  }, [])

  /**
   * Đồng bộ nếu localStorage được thay đổi từ tab/window khác.
   */
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'user_profile') {
        setProfile(loadUserProfile())
      }
    }

    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const isHomePage = location.pathname === '/'

  const showSearch = useMemo(
    () => !isHomePage,
    [isHomePage]
  )

  const displayName =
    profile.username?.trim() || 'Người dùng'

  const avatarUrl =
    profile.avatarUrl || null

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800/60 flex-shrink-0">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">

        {/* LEFT */}
        <div className="flex items-center gap-2 flex-1 min-w-0 lg:w-1/3">

          {/* NÚT MỞ SIDEBAR MOBILE */}
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Mở menu"
            className="
              lg:hidden
              flex items-center justify-center
              w-10 h-10
              flex-shrink-0
              rounded-xl
              text-gray-700 dark:text-gray-200
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              shadow-sm
              hover:bg-gray-100 dark:hover:bg-gray-700
              active:scale-95
              transition-all
            "
          >
            <Menu
              className="h-5 w-5"
              strokeWidth={2.5}
            />
          </button>

          {/* DESKTOP GREETING */}
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0 mr-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 hidden xl:block">
              Chào buổi{' '}
              {new Date().getHours() < 12
                ? 'sáng'
                : new Date().getHours() < 18
                  ? 'chiều'
                  : 'tối'}{' '}
              👋
            </h2>
          </div>

          {/* SEARCH */}
          {showSearch && (
            <div className="flex-1 max-w-xl min-w-0">
              <SearchBar
                value={globalSearch}
                onChange={setGlobalSearch}
                placeholder="Tìm tài liệu, môn học, thẻ tag..."
              />
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-1 sm:gap-2">

          {/* THEME */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Đổi theme"
            className="flex-shrink-0"
          >
            {isDark ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* MOBILE HOME */}
          {showSearch && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="md:hidden flex-shrink-0"
              aria-label="Về trang chủ"
            >
              <SearchIcon className="h-5 w-5" />
            </Button>
          )}

          {/* USER */}
          <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2 border-l border-gray-200 dark:border-gray-700 ml-1 sm:ml-2">

            {/* AVATAR */}
            <div
              className={cn(
                'flex items-center justify-center rounded-full font-semibold text-sm overflow-hidden',
                'h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0',
                'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-soft'
              )}
              title={displayName}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-xs sm:text-sm">
                  {getInitials(displayName)}
                </span>
              )}
            </div>

            {/* NAME */}
            <div className="hidden sm:block min-w-0 max-w-[120px] xl:max-w-[160px]">
              <p
                className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate"
                title={displayName}
              >
                {displayName}
              </p>

              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                Sinh viên
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}