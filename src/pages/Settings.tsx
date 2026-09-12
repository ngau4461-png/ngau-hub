import React, { useEffect, useRef, useState } from 'react'
import {
  Settings as SettingsIcon,
  User,
  Sun,
  Moon,
  Database,
  Download,
  Upload,
  Camera,
  Pencil,
  UserCircle,
  Award,
  CalendarCheck,
  LogIn,
  LogOut,
  Mail,
  Lock,
  Loader2,
  Trophy,
  RefreshCw,
  Crown,
  Sparkles,
  ShieldCheck,
  Zap,
  Star,
  ExternalLink,
  Check,
  KeyRound,
  Palette,
} from 'lucide-react'

import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'
import { downloadJSON, readJSONFile } from '@/utils/helpers'
import { supabase } from '@/utils/supabase/client'

interface UserProfile {
  id: string
  username: string
  avatar_url: string | null
  level: number
  exp: number
  coins: number
  last_check_in: string | null
}

type PremiumTheme = 'dark' | 'sparkle'

const PROFILE_SELECT =
  'id, username, avatar_url, level, exp, coins, last_check_in'

const PREMIUM_STORAGE_PREFIX =
  'studyhub_premium_v1_'

const PREMIUM_THEME_PREFIX =
  'studyhub_premium_theme_v1_'

const PREMIUM_ACTIVATION_CODE =
  'Ngau-Premium-QjkRb'

const PROFILE_CACHE_PREFIX =
  'studyhub_profile_cache_v1_'

const getProfileCacheKey = (userId: string) =>
  `${PROFILE_CACHE_PREFIX}${userId}`

