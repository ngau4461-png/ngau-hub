import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArchiveRestore,
  CalendarClock,
  Check,
  Crown,
  Database,
  Download,
  Loader2,
  Lock,
  Pin,
  PinOff,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Save,
  Trash2,
  X,
} from 'lucide-react'

import { useToast } from '@/hooks/useToast'
import { supabase } from '@/utils/supabase/client'
import { downloadJSON } from '@/utils/helpers'

const PREMIUM_STORAGE_PREFIX = 'studyhub_premium_v1_'
const PREMIUM_THEME_PREFIX = 'studyhub_premium_theme_v1_'
const MAX_BACKUPS = 20
const BACKUPS_CACHE_PREFIX = 'studyhub_backups_cache_v1_'

type BackupRow = {
  id: string
  user_id: string
  data?: Record<string, any>
  created_at: string
  is_pinned: boolean
}

type PremiumTheme = 'dark' | 'sparkle'

const getBackupsCacheKey = (userId: string) =>
  `${BACKUPS_CACHE_PREFIX}${userId}`

const readBackupsCache = (userId: string): BackupRow[] | null => {
  try {
    const raw = localStorage.getItem(getBackupsCacheKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as BackupRow[]) : null
  } catch {
    return null
  }
}

const writeBackupsCache = (userId: string, backups: BackupRow[]) => {
  try {
    localStorage.setItem(getBackupsCacheKey(userId), JSON.stringify(backups))
  } catch {
    // Cache không bắt buộc.
  }
}

