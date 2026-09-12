import { supabase } from '@/utils/supabase/client'

const CLOUD_TABLE = 'user_app_data'
const LAST_USER_KEY = 'studyhub_last_user_id'
const SYNC_INTERVAL = 1500

let timer: number | null = null
let syncing = false
let restoring = false
let started = false

// =========================================================
// Những key không phải data của StudyHub
// =========================================================

function isProtectedKey(key: string) {
  return (
    key.startsWith('sb-') ||
    key.startsWith('supabase') ||
    key === LAST_USER_KEY
  )
}

// =========================================================
// Đọc toàn bộ data app từ localStorage
// =========================================================

function readLocalSnapshot(): Record<string, string> {
  const snapshot: Record<string, string> = {}

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)

    if (!key) continue
    if (isProtectedKey(key)) continue

    const value = localStorage.getItem(key)

    if (value !== null) {
      snapshot[key] = value
    }
  }

  return snapshot
}

// =========================================================
// Xóa data app hiện tại và đưa data cloud vào localStorage
// =========================================================

function replaceLocalSnapshot(
  snapshot: Record<string, string>
) {
  const keysToRemove: string[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)

    if (!key) continue
    if (isProtectedKey(key)) continue

    keysToRemove.push(key)
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key)
  }

  for (const [key, value] of Object.entries(snapshot)) {
    localStorage.setItem(key, value)
  }
}

// =========================================================
// Xóa toàn bộ data app khỏi localStorage
// =========================================================

function clearLocalAppData() {
  const keysToRemove: string[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)

    if (!key) continue
    if (isProtectedKey(key)) continue

    keysToRemove.push(key)
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key)
  }
}

// =========================================================
// Lấy user hiện tại
// =========================================================

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    console.error(
      '[StudyHub Cloud] getUser error:',
      error
    )

    return null
  }

  return data.user?.id ?? null
}

// =========================================================
// Lấy data từ Supabase
// =========================================================

async function loadCloud(
  userId: string
): Promise<Record<string, string> | null> {
  const { data, error } = await supabase
    .from(CLOUD_TABLE)
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error(
      '[StudyHub Cloud] load error:',
      error
    )

    return null
  }

  if (
    !data ||
    !data.data ||
    typeof data.data !== 'object'
  ) {
    return null
  }

  return data.data as Record<string, string>
}

// =========================================================
// Upload localStorage lên Supabase
// =========================================================

async function saveCloud(userId: string) {
  if (syncing) return

  syncing = true

  try {
    const snapshot = readLocalSnapshot()

    const { error } = await supabase
      .from(CLOUD_TABLE)
      .upsert(
        {
          user_id: userId,
          data: snapshot,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )

    if (error) {
      console.error(
        '[StudyHub Cloud] save error:',
        error
      )
    }
  } finally {
    syncing = false
  }
}

// =========================================================
// Đồng bộ khi đăng nhập
// =========================================================

async function syncOnLogin(userId: string) {
  if (restoring) return

  restoring = true

  try {
    const previousUserId =
      localStorage.getItem(LAST_USER_KEY)

    const cloud = await loadCloud(userId)

    // =====================================================
    // ACCOUNT NÀY CHƯA TỪNG ĐƯỢC GHI NHẬN TRÊN BROWSER
    // =====================================================

    if (!previousUserId) {

      if (cloud) {
        // Có dữ liệu online
        // -> tải về local
        replaceLocalSnapshot(cloud)
      } else {
        // Chưa có dữ liệu online
        // -> giữ dữ liệu local và upload lên cloud
        await saveCloud(userId)
      }

      localStorage.setItem(
        LAST_USER_KEY,
        userId
      )

      return
    }

    // =====================================================
    // ĐĂNG NHẬP LẠI ĐÚNG ACCOUNT CŨ
    // =====================================================

    if (previousUserId === userId) {

      if (cloud) {
        // Cloud là nguồn dữ liệu online
        replaceLocalSnapshot(cloud)
      } else {
        // Chưa có cloud -> upload local
        await saveCloud(userId)
      }

      localStorage.setItem(
        LAST_USER_KEY,
        userId
      )

      return
    }

    // =====================================================
    // CHUYỂN SANG ACCOUNT KHÁC
    // =====================================================

    if (cloud) {

      // Account mới đã có dữ liệu
      replaceLocalSnapshot(cloud)

    } else {

      // Account mới chưa có dữ liệu
      // Xóa data account trước khỏi browser
      clearLocalAppData()
    }

    localStorage.setItem(
      LAST_USER_KEY,
      userId
    )
  } finally {
    restoring = false
  }
}

// =========================================================
// Dừng auto sync
// =========================================================

function stopSync() {
  if (timer !== null) {
    window.clearInterval(timer)
    timer = null
  }
}

// =========================================================
// Bắt đầu auto sync
// =========================================================

async function startSync(userId: string) {
  stopSync()

  // Upload một lần ngay khi bắt đầu
  await saveCloud(userId)

  // Sau đó tự động đồng bộ
  timer = window.setInterval(() => {
    void saveCloud(userId)
  }, SYNC_INTERVAL)
}

// =========================================================
// PUBLIC
// =========================================================

export function startStudyHubCloudSync() {
  if (started) return

  started = true

  // =======================================================
  // Kiểm tra session hiện tại
  // =======================================================

  void (async () => {
    const userId =
      await getCurrentUserId()

    if (!userId) {
      return
    }

    await syncOnLogin(userId)

    await startSync(userId)
  })()

  // =======================================================
  // Theo dõi thay đổi authentication
  // =======================================================

  supabase.auth.onAuthStateChange(
    (event, session) => {

      // ===================================================
      // LOGIN
      // ===================================================

      if (
        event === 'SIGNED_IN' &&
        session?.user
      ) {
        void (async () => {
          await syncOnLogin(
            session.user.id
          )

          await startSync(
            session.user.id
          )
        })()

        return
      }

      // ===================================================
      // LOGOUT
      // ===================================================

      if (event === 'SIGNED_OUT') {
        stopSync()
      }
    }
  )
}