const Settings: React.FC = () => {
  const { isDark, toggleTheme } = useTheme()
  const { showToast } = useToast()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] =
    useState<UserProfile | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checkingIn, setCheckingIn] =
    useState(false)
  const [profileError, setProfileError] =
    useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] =
    useState('')
  const [authLoading, setAuthLoading] =
    useState(false)

  const [isRegister, setIsRegister] =
    useState(false)

  const [editMode, setEditMode] =
    useState(false)
  const [tempName, setTempName] =
    useState('')

  const [isPremium, setIsPremium] =
    useState(false)

  const [premiumAnimating, setPremiumAnimating] =
    useState(false)

  const [premiumCode, setPremiumCode] =
    useState('')

  const [premiumActivating, setPremiumActivating] =
    useState(false)

  const [premiumTheme, setPremiumTheme] =
    useState<PremiumTheme>('dark')

  const fileInputRef =
    useRef<HTMLInputElement>(null)

  // =========================================================
  // PREMIUM
  // =========================================================

  const getPremiumStorageKey = (
    userId: string
  ) =>
    `${PREMIUM_STORAGE_PREFIX}${userId}`

  const getPremiumThemeStorageKey = (
    userId: string
  ) =>
    `${PREMIUM_THEME_PREFIX}${userId}`

  const loadPremiumState = (
    userId: string
  ) => {
    try {
      const premiumValue =
        localStorage.getItem(
          getPremiumStorageKey(userId)
        )

      const active = premiumValue === 'true'
      setIsPremium(active)

      const savedTheme =
        localStorage.getItem(
          getPremiumThemeStorageKey(
            userId
          )
        )

      const theme: PremiumTheme =
        savedTheme === 'sparkle' ? 'sparkle' : 'dark'

      setPremiumTheme(theme)

      // Đồng bộ Premium Dark/Sparkle với theme gốc của toàn app.
      if (active && theme === 'dark' && !isDark) {
        toggleTheme()
      } else if (active && theme === 'sparkle' && isDark) {
        toggleTheme()
      }
    } catch (error) {
      console.error(
        'Không thể tải trạng thái Premium:',
        error
      )

      setIsPremium(false)
      setPremiumTheme('dark')
    }
  }

  const handleActivatePremium = () => {
    if (!user) {
      showToast(
        'error',
        'Vui lòng đăng nhập để kích hoạt Premium'
      )
      return
    }

    const code =
      premiumCode.trim()

    if (!code) {
      showToast(
        'error',
        'Vui lòng nhập mã kích hoạt Premium'
      )
      return
    }

    if (
      code !== PREMIUM_ACTIVATION_CODE
    ) {
      showToast(
        'error',
        'Mã Premium không hợp lệ'
      )
      return
    }

    setPremiumActivating(true)

    try {
      localStorage.setItem(
        getPremiumStorageKey(
          user.id
        ),
        'true'
      )

      localStorage.setItem(
        getPremiumThemeStorageKey(
          user.id
        ),
        premiumTheme
      )

      // Khi kích hoạt, áp dụng theme Premium ngay cho toàn ứng dụng.
      if (premiumTheme === 'dark' && !isDark) {
        toggleTheme()
      } else if (premiumTheme === 'sparkle' && isDark) {
        toggleTheme()
      }

      setIsPremium(true)
      setPremiumCode('')
      setPremiumAnimating(true)

      window.setTimeout(() => {
        setPremiumAnimating(false)
      }, 1400)

      showToast(
        'success',
        '✨ Chúc mừng! Premium đã được kích hoạt!'
      )
    } catch (error) {
      console.error(
        'Không thể kích hoạt Premium:',
        error
      )

      showToast(
        'error',
        'Không thể lưu trạng thái Premium'
      )
    } finally {
      setPremiumActivating(false)
    }
  }

  const handlePremiumThemeChange = (
    theme: PremiumTheme
  ) => {
    if (!user || !isPremium) {
      return
    }

    try {
      // Premium Dark/Sparkle đồng bộ luôn với theme toàn app.
      // Nhờ vậy Sidebar và các trang dùng dark: sẽ đổi theo ngay lập tức.
      if (theme === 'dark' && !isDark) {
        toggleTheme()
      } else if (theme === 'sparkle' && isDark) {
        toggleTheme()
      }

      localStorage.setItem(
        getPremiumThemeStorageKey(
          user.id
        ),
        theme
      )

      setPremiumTheme(theme)

      showToast(
        'success',
        theme === 'dark'
          ? '🌙 Đã chọn Premium Dark'
          : '✨ Đã chọn Premium Sparkle'
      )
    } catch (error) {
      console.error(
        'Không thể lưu chủ đề Premium:',
        error
      )
    }
  }

  const handleDisablePremium = () => {
    if (!user) {
      return
    }

    try {
      localStorage.removeItem(
        getPremiumStorageKey(
          user.id
        )
      )

      setIsPremium(false)
      setPremiumCode('')
      setPremiumTheme('dark')

      showToast(
        'info',
        'Premium đã được tắt'
      )
    } catch (error) {
      console.error(
        'Không thể tắt Premium:',
        error
      )

      showToast(
        'error',
        'Không thể thay đổi Premium'
      )
    }
  }

  useEffect(() => {
    if (user?.id) {
      loadPremiumState(user.id)
    } else {
      setIsPremium(false)
      setPremiumCode('')
      setPremiumTheme('dark')
    }
  }, [user?.id])

  // =========================================================
  // AVATAR MẶC ĐỊNH
  // =========================================================

  const createDefaultAvatar = (
    name: string
  ) => {
    const safeName =
      name.trim() || 'Người dùng'

    const initials =
      safeName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) =>
          part
            .charAt(0)
            .toUpperCase()
        )
        .join('') || 'U'

    const svg = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="256"
        height="256"
        viewBox="0 0 256 256"
      >
        <rect
          width="256"
          height="256"
          rx="128"
          fill="#2563eb"
        />

        <text
          x="128"
          y="145"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="86"
          font-weight="700"
          fill="white"
        >
          ${initials}
        </text>
      </svg>
    `

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
  }

  // =========================================================
  // CACHE PROFILE LOCAL
  // =========================================================

  const saveProfileCache = (
    profileData: UserProfile
  ) => {
    try {
      localStorage.setItem(
        getProfileCacheKey(profileData.id),
        JSON.stringify(profileData)
      )
    } catch (error) {
      console.warn(
        'Không thể lưu profile cache:',
        error
      )
    }
  }

  const loadProfileCache = (
    userId: string
  ): UserProfile | null => {
    try {
      const cached =
        localStorage.getItem(
          getProfileCacheKey(userId)
        )

      if (!cached) {
        return null
      }

      const parsed =
        JSON.parse(cached)

      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !parsed.id ||
        parsed.id !== userId ||
        !parsed.username
      ) {
        return null
      }

      return {
        id: userId,
        username:
          String(parsed.username),
        avatar_url:
          parsed.avatar_url ?? null,
        level:
          Number(parsed.level) || 1,
        exp:
          Number(parsed.exp) || 0,
        coins:
          Number(parsed.coins) || 0,
        last_check_in:
          parsed.last_check_in ?? null,
      }
    } catch (error) {
      console.warn(
        'Không thể đọc profile cache:',
        error
      )
      return null
    }
  }

  // =========================================================
  // TẢI PROFILE TỪ SUPABASE
  // =========================================================

  const loadProfile = async (
    userId: string,
    authUser?: any
  ): Promise<UserProfile | null> => {
    try {
      setProfileError('')

      const {
        data,
        error,
      } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error(
          'Lỗi lấy profile:',
          error
        )

        setProfileError(
          error.message
        )

        return null
      }

      if (data) {
        let currentProfile =
          data as UserProfile

        if (!currentProfile.avatar_url) {
          const defaultAvatar =
            createDefaultAvatar(
              currentProfile.username ||
                'Người dùng'
            )

          const {
            data: avatarUpdated,
            error: avatarError,
          } = await supabase
            .from('profiles')
            .update({
              avatar_url:
                defaultAvatar,
              updated_at:
                new Date().toISOString(),
            })
            .eq('id', userId)
            .select(PROFILE_SELECT)
            .single()

          if (
            !avatarError &&
            avatarUpdated
          ) {
            currentProfile =
              avatarUpdated as UserProfile
          } else if (
            avatarError
          ) {
            console.warn(
              'Không thể lưu avatar mặc định:',
              avatarError
            )
          }
        }

        currentProfile.coins =
          Number(
            currentProfile.coins
          ) || 0

        saveProfileCache(
          currentProfile
        )

        setProfile(
          currentProfile
        )

        setTempName(
          currentProfile.username ||
            'Người dùng'
        )

        return currentProfile
      }

      const displayName =
        authUser?.user_metadata
          ?.full_name?.trim() ||
        authUser?.user_metadata
          ?.name?.trim() ||
        authUser?.email
          ?.split('@')[0]
          ?.trim() ||
        'Người dùng'

      const newProfile = {
        id: userId,
        username: displayName,
        avatar_url:
          createDefaultAvatar(
            displayName
          ),
        level: 1,
        exp: 0,
        coins: 0,
        last_check_in: null,
      }

      const {
        data: created,
        error: createError,
      } = await supabase
        .from('profiles')
        .upsert(
          newProfile,
          {
            onConflict: 'id',
          }
        )
        .select(PROFILE_SELECT)
        .single()

      if (createError) {
        console.error(
          'Lỗi tạo profile:',
          createError
        )

        setProfileError(
          createError.message
        )

        return null
      }

      const createdProfile =
        created as UserProfile

      createdProfile.coins =
        Number(
          createdProfile.coins
        ) || 0

      saveProfileCache(
        createdProfile
      )

      setProfile(
        createdProfile
      )

      setTempName(
        createdProfile.username ||
          displayName
      )

      return createdProfile
    } catch (error: any) {
      console.error(
        'loadProfile error:',
        error
      )

      setProfileError(
        error?.message ||
          'Không thể tải hồ sơ người dùng'
      )

      return null
    }
  }

  // =========================================================
  // KIỂM TRA ĐĂNG NHẬP + CACHE-FIRST
  // =========================================================

  useEffect(() => {
    let mounted = true

    const applyUserImmediately = (
      currentUser: any
    ) => {
      if (!mounted) return

      setUser(currentUser)

      if (!currentUser) {
        setProfile(null)
        setProfileError('')
        setIsPremium(false)
        setPremiumCode('')
        setPremiumTheme('dark')
        setLoading(false)
        return
      }

      // Hiển thị dữ liệu local ngay, không chờ mạng.
      const cachedProfile =
        loadProfileCache(currentUser.id)

      if (cachedProfile) {
        setProfile(cachedProfile)
        setTempName(
          cachedProfile.username ||
            'Người dùng'
        )
        setProfileError('')
        setLoading(false)
      }
    }

    const refreshProfileInBackground = async (
      currentUser: any
    ) => {
      if (!mounted || !currentUser) {
        return
      }

      try {
        await loadProfile(
          currentUser.id,
          currentUser
        )
      } catch (error) {
        console.error(
          'Lỗi đồng bộ profile nền:',
          error
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    const initialize =
      async () => {
        try {
          // getSession đọc session đã lưu trên máy,
          // nhanh hơn việc bắt buộc xác thực mạng trước khi render.
          const {
            data: {
              session,
            },
            error,
          } =
            await supabase.auth.getSession()

          if (error) {
            console.error(
              'Lỗi lấy session:',
              error
            )
          }

          const currentUser =
            session?.user ?? null

          applyUserImmediately(
            currentUser
          )

          if (currentUser) {
            void refreshProfileInBackground(
              currentUser
            )
          } else if (mounted) {
            setLoading(false)
          }
        } catch (error) {
          console.error(
            'Lỗi khởi tạo tài khoản:',
            error
          )

          if (mounted) {
            setLoading(false)
          }
        }
      }

    void initialize()

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) return

          const currentUser =
            session?.user ?? null

          applyUserImmediately(
            currentUser
          )

          if (currentUser) {
            // Đồng bộ server ở nền, không chặn giao diện.
            window.setTimeout(() => {
              if (!mounted) return

              void refreshProfileInBackground(
                currentUser
              )
            }, 0)
          }
        }
      )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // =========================================================
  // ĐĂNG NHẬP / ĐĂNG KÝ
  // =========================================================

  const handleAuth = async () => {
    const cleanEmail =
      email.trim()

    if (!cleanEmail) {
      showToast(
        'error',
        'Vui lòng nhập email'
      )
      return
    }

    if (!password) {
      showToast(
        'error',
        'Vui lòng nhập mật khẩu'
      )
      return
    }

    if (password.length < 6) {
      showToast(
        'error',
        'Mật khẩu phải có ít nhất 6 ký tự'
      )
      return
    }

    setAuthLoading(true)

    try {
      if (isRegister) {
        const {
          data,
          error,
        } =
          await supabase.auth.signUp({
            email: cleanEmail,
            password,
          })

        if (error) {
          showToast(
            'error',
            error.message
          )
          return
        }

        if (data.user) {
          showToast(
            'success',
            'Đăng ký thành công! Hãy kiểm tra email nếu Supabase yêu cầu xác nhận.'
          )

          if (
            data.session &&
            data.user
          ) {
            setUser(data.user)

            await loadProfile(
              data.user.id,
              data.user
            )
          }
        }
      } else {
        const {
          data,
          error,
        } =
          await supabase.auth.signInWithPassword(
            {
              email: cleanEmail,
              password,
            }
          )

        if (error) {
          showToast(
            'error',
            'Email hoặc mật khẩu không đúng'
          )
          return
        }

        if (data.user) {
          setUser(data.user)
          setProfile(null)

          await loadProfile(
            data.user.id,
            data.user
          )
        }

        showToast(
          'success',
          'Đăng nhập thành công!'
        )
      }

      setPassword('')
    } catch (error) {
      console.error(error)

      showToast(
        'error',
        'Có lỗi xảy ra. Vui lòng thử lại.'
      )
    } finally {
      setAuthLoading(false)
      setLoading(false)
    }
  }

  // =========================================================
  // ĐĂNG XUẤT
  // =========================================================

  const handleLogout = async () => {
    try {
      const { error } =
        await supabase.auth.signOut()

      if (error) {
        showToast(
          'error',
          error.message
        )
        return
      }

      setUser(null)
      setProfile(null)
      setProfileError('')
      setEditMode(false)
      setTempName('')
      setIsPremium(false)
      setPremiumCode('')
      setPremiumTheme('dark')

      showToast(
        'success',
        'Đã đăng xuất'
      )
    } catch (error) {
      console.error(error)

      showToast(
        'error',
        'Không thể đăng xuất'
      )
    }
  }

  // =========================================================
  // TẢI LẠI PROFILE
  // =========================================================

  const handleRefreshProfile =
    async () => {
      if (!user) return

      setSaving(true)

      try {
        const updatedProfile =
          await loadProfile(
            user.id,
            user
          )

        if (updatedProfile) {
          showToast(
            'success',
            'Đã đồng bộ hồ sơ từ máy chủ'
          )
        } else {
          showToast(
            'error',
            'Không thể tải hồ sơ'
          )
        }
      } finally {
        setSaving(false)
      }
    }

  // =========================================================
  // AVATAR
  // =========================================================

  const handleAvatarUpload =
    async (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        e.target.files?.[0]

      if (
        !file ||
        !user ||
        !profile
      ) {
        return
      }

      if (
        !file.type.startsWith(
          'image/'
        )
      ) {
        showToast(
          'error',
          'Vui lòng chọn file ảnh'
        )

        e.target.value = ''
        return
      }

      if (
        file.size >
        2 * 1024 * 1024
      ) {
        showToast(
          'error',
          'Ảnh không được vượt quá 2MB'
        )

        e.target.value = ''
        return
      }

      setSaving(true)

      try {
        const dataUrl =
          await new Promise<string>(
            (
              resolve,
              reject
            ) => {
              const reader =
                new FileReader()

              reader.onload =
                () => {
                  const result =
                    reader.result

                  if (
                    typeof result ===
                    'string'
                  ) {
                    resolve(
                      result
                    )
                  } else {
                    reject(
                      new Error(
                        'Không đọc được ảnh'
                      )
                    )
                  }
                }

              reader.onerror =
                () => {
                  reject(
                    new Error(
                      'Không đọc được ảnh'
                    )
                  )
                }

              reader.readAsDataURL(
                file
              )
            }
          )

        const {
          data,
          error,
        } =
          await supabase
            .from('profiles')
            .update({
              avatar_url:
                dataUrl,
              updated_at:
                new Date().toISOString(),
            })
            .eq('id', user.id)
            .select(
              PROFILE_SELECT
            )
            .single()

        if (error) {
          console.error(
            'Lỗi cập nhật avatar:',
            error
          )

          showToast(
            'error',
            'Không thể cập nhật avatar: ' +
              error.message
          )

          return
        }

        if (data) {
          const updatedProfile =
            data as UserProfile

          saveProfileCache(
            updatedProfile
          )

          setProfile(
            updatedProfile
          )

          setTempName(
            updatedProfile.username
          )

          showToast(
            'success',
            'Cập nhật avatar thành công!'
          )
        }
      } catch (error) {
        console.error(error)

        showToast(
          'error',
          'Không thể đọc ảnh'
        )
      } finally {
        setSaving(false)

        if (fileInputRef.current) {
          fileInputRef.current.value =
            ''
        }
      }
    }

  // =========================================================
  // ĐỔI TÊN
  // =========================================================

  const handleSaveName =
    async () => {
      if (!user || !profile) {
        return
      }

      const name =
        tempName.trim()

      if (!name) {
        showToast(
          'error',
          'Tên không được để trống'
        )
        return
      }

      if (name.length > 30) {
        showToast(
          'error',
          'Tên tối đa 30 ký tự'
        )
        return
      }

      setSaving(true)

      try {
        const {
          data,
          error,
        } =
          await supabase
            .from('profiles')
            .update({
              username: name,
              updated_at:
                new Date().toISOString(),
            })
            .eq('id', user.id)
            .select(
              PROFILE_SELECT
            )
            .single()

        if (error) {
          console.error(
            'Lỗi cập nhật tên:',
            error
          )

          showToast(
            'error',
            'Không thể cập nhật tên: ' +
              error.message
          )

          return
        }

        if (data) {
          const updatedProfile =
            data as UserProfile

          saveProfileCache(
            updatedProfile
          )

          setProfile(
            updatedProfile
          )

          setTempName(
            updatedProfile.username
          )

          setEditMode(false)

          showToast(
            'success',
            'Cập nhật tên thành công!'
          )
        }
      } catch (error) {
        console.error(error)

        showToast(
          'error',
          'Không thể cập nhật tên'
        )
      } finally {
        setSaving(false)
      }
    }

  // =========================================================
  // NGÀY HÔM NAY
  // =========================================================

  const getToday = () => {
    const now = new Date()

    const year =
      now.getFullYear()

    const month =
      String(
        now.getMonth() + 1
      ).padStart(2, '0')

    const day =
      String(
        now.getDate()
      ).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  // =========================================================
  // ĐIỂM DANH
  // =========================================================

  const canCheckIn =
    !!profile &&
    profile.last_check_in !==
      getToday()

  const handleCheckIn =
    async () => {
      if (!user || !profile) {
        return
      }

      if (!canCheckIn) {
        showToast(
          'info',
          'Hôm nay bạn đã điểm danh rồi!'
        )
        return
      }

      setCheckingIn(true)

      try {
        let newExp =
          Number(profile.exp) +
          10

        let newLevel =
          Number(profile.level) ||
          1

        while (
          newExp >=
          newLevel * 10
        ) {
          newExp -=
            newLevel * 10

          newLevel += 1
        }

        const today =
          getToday()

        const {
          data,
          error,
        } =
          await supabase
            .from('profiles')
            .update({
              level: newLevel,
              exp: newExp,
              last_check_in:
                today,
              updated_at:
                new Date().toISOString(),
            })
            .eq('id', user.id)
            .select(
              PROFILE_SELECT
            )
            .single()

        if (error) {
          console.error(
            'Lỗi điểm danh:',
            error
          )

          showToast(
            'error',
            'Không thể điểm danh: ' +
              error.message
          )

          return
        }

        if (data) {
          const updatedProfile =
            data as UserProfile

          saveProfileCache(
            updatedProfile
          )

          setProfile(
            updatedProfile
          )

          setTempName(
            updatedProfile.username
          )

          if (
            newLevel >
            profile.level
          ) {
            showToast(
              'success',
              `🎉 Lên cấp ${newLevel}! Bạn nhận được 10 EXP!`
            )
          } else {
            showToast(
              'success',
              '🎁 Điểm danh thành công! Bạn nhận được 10 EXP!'
            )
          }
        }
      } catch (error) {
        console.error(error)

        showToast(
          'error',
          'Không thể điểm danh'
        )
      } finally {
        setCheckingIn(false)
      }
    }

  // =========================================================
  // XUẤT DỮ LIỆU
  // =========================================================

  const handleExport = () => {
    try {
      const data = {
        profile,
        exportedAt:
          new Date().toISOString(),
      }

      downloadJSON(
        data,
        'studyhub-backup.json'
      )

      showToast(
        'success',
        'Đã xuất dữ liệu thành công'
      )
    } catch (error) {
      console.error(error)

      showToast(
        'error',
        'Không thể xuất dữ liệu'
      )
    }
  }

  // =========================================================
  // NHẬP DỮ LIỆU
  // =========================================================

  const handleImport =
    async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0]

      if (!file || !user) {
        return
      }

      try {
        const data =
          await readJSONFile(file)

        if (
          typeof data !==
            'object' ||
          data === null ||
          !('profile' in data)
        ) {
          throw new Error(
            'invalid'
          )
        }

        const importedProfile =
          (
            data as {
              profile: UserProfile
            }
          ).profile

        if (
          !importedProfile ||
          !importedProfile.username
        ) {
          throw new Error(
            'invalid'
          )
        }

        const {
          data: updated,
          error,
        } =
          await supabase
            .from('profiles')
            .update({
              username:
                importedProfile.username,

              avatar_url:
                importedProfile.avatar_url ??
                null,

              level:
                Number(
                  importedProfile.level
                ) || 1,

              exp:
                Number(
                  importedProfile.exp
                ) || 0,

              coins:
                Number(
                  importedProfile.coins
                ) || 0,

              last_check_in:
                importedProfile.last_check_in ??
                null,

              updated_at:
                new Date().toISOString(),
            })
            .eq('id', user.id)
            .select(
              PROFILE_SELECT
            )
            .single()

        if (error) {
          console.error(error)
          throw error
        }

        if (updated) {
          const updatedProfile =
            updated as UserProfile

          saveProfileCache(
            updatedProfile
          )

          setProfile(
            updatedProfile
          )

          setTempName(
            updatedProfile.username
          )

          showToast(
            'success',
            'Đã nhập dữ liệu thành công'
          )
        }
      } catch (error) {
        console.error(error)

        showToast(
          'error',
          'File JSON không hợp lệ'
        )
      } finally {
        event.target.value = ''
      }
    }

  // =========================================================
  // EXP
  // =========================================================

  const expToNextLevel =
    profile
      ? Math.max(
          Number(profile.level) *
            10,
          10
        )
      : 10

  const expPercent =
    profile
      ? Math.min(
          Math.max(
            (Number(profile.exp) /
              expToNextLevel) *
              100,
            0
          ),
          100
        )
      : 0

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải tài khoản...
        </div>
      </div>
    )
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      className={`
        relative space-y-6 lg:space-y-8
        ${
          isPremium &&
          premiumTheme === 'sparkle'
            ? 'premium-sparkle-page'
            : ''
        }
        ${
          isPremium && premiumTheme === 'dark'
            ? 'bg-[#060817] text-white rounded-[28px] p-2 sm:p-3'
            : ''
        }
        ${
          isPremium && premiumTheme === 'dark'
            ? 'premium-dark-app'
            : ''
        }
      `}
    >

      {/* =====================================================
          PREMIUM GLOBAL BACKDROP
      ===================================================== */}
      {isPremium && (
        <div
          className={`pointer-events-none fixed inset-0 z-[-1] ${
            premiumTheme === 'dark'
              ? 'bg-[#060817]'
              : 'bg-[radial-gradient(circle_at_15%_10%,rgba(251,191,36,.10),transparent_25%),radial-gradient(circle_at_85%_15%,rgba(236,72,153,.10),transparent_28%),radial-gradient(circle_at_50%_90%,rgba(139,92,246,.08),transparent_30%)]'
          }`}
        />
      )}

      {/* =====================================================
          PREMIUM GLOBAL EFFECT
      ===================================================== */}

      {isPremium && (
        <style>
          {`
            @keyframes premiumGradient {
              0% {
                background-position: 0% 50%;
              }

              50% {
                background-position: 100% 50%;
              }

              100% {
                background-position: 0% 50%;
              }
            }

            @keyframes premiumGlow {
              0%,
              100% {
                opacity: 0.35;
                transform: scale(1);
              }

              50% {
                opacity: 0.75;
                transform: scale(1.08);
              }
            }

            @keyframes premiumSparkle {
              0% {
                transform:
                  translateY(0)
                  rotate(0deg)
                  scale(0.7);
                opacity: 0;
              }

              20% {
                opacity: 1;
              }

              80% {
                opacity: 1;
              }

              100% {
                transform:
                  translateY(-100px)
                  rotate(180deg)
                  scale(1.3);
                opacity: 0;
              }
            }

            @keyframes premiumShine {
              0% {
                transform: translateX(-120%);
              }

              100% {
                transform: translateX(120%);
              }
            }

            @keyframes premiumPulse {
              0%,
              100% {
                box-shadow:
                  0 0 0
                    rgba(168, 85, 247, 0),
                  0 0 25px
                    rgba(168, 85, 247, 0.15);
              }

              50% {
                box-shadow:
                  0 0 40px
                    rgba(168, 85, 247, 0.25),
                  0 0 80px
                    rgba(59, 130, 246, 0.15);
              }
            }

            @keyframes premiumLight {
              0% {
                transform:
                  translate3d(-10%, -5%, 0)
                  scale(1);
                opacity: 0.35;
              }

              50% {
                transform:
                  translate3d(10%, 5%, 0)
                  scale(1.12);
                opacity: 0.65;
              }

              100% {
                transform:
                  translate3d(-10%, -5%, 0)
                  scale(1);
                opacity: 0.35;
              }
            }

            .premium-page-glow {
              position: fixed;
              pointer-events: none;
              z-index: 0;
              width: 420px;
              height: 420px;
              border-radius: 9999px;
              filter: blur(90px);
              background:
                linear-gradient(
                  135deg,
                  rgba(236, 72, 153, 0.28),
                  rgba(168, 85, 247, 0.28),
                  rgba(59, 130, 246, 0.25),
                  rgba(6, 182, 212, 0.22)
                );
              background-size: 300% 300%;
              animation:
                premiumGradient 8s ease infinite,
                premiumGlow 5s ease-in-out infinite;
              opacity: 0.45;
            }

            .premium-sparkle-page::before {
              content: "";
              position: fixed;
              inset: 0;
              pointer-events: none;
              z-index: 0;
              background:
                radial-gradient(
                  circle at 10% 15%,
                  rgba(251, 191, 36, 0.08),
                  transparent 25%
                ),
                radial-gradient(
                  circle at 85% 20%,
                  rgba(236, 72, 153, 0.08),
                  transparent 28%
                ),
                radial-gradient(
                  circle at 50% 90%,
                  rgba(59, 130, 246, 0.08),
                  transparent 30%
                );
              animation:
                premiumLight 8s ease-in-out infinite;
            }

            .premium-card {
              position: relative;
              overflow: hidden;
              background:
                linear-gradient(
                  135deg,
                  rgba(236, 72, 153, 0.12),
                  rgba(168, 85, 247, 0.12),
                  rgba(59, 130, 246, 0.12),
                  rgba(6, 182, 212, 0.10)
                );
              background-size: 300% 300%;
              animation:
                premiumGradient 9s ease infinite,
                premiumPulse 5s ease-in-out infinite;
            }

            .premium-card::before {
              content: "";
              position: absolute;
              inset: 0;
              background:
                radial-gradient(
                  circle at 15% 20%,
                  rgba(255,255,255,0.20),
                  transparent 25%
                ),
                radial-gradient(
                  circle at 85% 80%,
                  rgba(255,255,255,0.16),
                  transparent 25%
                );
              pointer-events: none;
            }

            .premium-shine {
              position: absolute;
              inset: 0;
              width: 35%;
              background:
                linear-gradient(
                  90deg,
                  transparent,
                  rgba(255,255,255,0.30),
                  transparent
                );
              transform: translateX(-120%);
              animation:
                premiumShine 5s ease-in-out infinite;
              pointer-events: none;
            }

            .premium-sparkle {
              position: absolute;
              width: 5px;
              height: 5px;
              border-radius: 9999px;
              background: white;
              box-shadow:
                0 0 6px white,
                0 0 14px rgba(168,85,247,0.9);
              animation:
                premiumSparkle 3.5s ease-in-out infinite;
              pointer-events: none;
            }

            .premium-badge {
              background:
                linear-gradient(
                  135deg,
                  #f59e0b,
                  #ec4899,
                  #8b5cf6,
                  #3b82f6
                );
              background-size: 250% 250%;
              animation:
                premiumGradient 5s ease infinite;
              box-shadow:
                0 0 18px
                  rgba(168,85,247,0.45);
            }

            .premium-button {
              background:
                linear-gradient(
                  135deg,
                  #f59e0b,
                  #ec4899,
                  #8b5cf6,
                  #3b82f6
                );
              background-size: 300% 300%;
              animation:
                premiumGradient 5s ease infinite;
              box-shadow:
                0 8px 30px
                  rgba(168,85,247,0.25);
            }

            .premium-button:hover {
              box-shadow:
                0 10px 40px
                  rgba(168,85,247,0.40);
              transform:
                translateY(-1px);
            }

            .premium-activated {
              animation:
                premiumPulse 1.4s ease-in-out;
            }


            .premium-dark-app {
              color-scheme: dark;
            }

            .premium-dark-app,
            .premium-dark-app * {
              -webkit-font-smoothing: antialiased;
            }

            .premium-dark-app .premium-card {
              border-color: rgba(168,85,247,.42) !important;
              background:
                radial-gradient(circle at 10% 10%, rgba(168,85,247,.18), transparent 30%),
                radial-gradient(circle at 90% 20%, rgba(59,130,246,.12), transparent 30%),
                linear-gradient(145deg, rgba(15,18,35,.98), rgba(7,9,20,.98));
            }

            .premium-dark-app .premium-theme-card {
              background: rgba(3,5,14,.92) !important;
            }

            .premium-dark-app .premium-theme-card:hover {
              box-shadow: 0 16px 50px rgba(139,92,246,.18);
            }

            .premium-theme-card {
              transition:
                transform 200ms ease,
                box-shadow 200ms ease,
                border-color 200ms ease;
            }

            .premium-theme-card:hover {
              transform: translateY(-2px);
            }
          `}
        </style>
      )}

      {isPremium && (
        <>
          <div
            className="premium-page-glow"
            style={{
              top: '8%',
              left: '-140px',
            }}
          />

          <div
            className="premium-page-glow"
            style={{
              right: '-160px',
              bottom: '10%',
              animationDelay: '-2s',
            }}
          />
        </>
      )}

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="relative z-10">
        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
            <SettingsIcon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">

              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Cài đặt
              </h1>

              {isPremium && (
                <span className="premium-badge inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black text-white">
                  <Crown className="h-3.5 w-3.5" />
                  PREMIUM
                </span>
              )}

            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Quản lý tài khoản, hồ sơ và thiết lập NgâuHub
            </p>
          </div>

        </div>
      </div>

      {/* =====================================================
          TÀI KHOẢN
      ===================================================== */}

      <section className="relative z-10 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-700 dark:bg-gray-800">

        <div className="border-b border-gray-100 p-5 dark:border-gray-700 sm:p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">

              {user ? (
                <User className="h-5 w-5" />
              ) : (
                <LogIn className="h-5 w-5" />
              )}

            </div>

            <div>

              <h2 className="font-bold text-gray-900 dark:text-gray-100">
                Tài khoản
              </h2>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user
                  ? 'Tài khoản của bạn đang được đồng bộ với Supabase'
                  : 'Đăng nhập để đồng bộ dữ liệu và tham gia bảng xếp hạng'}
              </p>

            </div>

          </div>

        </div>

        <div className="p-5 sm:p-6">

          {!user ? (

            <div className="mx-auto max-w-md space-y-4">

              <div>

                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Email
                </label>

                <div className="relative">

                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key ===
                        'Enter'
                      ) {
                        handleAuth()
                      }
                    }}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />

                </div>

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Mật khẩu
                </label>

                <div className="relative">

                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key ===
                        'Enter'
                      ) {
                        handleAuth()
                      }
                    }}
                    placeholder="Ít nhất 6 ký tự"
                    className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />

                </div>

              </div>

              <button
                type="button"
                disabled={authLoading}
                onClick={handleAuth}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {authLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    {isRegister
                      ? 'Đăng ký tài khoản'
                      : 'Đăng nhập'}
                  </>
                )}

              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRegister(
                    !isRegister
                  )

                  setPassword('')
                }}
                className="w-full text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                {isRegister
                  ? 'Đã có tài khoản? Đăng nhập'
                  : 'Chưa có tài khoản? Đăng ký'}
              </button>

            </div>

          ) : (

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">

                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6" />
                  )}

                </div>

                <div>

                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {profile?.username ||
                      'Người dùng'}
                  </p>

                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                  </p>

                </div>

              </div>

              <div className="flex flex-col gap-2 sm:flex-row">

                <button
                  type="button"
                  disabled={saving}
                  onClick={
                    handleRefreshProfile
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-100 dark:hover:bg-gray-700"
                >

                  <RefreshCw
                    className={`h-4 w-4 ${
                      saving
                        ? 'animate-spin'
                        : ''
                    }`}
                  />

                  Đồng bộ

                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                >

                  <LogOut className="h-4 w-4" />

                  Đăng xuất

                </button>

              </div>

            </div>

          )}

          {!user && (
            <div className="mt-5 flex items-start gap-3 rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">

              <Trophy className="mt-0.5 h-5 w-5 shrink-0" />

              <p>
                Đăng nhập để lưu Level/EXP/Xu lên máy chủ và xuất hiện trên bảng xếp hạng NgâuHub.
              </p>

            </div>
          )}

          {user && profileError && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">

              <p className="font-semibold">
                Không thể tải hồ sơ từ Supabase.
              </p>

              <p className="mt-1 break-words">
                {profileError}
              </p>

              <p className="mt-2">
                Kiểm tra bảng <strong>profiles</strong> và quyền RLS trong Supabase.
              </p>

            </div>
          )}

        </div>

      </section>

      {/* =====================================================
          PREMIUM
      ===================================================== */}

      {user && (
        <section
          className={`
            relative z-10 overflow-hidden rounded-3xl
            border shadow-soft
            transition-all duration-700
            ${
              isPremium
                ? 'premium-card border-purple-300/70 dark:border-purple-500/40'
                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
            }
            ${
              premiumAnimating
                ? 'premium-activated'
                : ''
            }
          `}
        >

          {isPremium && (
            <>
              <div className="premium-shine" />

              {Array.from({
                length: 10,
              }).map(
                (_, index) => (
                  <span
                    key={index}
                    className="premium-sparkle"
                    style={{
                      left: `${
                        8 +
                        index *
                          9
                      }%`,
                      bottom: `${
                        8 +
                        (index % 4) *
                          7
                      }%`,
                      animationDelay: `-${
                        index *
                        0.45
                      }s`,
                    }}
                  />
                )
              )}
            </>
          )}

          <div className="relative z-10 p-5 sm:p-6">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

              <div className="flex items-start gap-4">

                <div
                  className={`
                    flex h-14 w-14 shrink-0
                    items-center justify-center
                    rounded-2xl
                    ${
                      isPremium
                        ? 'premium-badge text-white'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  {isPremium ? (
                    <Crown className="h-7 w-7" />
                  ) : (
                    <Sparkles className="h-7 w-7" />
                  )}
                </div>

                <div className="min-w-0">

                  <div className="flex flex-wrap items-center gap-2">

                    <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">
                      NgâuHub Premium
                    </h2>

                    {isPremium && (
                      <span className="premium-badge inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black tracking-wider text-white">
                        <Sparkles className="h-3 w-3" />
                        ACTIVE
                      </span>
                    )}

                  </div>

                  <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
                    {isPremium
                      ? 'Premium đang hoạt động. Bạn đã mở khóa hiệu ứng, chủ đề Premium và hệ thống sao lưu tự động.'
                      : 'Nhập mã kích hoạt để mở khóa không gian Premium của NgâuHub.'}
                  </p>

                </div>

              </div>

              {isPremium && (
                <button
                  type="button"
                  onClick={
                    handleDisablePremium
                  }
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Tắt Premium
                </button>
              )}

            </div>

            {!isPremium ? (

              <div className="mt-6">

                <div className="rounded-2xl border border-purple-200 bg-white/70 p-5 backdrop-blur dark:border-purple-500/20 dark:bg-gray-900/30">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                      <KeyRound className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="font-bold text-gray-900 dark:text-gray-100">
                        Mã kích hoạt Premium
                      </p>

                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Nhập mã Premium để mở khóa các tính năng nâng cao.
                      </p>
                    </div>

                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">

                    <div className="relative flex-1">

                      <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                      <input
                        type="text"
                        value={premiumCode}
                        onChange={(e) =>
                          setPremiumCode(
                            e.target.value
                          )
                        }
                        onKeyDown={(e) => {
                          if (
                            e.key ===
                            'Enter'
                          ) {
                            handleActivatePremium()
                          }
                        }}
                        placeholder="Nhập mã Premium..."
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm font-medium text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      />

                    </div>

                    <button
                      type="button"
                      disabled={
                        premiumActivating
                      }
                      onClick={
                        handleActivatePremium
                      }
                      className="premium-button inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                    >

                      {premiumActivating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang kích hoạt...
                        </>
                      ) : (
                        <>
                          <Crown className="h-4 w-4" />
                          Kích hoạt Premium
                        </>
                      )}

                    </button>

                  </div>

                  <div className="mt-3 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">

                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />

                    <p>
                      Mã kích hoạt được kiểm tra chính xác trước khi Premium được bật.
                    </p>

                  </div>

                </div>

              </div>

            ) : (

              <>

                {/* PREMIUM FEATURES */}

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">

                  <div className="rounded-2xl border border-white/30 bg-white/50 p-4 backdrop-blur dark:border-white/10 dark:bg-gray-900/20">

                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />

                      <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                        Tăng cường
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Trải nghiệm Premium được kích hoạt
                    </p>

                  </div>

                  <div className="rounded-2xl border border-white/30 bg-white/50 p-4 backdrop-blur dark:border-white/10 dark:bg-gray-900/20">

                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-blue-500" />

                      <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                        Sao lưu
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Tự động lưu các phiên bản dữ liệu
                    </p>

                  </div>

                  <div className="rounded-2xl border border-white/30 bg-white/50 p-4 backdrop-blur dark:border-white/10 dark:bg-gray-900/20">

                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-pink-500" />

                      <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                        Premium Glow
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Hiệu ứng ánh sáng và lấp lánh
                    </p>

                  </div>

                </div>

                {/* =================================================
                    BACKUPS
                ================================================= */}

                <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/40 dark:bg-blue-900/20">

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div className="flex items-start gap-3">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                        <Database className="h-5 w-5" />
                      </div>

                      <div>

                        <div className="flex items-center gap-2">

                          <h3 className="font-bold text-gray-900 dark:text-gray-100">
                            Bản sao lưu
                          </h3>

                          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            PREMIUM
                          </span>

                        </div>

                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          Xem, ghim, khôi phục và quản lý các bản sao lưu tự động.
                        </p>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        window.location.href =
                          '/backups'
                      }}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                    >
                      <Database className="h-4 w-4" />
                      Mở bản sao lưu
                      <ExternalLink className="h-4 w-4" />
                    </button>

                  </div>

                </div>

                {/* =================================================
                    PREMIUM THEMES
                ================================================= */}

                <div className="mt-5 rounded-2xl border border-purple-200 bg-white/50 p-5 backdrop-blur dark:border-purple-500/20 dark:bg-gray-900/20">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                      <Palette className="h-5 w-5" />
                    </div>

                    <div>

                      <h3 className="font-bold text-gray-900 dark:text-gray-100">
                        Chủ đề Premium
                      </h3>

                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Chọn phong cách hiển thị cho toàn bộ Ngâu Hub. Sidebar và các trang Premium sẽ đồng bộ theo lựa chọn này.
                      </p>

                    </div>

                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">

                    {/* DARK */}

                    <button
                      type="button"
                      onClick={() =>
                        handlePremiumThemeChange(
                          'dark'
                        )
                      }
                      className={`
                        premium-theme-card
                        relative overflow-hidden rounded-2xl
                        border p-4 text-left
                        ${
                          premiumTheme ===
                          'dark'
                            ? 'border-purple-500 bg-gray-950 text-white shadow-lg shadow-purple-500/20'
                            : 'border-gray-200 bg-gray-900 text-white hover:border-purple-300 dark:border-gray-700'
                        }
                      `}
                    >

                      {premiumTheme ===
                        'dark' && (
                        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}

                      <div className="flex items-center gap-3">

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 shadow-lg shadow-purple-500/30">
                          <Moon className="h-5 w-5 text-white" />
                        </div>

                        <div>

                          <p className="font-black">
                            Premium Dark
                          </p>

                          <p className="text-xs text-gray-400">
                            Tối • Sang • Glow
                          </p>

                        </div>

                      </div>

                      <div className="mt-4 h-16 overflow-hidden rounded-xl bg-gradient-to-r from-gray-950 via-purple-950 to-indigo-950">

                        <div className="flex h-full items-center justify-center gap-3">

                          <span className="h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,1)]" />

                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,1)]" />

                          <span className="h-3 w-3 rounded-full bg-pink-400 shadow-[0_0_16px_rgba(244,114,182,1)]" />

                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]" />

                        </div>

                      </div>

                    </button>

                    {/* SPARKLE */}

                    <button
                      type="button"
                      onClick={() =>
                        handlePremiumThemeChange(
                          'sparkle'
                        )
                      }
                      className={`
                        premium-theme-card
                        relative overflow-hidden rounded-2xl
                        border p-4 text-left
                        ${
                          premiumTheme ===
                          'sparkle'
                            ? 'border-pink-400 bg-white shadow-lg shadow-pink-300/30 dark:bg-gray-800'
                            : 'border-gray-200 bg-white hover:border-pink-300 dark:border-gray-700 dark:bg-gray-800'
                        }
                      `}
                    >

                      {premiumTheme ===
                        'sparkle' && (
                        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-pink-500">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}

                      <div className="flex items-center gap-3">

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-300 via-pink-400 to-purple-500 shadow-lg shadow-pink-400/30">
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>

                        <div>

                          <p className="font-black text-gray-900 dark:text-gray-100">
                            Premium Sparkle
                          </p>

                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Sáng • Lấp lánh • Rực rỡ
                          </p>

                        </div>

                      </div>

                      <div className="relative mt-4 h-16 overflow-hidden rounded-xl bg-gradient-to-r from-yellow-100 via-pink-100 to-purple-100 dark:from-yellow-900/30 dark:via-pink-900/30 dark:to-purple-900/30">

                        <div className="absolute inset-0 flex items-center justify-center gap-4">

                          <Sparkles className="h-5 w-5 text-yellow-500" />

                          <Star className="h-4 w-4 text-pink-500" />

                          <Sparkles className="h-7 w-7 text-purple-500" />

                          <Star className="h-3 w-3 text-blue-500" />

                          <Sparkles className="h-5 w-5 text-pink-500" />

                        </div>

                      </div>

                    </button>

                  </div>

                </div>

              </>

            )}

          </div>

        </section>
      )}

      {/* =====================================================
          HỒ SƠ CÁ NHÂN
      ===================================================== */}

      {user && profile && (

        <section className="relative z-10 rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-700 dark:bg-gray-800">

          <div className="border-b border-gray-100 p-5 dark:border-gray-700 sm:p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <User className="h-5 w-5" />
              </div>

              <div className="flex-1">

                <h2 className="font-bold text-gray-900 dark:text-gray-100">
                  Hồ sơ cá nhân
                </h2>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Thông tin của bạn được lưu online
                </p>

              </div>

            </div>

          </div>

          <div className="space-y-5 p-5 sm:p-6">

            <div className="flex items-start gap-4">

              <div className="relative shrink-0">

                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 dark:border-gray-600 dark:bg-gray-700">

                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar người dùng"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserCircle className="h-14 w-14 text-gray-400" />
                  )}

                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  title="Đổi avatar"
                  className="absolute bottom-0 right-0 rounded-full bg-primary-600 p-1.5 text-white shadow transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={
                    handleAvatarUpload
                  }
                />

              </div>

              <div className="min-w-0 flex-1">

                {editMode ? (

                  <div className="flex flex-col gap-2 sm:flex-row">

                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) =>
                        setTempName(
                          e.target.value
                        )
                      }
                      maxLength={30}
                      autoFocus
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="Tên hiển thị"
                    />

                    <div className="flex gap-2">

                      <button
                        type="button"
                        disabled={saving}
                        onClick={
                          handleSaveName
                        }
                        className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                      >
                        {saving
                          ? 'Đang lưu...'
                          : 'Lưu'}
                      </button>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          setEditMode(false)

                          setTempName(
                            profile.username
                          )
                        }}
                        className="rounded-lg bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-600 dark:text-gray-200"
                      >
                        Hủy
                      </button>

                    </div>

                  </div>

                ) : (

                  <div>

                    <div className="flex items-center gap-2">

                      <p className="truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {profile.username ||
                          'Người dùng'}
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setEditMode(
                            true
                          )

                          setTempName(
                            profile.username
                          )
                        }}
                        title="Đổi tên"
                        className="shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                    </div>

                    <div className="mt-1 flex items-center gap-2">

                      <Award className="h-4 w-4 text-yellow-500" />

                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Cấp độ:{' '}
                        <strong>
                          {profile.level}
                        </strong>
                      </span>

                    </div>

                    <div className="mt-2 w-full max-w-sm">

                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">

                        <span>
                          EXP
                        </span>

                        <span className="font-semibold">
                          {profile.exp} / {expToNextLevel}
                        </span>

                      </div>

                      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">

                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                          style={{
                            width: `${expPercent}%`,
                          }}
                        />

                      </div>

                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Còn{' '}
                        {Math.max(
                          expToNextLevel -
                            profile.exp,
                          0
                        )}{' '}
                        EXP để lên cấp tiếp theo
                      </p>

                    </div>

                  </div>

                )}

              </div>

            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/20">

                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />

                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Level
                  </span>
                </div>

                <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {profile.level}
                </p>

              </div>

              <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 dark:border-purple-900/40 dark:bg-purple-900/20">

                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-400" />

                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    EXP
                  </span>
                </div>

                <p className="mt-1 text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {profile.exp}
                </p>

              </div>

              <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4 dark:border-yellow-900/40 dark:bg-yellow-900/20">

                <div className="flex items-center gap-2">

                  <span className="text-xl">
                    🪙
                  </span>

                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                    Xu
                  </span>

                </div>

                <p className="mt-1 text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                  {Number(
                    profile.coins || 0
                  ).toLocaleString(
                    'vi-VN'
                  )}
                </p>

              </div>

              <div className="rounded-xl border border-green-100 bg-green-50 p-4 dark:border-green-900/40 dark:bg-green-900/20">

                <div className="flex items-center gap-2">

                  <CalendarCheck className="h-5 w-5 text-green-600 dark:text-green-400" />

                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    Điểm danh
                  </span>

                </div>

                <p className="mt-1 text-sm font-bold text-green-700 dark:text-green-300">
                  {profile.last_check_in ===
                  getToday()
                    ? 'Đã điểm danh'
                    : 'Chưa điểm danh'}
                </p>

              </div>

            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/30">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-3">

                  <CalendarCheck
                    className={`h-6 w-6 shrink-0 ${
                      canCheckIn
                        ? 'text-green-500'
                        : 'text-gray-400'
                    }`}
                  />

                  <div>

                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      Điểm danh hàng ngày
                    </p>

                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {canCheckIn
                        ? 'Bạn chưa điểm danh hôm nay. Nhận ngay 10 EXP!'
                        : '✅ Bạn đã điểm danh hôm nay. Quay lại vào ngày mai.'}
                    </p>

                    {profile.last_check_in && (
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Lần điểm danh gần nhất:{' '}
                        {profile.last_check_in}
                      </p>
                    )}

                  </div>

                </div>

                <button
                  type="button"
                  onClick={
                    handleCheckIn
                  }
                  disabled={
                    !canCheckIn ||
                    checkingIn
                  }
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold text-white transition ${
                    canCheckIn &&
                    !checkingIn
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'cursor-not-allowed bg-gray-400'
                  }`}
                >

                  {checkingIn ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang xử lý
                    </>
                  ) : canCheckIn ? (
                    '🎁 Điểm danh'
                  ) : (
                    'Đã điểm danh'
                  )}

                </button>

              </div>

            </div>

          </div>

        </section>

      )}

      {/* =====================================================
          GIAO DIỆN
      ===================================================== */}

      <section className="relative z-10 rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-700 dark:bg-gray-800">

        <div className="border-b border-gray-100 p-5 dark:border-gray-700 sm:p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400">
              🎨
            </div>

            <div>

              <h2 className="font-bold text-gray-900 dark:text-gray-100">
                Giao diện
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Tùy chỉnh giao diện ứng dụng
              </p>

            </div>

          </div>

        </div>

        <div className="p-5 sm:p-6">

          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">

                {isDark ? (
                  <Moon className="h-5 w-5 text-indigo-500" />
                ) : (
                  <Sun className="h-5 w-5 text-yellow-500" />
                )}

              </div>

              <div>

                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  Chế độ tối
                </p>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isDark
                    ? 'Đang bật giao diện tối'
                    : 'Đang sử dụng giao diện sáng'}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="relative flex h-8 w-14 items-center rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              style={{
                backgroundColor:
                  isDark
                    ? '#4F46E5'
                    : '#D1D5DB',
              }}
            >

              <span
                className={`h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
                  isDark
                    ? 'translate-x-6'
                    : 'translate-x-0'
                }`}
              />

            </button>

          </div>

        </div>

      </section>

      {/* =====================================================
          DỮ LIỆU
      ===================================================== */}

      <section className="relative z-10 rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-700 dark:bg-gray-800">

        <div className="border-b border-gray-100 p-5 dark:border-gray-700 sm:p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <Database className="h-5 w-5" />
            </div>

            <div>

              <h2 className="font-bold text-gray-900 dark:text-gray-100">
                Dữ liệu
              </h2>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sao lưu và khôi phục dữ liệu
              </p>

            </div>

          </div>

        </div>

        <div className="p-5 sm:p-6">

          <div className="flex flex-col gap-3 sm:flex-row">

            <button
              type="button"
              onClick={
                handleExport
              }
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-100 dark:hover:bg-gray-700"
            >

              <Download className="h-4 w-4" />

              Xuất JSON

            </button>

            <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-100 dark:hover:bg-gray-700">

              <Upload className="h-4 w-4" />

              Nhập JSON

              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={
                  handleImport
                }
              />

            </label>

          </div>

          {isPremium && (
            <button
              type="button"
              onClick={() => {
                window.location.href =
                  '/backups'
              }}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              <Database className="h-4 w-4" />
              Quản lý bản sao lưu Premium
              <ExternalLink className="h-4 w-4" />
            </button>
          )}

        </div>

      </section>

      {/* =====================================================
          XẾP HẠNG
      ===================================================== */}

      <section className="relative z-10 rounded-2xl border border-gray-200 bg-white p-5 shadow-soft dark:border-gray-700 dark:bg-gray-800 sm:p-6">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Trophy className="h-5 w-5" />
          </div>

          <div className="flex-1">

            <h2 className="font-bold text-gray-900 dark:text-gray-100">
              🏆 Bảng xếp hạng
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              So sánh Level và EXP của bạn với những người dùng khác
            </p>

          </div>

        </div>

        <button
          type="button"
          onClick={() => {
            window.location.href =
              '/leaderboard'
          }}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 px-5 py-3 font-semibold text-white transition hover:bg-yellow-600"
        >

          <Trophy className="h-4 w-4" />

          Xem bảng xếp hạng

        </button>

      </section>

      {/* =====================================================
          THÔNG TIN
      ===================================================== */}

      <section className="relative z-10 rounded-2xl border border-gray-200 bg-white p-5 shadow-soft dark:border-gray-700 dark:bg-gray-800 sm:p-6">

        <h2 className="mb-2 font-bold text-gray-900 dark:text-gray-100">
          📚 Ngâu Hub - Ngâu Penta
        </h2>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Dữ liệu tài khoản, avatar, tên, Level, EXP, Xu và điểm danh được đồng bộ với Supabase khi bạn đăng nhập.
        </p>

      </section>

    </div>
  )
}

export default Settings