const Backups: React.FC = () => {
  const { showToast } = useToast()

  const [user, setUser] = useState<any>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [premiumTheme, setPremiumTheme] = useState<PremiumTheme>('dark')
  const [backups, setBackups] = useState<BackupRow[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null)

  const getPremiumStorageKey = (userId: string) =>
    `${PREMIUM_STORAGE_PREFIX}${userId}`

  const loadPremiumState = (userId: string) => {
    try {
      const premium =
        localStorage.getItem(getPremiumStorageKey(userId)) === 'true'
      const savedTheme = localStorage.getItem(
        `${PREMIUM_THEME_PREFIX}${userId}`
      )

      setIsPremium(premium)
      setPremiumTheme(savedTheme === 'sparkle' ? 'sparkle' : 'dark')
    } catch (error) {
      console.error('Không thể kiểm tra Premium:', error)
      setIsPremium(false)
      setPremiumTheme('dark')
    }
  }

  const loadBackups = useCallback(
    async (userId: string, silent = false) => {
      if (silent) setRefreshing(true)

      try {
        // Dọn các backup vượt quá 20 trước. Chỉ xóa bản cũ chưa ghim.
        const { data: allMeta, error: metaError } = await supabase
          .from('user_backups')
          .select('id, created_at, is_pinned')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })

        if (metaError) {
          console.error('Lỗi kiểm tra backup:', metaError)
          if (silent && !readBackupsCache(userId)) {
            showToast('error', `Không thể tải danh sách bản sao lưu: ${metaError.message}`)
          }
          return
        }

        const meta = allMeta ?? []
        if (meta.length > MAX_BACKUPS) {
          const overflow = meta.length - MAX_BACKUPS
          const removable = meta
            .filter((item) => item.is_pinned === false)
            .slice(0, overflow)

          if (removable.length === overflow) {
            const ids = removable.map((item) => item.id)
            const { error: cleanupError } = await supabase
              .from('user_backups')
              .delete()
              .in('id', ids)
              .eq('user_id', userId)

            if (cleanupError) {
              console.error('Lỗi dọn backup cũ:', cleanupError)
            }
          }
        }

        // QUAN TRỌNG: chỉ tải metadata ở bước đầu.
        // Cột data (JSONB) có thể rất lớn nên không tải cả 20 file ngay khi mở trang.
        // Nội dung JSON sẽ được tải lazy khi người dùng Khôi phục / Tải xuống.
        const { data, error } = await supabase
          .from('user_backups')
          .select('id, user_id, created_at, is_pinned')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(MAX_BACKUPS)

        if (error) {
          console.error('Lỗi tải backup:', error)
          if (silent || !readBackupsCache(userId)) {
            showToast('error', `Không thể tải danh sách bản sao lưu: ${error.message}`)
          }
          return
        }

        const freshMeta = (data ?? []) as BackupRow[]
        const cached = readBackupsCache(userId) ?? []
        const cachedById = new Map(cached.map((item) => [item.id, item]))

        // Giữ lại data đã cache nếu backup vẫn tồn tại, để UI hiện đầy đủ ngay.
        const next = freshMeta.map((item) => {
          const old = cachedById.get(item.id)
          return old ? { ...item, data: old.data } : item
        })

        setBackups(next)
        writeBackupsCache(userId, next)

        // Sau khi danh sách metadata đã hiện, tải phần data của các backup
        // chưa có cache ở chế độ nền. Không chặn UI và không cần người dùng
        // bấm Khôi phục mới có số liệu môn học / tài nguyên / ghi chú.
        const missingIds = next
          .filter((item) => !item.data)
          .map((item) => item.id)

        if (missingIds.length > 0) {
          void (async () => {
            try {
              const { data: contentRows, error: contentError } = await supabase
                .from('user_backups')
                .select('id, data')
                .eq('user_id', userId)
                .in('id', missingIds)

              if (contentError || !contentRows) {
                if (contentError) {
                  console.error('Lỗi tải nội dung backup nền:', contentError)
                }
                return
              }

              const byId = new Map(
                contentRows.map((row) => [row.id, row.data as Record<string, any>])
              )

              setBackups((current) => {
                const updated = current.map((item) => {
                  const content = byId.get(item.id)
                  return content ? { ...item, data: content } : item
                })

                writeBackupsCache(userId, updated)
                return updated
              })
            } catch (backgroundError) {
              console.error('Lỗi tải số liệu backup nền:', backgroundError)
            }
          })()
        }
      } catch (error) {
        console.error('Lỗi tải backup:', error)
        if (silent) showToast('error', 'Không thể tải danh sách bản sao lưu')
      } finally {
        setRefreshing(false)
        setLoading(false)
      }
    },
    [showToast]
  )

  useEffect(() => {
    let mounted = true

    const applyUser = (currentUser: any) => {
      if (!mounted) return

      setUser(currentUser)

      if (!currentUser) {
        setIsPremium(false)
        setPremiumTheme('dark')
        setBackups([])
        setLoading(false)
        return
      }

      loadPremiumState(currentUser.id)

      let premium = false
      try {
        premium = localStorage.getItem(getPremiumStorageKey(currentUser.id)) === 'true'
      } catch {
        premium = false
      }

      if (!premium) {
        setIsPremium(false)
        setBackups([])
        setLoading(false)
        return
      }

      setIsPremium(true)

      const cached = readBackupsCache(currentUser.id)
      if (cached) {
        setBackups(cached)
        setLoading(false)
        void loadBackups(currentUser.id, true)
      } else {
        // Không chặn việc dựng trang bởi request mạng lần đầu.
        // Danh sách sẽ xuất hiện ngay khi Supabase trả về.
        setLoading(false)
        void loadBackups(currentUser.id, true)
      }
    }

    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        applyUser(session?.user ?? null)
      } catch (error) {
        console.error('Lỗi khởi tạo trang backup:', error)
        if (mounted) {
          setLoading(false)
          showToast('error', 'Không thể tải trang bản sao lưu')
        }
      }
    }

    void initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        applyUser(session?.user ?? null)
      }
    )

    const handleStorage = () => {
      if (!user) return
      loadPremiumState(user.id)
    }

    window.addEventListener('storage', handleStorage)

    return () => {
      mounted = false
      subscription.unsubscribe()
      window.removeEventListener('storage', handleStorage)
    }
  }, [loadBackups, showToast])

  const pinnedCount = useMemo(
    () => backups.filter((backup) => backup.is_pinned).length,
    [backups]
  )

  const formatDate = (value: string) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return 'Không xác định'
    }

    return date.toLocaleString('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const getBackupLabel = (backup: BackupRow, index: number) => {
    const data = backup.data
    const hasData = !!data

    const subjects = hasData && Array.isArray(data?.subjects)
      ? data.subjects.length
      : null

    const resources = hasData && Array.isArray(data?.resources)
      ? data.resources.length
      : null

    const notes = hasData && Array.isArray(data?.notes)
      ? data.notes.length
      : null

    return {
      subjects,
      resources,
      notes,
      title: `Bản sao lưu #${backups.length - index}`,
    }
  }

  const handleRefresh = async () => {
    if (!user || !isPremium) return
    await loadBackups(user.id, true)
  }

  const handleManualBackup = async () => {
    if (!user || !isPremium || saving) return

    setSaving(true)
    try {
      // Ưu tiên lấy dữ liệu đang nằm trong DataService/local cache.
      // Fallback sang user_data nếu module chưa có getDataForBackup.
      const { data: currentRow, error: currentError } = await supabase
        .from('user_data')
        .select('data')
        .eq('user_id', user.id)
        .maybeSingle()

      if (currentError) {
        showToast('error', `Không thể lấy dữ liệu hiện tại: ${currentError.message}`)
        return
      }

      if (!currentRow?.data || typeof currentRow.data !== 'object') {
        showToast('error', 'Chưa có dữ liệu để tạo bản sao lưu')
        return
      }

      const { data: existing, error: fetchError } = await supabase
        .from('user_backups')
        .select('id, created_at, is_pinned')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (fetchError) {
        showToast('error', `Không thể kiểm tra số lượng bản sao lưu: ${fetchError.message}`)
        return
      }

      const current = existing ?? []
      if (current.length >= MAX_BACKUPS) {
        const oldestUnpinned = current.find((item) => item.is_pinned === false)
        if (!oldestUnpinned) {
          showToast('error', 'Đã đủ 20 bản sao lưu và tất cả đều đã được ghim. Hãy bỏ ghim hoặc xóa một bản để lưu thêm.')
          return
        }

        const { error: deleteError } = await supabase
          .from('user_backups')
          .delete()
          .eq('id', oldestUnpinned.id)
          .eq('user_id', user.id)

        if (deleteError) {
          showToast('error', `Không thể dọn bản sao lưu cũ: ${deleteError.message}`)
          return
        }
      }

      const { data: inserted, error: insertError } = await supabase
        .from('user_backups')
        .insert({
          user_id: user.id,
          data: currentRow.data,
          is_pinned: false,
        })
        .select('id, user_id, data, created_at, is_pinned')
        .single()

      if (insertError) {
        showToast('error', `Không thể lưu bản sao lưu: ${insertError.message}`)
        return
      }

      if (inserted) {
        setBackups((currentBackups) => {
          const next = [
            inserted as BackupRow,
            ...currentBackups.filter((item) => item.id !== inserted.id),
          ].slice(0, MAX_BACKUPS)
          writeBackupsCache(user.id, next)
          return next
        })
      }

      showToast('success', 'Đã lưu bản sao lưu hiện tại thành công ✨')
    } catch (error) {
      console.error('Lỗi backup thủ công:', error)
      showToast('error', 'Không thể lưu bản sao lưu')
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePin = async (backup: BackupRow) => {
    if (!user || !isPremium) return

    setBusyId(backup.id)

    try {
      const { error } = await supabase
        .from('user_backups')
        .update({
          is_pinned: !backup.is_pinned,
        })
        .eq('id', backup.id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Lỗi ghim backup:', error)
        showToast('error', 'Không thể thay đổi trạng thái ghim')
        return
      }

      setBackups((current) => {
        const next = current.map((item) =>
          item.id === backup.id
            ? { ...item, is_pinned: !item.is_pinned }
            : item
        )
        writeBackupsCache(user.id, next)
        return next
      })

      showToast(
        'success',
        backup.is_pinned
          ? 'Đã bỏ ghim bản sao lưu'
          : 'Đã ghim bản sao lưu'
      )
    } catch (error) {
      console.error('Lỗi ghim backup:', error)
      showToast('error', 'Không thể thay đổi trạng thái ghim')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (backup: BackupRow) => {
    if (!user || !isPremium) return

    setBusyId(backup.id)

    try {
      const { error } = await supabase
        .from('user_backups')
        .delete()
        .eq('id', backup.id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Lỗi xóa backup:', error)
        showToast('error', 'Không thể xóa bản sao lưu')
        return
      }

      setBackups((current) => {
        const next = current.filter((item) => item.id !== backup.id)
        writeBackupsCache(user.id, next)
        return next
      })

      setConfirmDeleteId(null)
      showToast('success', 'Đã xóa bản sao lưu')
    } catch (error) {
      console.error('Lỗi xóa backup:', error)
      showToast('error', 'Không thể xóa bản sao lưu')
    } finally {
      setBusyId(null)
    }
  }

  const ensureBackupData = useCallback(async (backupId: string) => {
    if (!user) return null

    const { data, error } = await supabase
      .from('user_backups')
      .select('data')
      .eq('id', backupId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Lỗi tải nội dung backup:', error)
      showToast('error', `Không thể tải nội dung bản sao lưu: ${error.message}`)
      return null
    }

    if (!data?.data || typeof data.data !== 'object') {
      showToast('error', 'Bản sao lưu không có dữ liệu hợp lệ')
      return null
    }

    const backupData = data.data as Record<string, any>

    setBackups((current) => {
      const next = current.map((item) =>
        item.id === backupId ? { ...item, data: backupData } : item
      )
      writeBackupsCache(user.id, next)
      return next
    })

    return backupData
  }, [showToast, user])

  const handleDownload = async (backup: BackupRow) => {
    try {
      const backupData = backup.data ?? await ensureBackupData(backup.id)
      if (!backupData) return

      downloadJSON(
        backupData,
        `studyhub-backup-${backup.id}.json`
      )

      showToast('success', 'Đã tải bản sao lưu JSON')
    } catch (error) {
      console.error('Lỗi tải backup:', error)
      showToast('error', 'Không thể tải bản sao lưu')
    }
  }

  const handleRestore = async (backup: BackupRow) => {
    if (!user || !isPremium) return

    setBusyId(backup.id)

    try {
      const backupData = backup.data ?? await ensureBackupData(backup.id)
      if (
        !backupData ||
        typeof backupData !== 'object' ||
        !Array.isArray(backupData.subjects) ||
        !Array.isArray(backupData.resources) ||
        !Array.isArray(backupData.quickLinks)
      ) {
        showToast(
          'error',
          'Bản sao lưu này không có cấu trúc dữ liệu hợp lệ'
        )
        setConfirmRestoreId(null)
        return
      }

      const { error } = await supabase
        .from('user_data')
        .upsert(
          {
            user_id: user.id,
            data: backupData,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        )

      if (error) {
        console.error('Lỗi khôi phục backup:', error)
        showToast(
          'error',
          'Không thể khôi phục dữ liệu: ' + error.message
        )
        return
      }

      setConfirmRestoreId(null)

      showToast(
        'success',
        'Khôi phục thành công! Ứng dụng sẽ tải lại dữ liệu.'
      )

      window.setTimeout(() => {
        window.location.reload()
      }, 700)
    } catch (error) {
      console.error('Lỗi khôi phục backup:', error)
      showToast('error', 'Không thể khôi phục bản sao lưu')
    } finally {
      setBusyId(null)
    }
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải bản sao lưu...
        </div>
      </div>
    )
  }

  // =========================================================
  // NOT LOGGED IN
  // =========================================================

  if (!user) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-soft dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Lock className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Bản sao lưu
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            Vui lòng đăng nhập để sử dụng hệ thống sao lưu dữ liệu.
          </p>

          <button
            type="button"
            onClick={() => {
              window.location.href = '/settings'
            }}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 font-semibold text-white transition hover:bg-primary-700"
          >
            <Lock className="h-4 w-4" />
            Đăng nhập
          </button>
        </section>
      </div>
    )
  }

  // =========================================================
  // FREE USER
  // =========================================================

  if (!isPremium) {
    return (
      <div className="relative space-y-6">
        <section className="overflow-hidden rounded-3xl border border-purple-300/60 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-8 text-center shadow-soft dark:border-purple-500/30 dark:from-pink-950/30 dark:via-purple-950/30 dark:to-blue-950/30">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 text-white shadow-lg">
            <Crown className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-2xl font-black text-gray-900 dark:text-gray-100">
            Bản sao lưu Premium
          </h1>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-600 dark:text-gray-300">
            Tính năng này dành cho Premium. Khi Premium được bật,
            NgâuHub sẽ tự động tạo bản sao lưu dữ liệu sau mỗi lần
            dữ liệu của bạn được lưu thành công.
          </p>

          <div className="mx-auto mt-6 grid max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-gray-900/30">
              <Database className="h-5 w-5 text-blue-500" />
              <p className="mt-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                Tự động
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Sao lưu sau khi lưu dữ liệu
              </p>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-gray-900/30">
              <Pin className="h-5 w-5 text-amber-500" />
              <p className="mt-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                Ghim
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Giữ lại bản sao quan trọng
              </p>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-gray-900/30">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              <p className="mt-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                Tối đa 20
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Bản ghim không bị tự xóa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href = '/settings'
            }}
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 px-6 py-3 font-black text-white shadow-lg transition hover:-translate-y-0.5"
          >
            <Crown className="h-5 w-5" />
            Kích hoạt Premium
          </button>
        </section>
      </div>
    )
  }

  // =========================================================
  // PREMIUM PAGE
  // =========================================================

  const sparkle = premiumTheme === 'sparkle'

  return (
    <div className={`relative min-w-0 space-y-5 pb-4 lg:space-y-7 ${sparkle ? 'premium-sparkle-page' : 'premium-dark-page'}`}>
      <style>
        {`
          @keyframes backupGradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          .backup-premium-card {
            background:
              linear-gradient(
                135deg,
                rgba(236,72,153,.12),
                rgba(168,85,247,.12),
                rgba(59,130,246,.12),
                rgba(6,182,212,.10)
              );
            background-size: 300% 300%;
            animation: backupGradient 9s ease infinite;
          }

          .premium-sparkle-page { isolation: isolate; }
          .premium-sparkle-page::before {
            content: ""; position: fixed; inset: 0; pointer-events: none; z-index: -1;
            background: radial-gradient(circle at 12% 10%, rgba(236,72,153,.13), transparent 26%),
              radial-gradient(circle at 88% 18%, rgba(139,92,246,.13), transparent 27%),
              radial-gradient(circle at 50% 95%, rgba(59,130,246,.10), transparent 30%);
          }
          .premium-sparkle-card { box-shadow: 0 14px 40px rgba(124,58,237,.08), 0 0 0 1px rgba(255,255,255,.65) inset; backdrop-filter: blur(14px); }
          .premium-dark-page .premium-dark-card {
            background: linear-gradient(145deg, rgba(31,41,55,.98), rgba(17,24,39,.98));
            box-shadow: 0 18px 45px rgba(0,0,0,.20), 0 0 28px rgba(168,85,247,.06);
          }
        `}
      </style>

      {/* HEADER */}
      <div className="relative z-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <Database className="h-5 w-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Bản sao lưu
                </h1>

                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 px-2.5 py-1 text-xs font-black text-white shadow">
                  <Crown className="h-3.5 w-3.5" />
                  PREMIUM
                </span>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Quản lý các bản sao lưu tự động của Ngâu Hub Premium
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleManualBackup()}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 px-3 py-2.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Đang lưu...' : 'Lưu ngay'}
            </button>
            <button
              type="button"
              disabled={refreshing}
              onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            Làm mới
          </button>
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <section className={`backup-premium-card relative z-10 overflow-hidden rounded-3xl border p-5 shadow-soft sm:p-6 ${sparkle ? 'border-purple-200/70 premium-sparkle-card' : 'border-purple-500/30 premium-dark-card'}`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 text-white shadow-lg">
              <ArchiveRestore className="h-7 w-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">
                  Sao lưu tự động
                </h2>

                <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold text-purple-700 dark:bg-gray-900/40 dark:text-purple-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Đang bảo vệ
                </span>
              </div>

              <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
                Backup được tạo sau khi dữ liệu được lưu thành công.
                Hệ thống giữ tối đa 20 bản sao lưu và ưu tiên giữ các bản đã ghim.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
            <div className="rounded-2xl border border-white/50 bg-white/60 p-4 backdrop-blur dark:border-white/10 dark:bg-gray-900/30">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Đang lưu
              </p>
              <p className="mt-1 text-2xl font-black text-gray-900 dark:text-gray-100">
                {backups.length}
                <span className="text-base font-semibold text-gray-400">
                  /{MAX_BACKUPS}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-white/50 bg-white/60 p-4 backdrop-blur dark:border-white/10 dark:bg-gray-900/30">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Đã ghim
              </p>
              <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">
                {pinnedCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* EMPTY */}
      {backups.length === 0 ? (
        <section className={`relative z-10 rounded-2xl border p-8 text-center shadow-soft ${sparkle ? 'border-purple-100 bg-white/80 premium-sparkle-card' : 'border-gray-700 bg-gray-800 premium-dark-card'}`}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Database className="h-8 w-8" />
          </div>

          <h2 className="mt-5 text-xl font-bold text-gray-900 dark:text-gray-100">
            Chưa có bản sao lưu
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            Khi bạn chỉnh sửa dữ liệu và hệ thống lưu thành công,
            bản sao lưu tự động sẽ xuất hiện ở đây.
          </p>
        </section>
      ) : (
        <section className="relative z-10 space-y-3">
          {backups.map((backup, index) => {
            const info = getBackupLabel(backup, index)
            const busy = busyId === backup.id
            const deleting = confirmDeleteId === backup.id
            const restoring = confirmRestoreId === backup.id

            return (
              <article
                key={backup.id}
                className={`rounded-2xl border shadow-soft transition ${sparkle ? 'bg-white/90 premium-sparkle-card' : 'bg-gray-800 premium-dark-card'} ${
                  backup.is_pinned
                    ? 'border-amber-300 dark:border-amber-500/50'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                          backup.is_pinned
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}
                      >
                        {backup.is_pinned ? (
                          <Pin className="h-5 w-5" />
                        ) : (
                          <ArchiveRestore className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-gray-900 dark:text-gray-100">
                            {info.title}
                          </h3>

                          {backup.is_pinned && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <Pin className="h-3 w-3" />
                              Đã ghim
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <CalendarClock className="h-4 w-4 shrink-0" />
                          {formatDate(backup.created_at)}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                            {info.subjects === null ? 'Đang tải…' : `${info.subjects} môn học`}
                          </span>

                          <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                            {info.resources === null ? 'Đang tải…' : `${info.resources} tài nguyên`}
                          </span>

                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-300">
                            {info.notes === null ? 'Đang tải…' : `${info.notes} ghi chú`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRestore(backup)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Khôi phục
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleTogglePin(backup)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
                      >
                        {backup.is_pinned ? (
                          <PinOff className="h-4 w-4" />
                        ) : (
                          <Pin className="h-4 w-4" />
                        )}
                        {backup.is_pinned ? 'Bỏ ghim' : 'Ghim'}
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDownload(backup)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-100 dark:hover:bg-gray-700"
                      >
                        <Download className="h-4 w-4" />
                        Tải JSON
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmDeleteId(backup.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="h-4 w-4" />
                        Xóa
                      </button>
                    </div>
                  </div>

                  {(deleting || restoring) && (
                    <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/30">
                      {restoring ? (
                        <>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            Khôi phục bản sao lưu này?
                          </p>

                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Dữ liệu hiện tại trên Ngâu Hub sẽ được thay bằng
                            dữ liệu trong bản sao lưu. Sau đó ứng dụng sẽ tải lại.
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleRestore(backup)}
                              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                            >
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Xác nhận khôi phục
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setConfirmRestoreId(null)}
                              className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                            >
                              <X className="h-4 w-4" />
                              Hủy
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            Xóa bản sao lưu này?
                          </p>

                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Thao tác này không thể hoàn tác.
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleDelete(backup)}
                              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Xác nhận xóa
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setConfirmDeleteId(null)}
                              className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                            >
                              <X className="h-4 w-4" />
                              Hủy
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {!deleting && !restoring && (
                    <button
                      type="button"
                      onClick={() => setConfirmRestoreId(backup.id)}
                      className="mt-4 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
                    >
                      Khôi phục bản này
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}

export default Backups
