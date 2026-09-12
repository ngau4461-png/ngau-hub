import type {
  Subject,
  Resource,
  QuickLink,
  UserSettings,
  AppData,
  ResourceType,
  SortOption,
  Note,
  Formula,
  UserProfile,
  LeaderboardEntry,
  Equipment,
  Stage,
  DailyReward,
  EquipmentSlot,
} from '@/types'

import { supabase } from '@/utils/supabase/client'

import {
  SAMPLE_SUBJECTS,
  SAMPLE_RESOURCES,
  SAMPLE_QUICK_LINKS,
} from '@/data/sampleData'

import {
  APP_VERSION,
  DEFAULT_SETTINGS,
} from '@/constants/index'

import {
  generateId,
  sanitizeString,
  validateUrl,
  validateRequired,
} from '@/utils/helpers'

type OnlineData = {
  subjects: Subject[]
  resources: Resource[]
  quickLinks: QuickLink[]
  settings: UserSettings
  notes: Note[]
  formulas: Formula[]

  profile: any

  equipment: any[]
  stages: any[]
  dailyRewards: any[]
  leaderboard: any[]

  coins: number
  combat: any

  initialized: boolean
}

const DEFAULT_PROFILE = {
  name: 'Người dùng',
  avatar: '',
  level: 1,
  exp: 0,
  coins: 0,
  streak: 0,
  lastCheckIn: null,
}

const ANONYMOUS_STORAGE_KEY =
  'studyhub_data_anonymous_v1'

const ACCOUNT_STORAGE_PREFIX =
  'studyhub_data_account_v1_'

const PREMIUM_STORAGE_PREFIX =
  'studyhub_premium_v1_'

const BACKUP_SIGNATURE_PREFIX =
  'studyhub_last_backup_signature_v1_'

// Offline-first sync state. LocalStorage is the app's immediate source of truth.
const SYNC_STATE_PREFIX =
  'studyhub_sync_state_v2_'

const MAX_BACKUPS = 20

type SyncState = {
  dataPending: boolean
  profilePending: boolean
  updatedAt: string | null
  profileUpdate: Record<string, unknown>
}

class DataService {
  private subjects: Subject[] = []
  private resources: Resource[] = []
  private quickLinks: QuickLink[] = []

  private notes: Note[] = []
  private formulas: Formula[] = []

  private settings: UserSettings = {
    ...DEFAULT_SETTINGS,
  }

  private profile: any = {
    ...DEFAULT_PROFILE,
  }

  private equipment: any[] = []
  private stages: any[] = []
  private dailyRewards: any[] = []
  private leaderboard: any[] = []

  private combat: any = {}

  private listeners: Set<() => void> = new Set()

  private userId: string | null = null

  private loading = false

  private saveTimer: ReturnType<typeof setTimeout> | null =
    null

  private authSubscription:
    | { unsubscribe: () => void }
    | null = null

  private syncInProgress = false
  private onlineListener: (() => void) | null = null

  constructor() {
    void this.init()
    this.listenAuthChanges()

    if (typeof window !== 'undefined') {
      this.onlineListener = () => {
        void this.syncPendingData()
      }
      window.addEventListener('online', this.onlineListener)

      // If the browser is already online, try pending work shortly after startup.
      if (navigator.onLine) {
        setTimeout(() => {
          void this.syncPendingData()
        }, 250)
      }
    }
  }

  // =========================================================
  // EVENTS
  // =========================================================

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener()
      } catch (error) {
        console.error(
          'DataService listener error:',
          error
        )
      }
    })
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  // =========================================================
  // AUTH
  // =========================================================

  private async getCurrentUser() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) return session.user
    } catch (error) {
      console.warn('Không đọc được session local:', error)
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      return user
    } catch {
      return null
    }
  }

  private listenAuthChanges() {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED'
        ) {
          const nextUserId =
            session?.user?.id ?? null

          if (
            nextUserId &&
            nextUserId !== this.userId
          ) {
            void this.init()
          }

          return
        }

        if (event === 'SIGNED_OUT') {
          this.userId = null

          const data =
            this.loadLocalData(
              ANONYMOUS_STORAGE_KEY
            )

          if (data) {
            this.applyData(data)
          } else {
            this.applyData(
              this.createDefaultData()
            )
          }

          this.notify()
        }
      }
    )

    this.authSubscription =
      subscription
  }

  // =========================================================
  // LOCAL STORAGE
  // =========================================================

  private getStorageKey(
    userId?: string | null
  ) {
    if (userId) {
      return `${ACCOUNT_STORAGE_PREFIX}${userId}`
    }

    return ANONYMOUS_STORAGE_KEY
  }

  private loadLocalData(
    key: string
  ): OnlineData | null {
    if (
      typeof window ===
      'undefined'
    ) {
      return null
    }

    try {
      const raw =
        window.localStorage.getItem(
          key
        )

      if (!raw) {
        return null
      }

      const parsed =
        JSON.parse(raw)

      return this.mergeData(
        this.createDefaultData(),
        parsed
      )
    } catch (error) {
      console.error(
        'Lỗi đọc localStorage StudyHub:',
        error
      )

      return null
    }
  }

  private hasLocalData(
    key: string
  ) {
    if (
      typeof window ===
      'undefined'
    ) {
      return false
    }

    try {
      return !!window.localStorage.getItem(
        key
      )
    } catch {
      return false
    }
  }

  private saveLocalData(
    key: string,
    data: OnlineData
  ) {
    if (
      typeof window ===
      'undefined'
    ) {
      return false
    }

    try {
      window.localStorage.setItem(
        key,
        JSON.stringify(data)
      )

      return true
    } catch (error) {
      console.error(
        'Lỗi lưu localStorage StudyHub:',
        error
      )

      return false
    }
  }

  private removeLocalData(
    key: string
  ) {
    if (
      typeof window ===
      'undefined'
    ) {
      return
    }

    try {
      window.localStorage.removeItem(
        key
      )
    } catch (error) {
      console.error(
        'Lỗi xóa localStorage StudyHub:',
        error
      )
    }
  }

  // =========================================================
  // DEFAULT DATA
  // =========================================================

  private createDefaultData(): OnlineData {
    return {
      subjects: JSON.parse(
        JSON.stringify(
          SAMPLE_SUBJECTS
        )
      ),

      resources: JSON.parse(
        JSON.stringify(
          SAMPLE_RESOURCES
        )
      ),

      quickLinks: JSON.parse(
        JSON.stringify(
          SAMPLE_QUICK_LINKS
        )
      ),

      notes: [],

      formulas: [],

      settings: {
        ...DEFAULT_SETTINGS,
      },

      profile: {
        ...DEFAULT_PROFILE,
      },

      equipment: [],

      stages: [],

      dailyRewards: [],

      leaderboard: [],

      coins: 0,

      combat: {},

      initialized: true,
    }
  }

  // =========================================================
  // OFFLINE-FIRST SYNC
  // =========================================================

  private isOnline(): boolean {
    if (typeof window === 'undefined') return true
    return navigator.onLine !== false
  }

  private getSyncStorageKey(userId?: string | null) {
    return userId ? `${SYNC_STATE_PREFIX}${userId}` : null
  }

  private getDefaultSyncState(): SyncState {
    return {
      dataPending: false,
      profilePending: false,
      updatedAt: null,
      profileUpdate: {},
    }
  }

  private loadSyncState(userId = this.userId): SyncState {
    const key = this.getSyncStorageKey(userId)
    if (!key || typeof window === 'undefined') return this.getDefaultSyncState()

    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) return this.getDefaultSyncState()
      const parsed = JSON.parse(raw)
      return {
        ...this.getDefaultSyncState(),
        ...(parsed || {}),
        profileUpdate:
          parsed?.profileUpdate && typeof parsed.profileUpdate === 'object'
            ? parsed.profileUpdate
            : {},
      }
    } catch {
      return this.getDefaultSyncState()
    }
  }

  private saveSyncState(state: SyncState, userId = this.userId) {
    const key = this.getSyncStorageKey(userId)
    if (!key || typeof window === 'undefined') return

    try {
      if (!state.dataPending && !state.profilePending) {
        window.localStorage.removeItem(key)
        return
      }
      window.localStorage.setItem(key, JSON.stringify(state))
    } catch (error) {
      console.error('Lỗi lưu trạng thái đồng bộ StudyHub:', error)
    }
  }

  private markDataPending(data: OnlineData) {
    if (!this.userId) return
    const current = this.loadSyncState()
    this.saveSyncState({
      ...current,
      dataPending: true,
      updatedAt: new Date().toISOString(),
    })
    // Keep the latest snapshot in the account LocalStorage key itself.
    this.saveLocalData(this.getStorageKey(this.userId), data)
  }

  private markProfilePending(update: Record<string, unknown>) {
    if (!this.userId) return
    const current = this.loadSyncState()
    this.saveSyncState({
      ...current,
      profilePending: true,
      updatedAt: new Date().toISOString(),
      profileUpdate: {
        ...current.profileUpdate,
        ...update,
      },
    })
  }

  private clearDataPending() {
    if (!this.userId) return
    const state = this.loadSyncState()
    this.saveSyncState({
      ...state,
      dataPending: false,
    })
  }

  private clearProfilePending() {
    if (!this.userId) return
    const state = this.loadSyncState()
    this.saveSyncState({
      ...state,
      profilePending: false,
      profileUpdate: {},
    })
  }

  private async syncPendingData() {
    if (!this.userId || !this.isOnline() || this.syncInProgress) return false

    this.syncInProgress = true
    const syncingUserId = this.userId

    try {
      let state = this.loadSyncState(syncingUserId)
      const accountKey = this.getStorageKey(syncingUserId)
      const localData = this.loadLocalData(accountKey)

      // Always upload the latest complete local snapshot first.
      if (state.dataPending && localData) {
        const { error } = await supabase
          .from('user_data')
          .upsert(
            {
              user_id: syncingUserId,
              data: localData,
              updated_at: state.updatedAt || new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )

        if (error) {
          console.error('Lỗi đồng bộ dữ liệu offline:', error)
          return false
        }

        this.clearDataPending()
      }

      state = this.loadSyncState(syncingUserId)

      if (state.profilePending && Object.keys(state.profileUpdate).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update({
            ...state.profileUpdate,
            updated_at: new Date().toISOString(),
          })
          .eq('id', syncingUserId)

        if (error) {
          console.error('Lỗi đồng bộ profile offline:', error)
          return false
        }

        this.clearProfilePending()
      }

      // Backup is only created after the main user_data has successfully reached cloud.
      if (localData && !this.loadSyncState(syncingUserId).dataPending) {
        void this.createAutomaticBackup(localData)
      }

      return true
    } catch (error) {
      console.error('Lỗi sync offline StudyHub:', error)
      return false
    } finally {
      this.syncInProgress = false
    }
  }

  // =========================================================
  // LOAD DATA
  // =========================================================

  async init() {
    if (this.loading) return
    this.loading = true

    try {
      const user = await this.getCurrentUser()

      if (!user) {
        this.userId = null
        const localData = this.loadLocalData(ANONYMOUS_STORAGE_KEY)
        const data = localData ?? this.createDefaultData()
        this.applyData(data)
        if (!localData) this.saveLocalData(ANONYMOUS_STORAGE_KEY, data)
        this.notify()
        return
      }

      const previousUserId = this.userId
      this.userId = user.id
      const accountStorageKey = this.getStorageKey(user.id)
      const localAccountData = this.loadLocalData(accountStorageKey)
      const syncState = this.loadSyncState(user.id)

      // IMPORTANT: render the local snapshot first. This is what makes the app
      // behave the same online and offline and prevents cloud data from flashing in.
      if (localAccountData) {
        this.applyData(localAccountData)
        this.notify()
      } else {
        this.applyData(this.createDefaultData())
        this.saveLocalData(accountStorageKey, this.getAllData())
      }

      // Offline: local data is enough. Nothing should be allowed to overwrite it.
      if (!this.isOnline()) {
        this.notify()
        return
      }

      // If there are local changes waiting, sync them before asking cloud for a
      // snapshot. Otherwise an old cloud snapshot could overwrite offline work.
      if (syncState.dataPending || syncState.profilePending) {
        await this.syncPendingData()
        await this.loadProfile(user.id, true)
        this.notify()
        return
      }

      // Online and no pending local changes: compare/use the cloud snapshot.
      const {
        data: row,
        error,
      } = await supabase
        .from('user_data')
        .select('data, updated_at')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Lỗi tải dữ liệu StudyHub từ Supabase:', error)
        await this.loadProfile(user.id, true)
        this.notify()
        return
      }

      if (row?.data) {
        const cloudData = this.mergeData(this.createDefaultData(), row.data)
        this.applyData(cloudData)
        this.saveLocalData(accountStorageKey, cloudData)
      } else {
        const initialData = localAccountData ?? this.createDefaultData()
        this.applyData(initialData)

        const { error: insertError } = await supabase
          .from('user_data')
          .upsert(
            {
              user_id: user.id,
              data: initialData,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )

        if (insertError) {
          console.error('Lỗi tạo dữ liệu StudyHub trên Supabase:', insertError)
          this.markDataPending(initialData)
        }
      }

      await this.loadProfile(user.id, false)
      this.saveLocalData(accountStorageKey, this.getAllData())

      if (previousUserId !== this.userId || localAccountData) {
        this.notify()
      } else {
        this.notify()
      }
    } catch (error) {
      console.error('DataService init error:', error)

      // Last-resort local recovery when auth/cloud is unavailable.
      if (this.userId) {
        const localData = this.loadLocalData(this.getStorageKey(this.userId))
        if (localData) {
          this.applyData(localData)
          this.notify()
        }
      }
    } finally {
      this.loading = false
    }
  }

  private mergeData(
    defaults: OnlineData,
    saved: any
  ): OnlineData {
    if (
      !saved ||
      typeof saved !==
      'object'
    ) {
      return defaults
    }

    return {
      ...defaults,
      ...saved,

      subjects:
        Array.isArray(
          saved.subjects
        )
          ? saved.subjects
          : defaults.subjects,

      resources:
        Array.isArray(
          saved.resources
        )
          ? saved.resources
          : defaults.resources,

      quickLinks:
        Array.isArray(
          saved.quickLinks
        )
          ? saved.quickLinks
          : defaults.quickLinks,

      notes:
        Array.isArray(
          saved.notes
        )
          ? saved.notes
          : defaults.notes,

      formulas:
        Array.isArray(
          saved.formulas
        )
          ? saved.formulas
          : defaults.formulas,

      settings: {
        ...defaults.settings,
        ...(saved.settings || {}),
      },

      profile: {
        ...defaults.profile,
        ...(saved.profile || {}),
      },

      equipment:
        Array.isArray(
          saved.equipment
        )
          ? saved.equipment
          : defaults.equipment,

      stages:
        Array.isArray(
          saved.stages
        )
          ? saved.stages
          : defaults.stages,

      dailyRewards:
        Array.isArray(
          saved.dailyRewards
        )
          ? saved.dailyRewards
          : defaults.dailyRewards,

      leaderboard:
        Array.isArray(
          saved.leaderboard
        )
          ? saved.leaderboard
          : defaults.leaderboard,

      coins:
        typeof saved.coins ===
        'number'
          ? saved.coins
          : defaults.coins,

      combat:
        saved.combat &&
        typeof saved.combat ===
        'object'
          ? saved.combat
          : defaults.combat,

      initialized:
        saved.initialized ??
        true,
    }
  }

  private applyData(
    data: OnlineData
  ) {
    this.subjects =
      Array.isArray(
        data.subjects
      )
        ? data.subjects
        : []

    this.resources =
      Array.isArray(
        data.resources
      )
        ? data.resources
        : []

    this.quickLinks =
      Array.isArray(
        data.quickLinks
      )
        ? data.quickLinks
        : []

    this.notes =
      Array.isArray(
        data.notes
      )
        ? data.notes
        : []

    this.formulas =
      Array.isArray(
        data.formulas
      )
        ? data.formulas
        : []

    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(data.settings || {}),
    }

    this.profile = {
      ...DEFAULT_PROFILE,
      ...(data.profile || {}),
    }

    this.equipment =
      Array.isArray(
        data.equipment
      )
        ? data.equipment
        : []

    this.stages =
      Array.isArray(
        data.stages
      )
        ? data.stages
        : []

    this.dailyRewards =
      Array.isArray(
        data.dailyRewards
      )
        ? data.dailyRewards
        : []

    this.leaderboard =
      Array.isArray(
        data.leaderboard
      )
        ? data.leaderboard
        : []

    this.combat =
      data.combat &&
      typeof data.combat ===
      'object'
        ? data.combat
        : {}

    if (
      typeof data.coins ===
      'number'
    ) {
      this.profile.coins =
        data.coins
    }
  }

  // =========================================================
  // BACKUP HELPERS
  // =========================================================

  getDataForBackup(): OnlineData {
    return JSON.parse(
      JSON.stringify(this.getAllData())
    )
  }

  private isPremiumEnabled(): boolean {
    if (!this.userId || typeof window === 'undefined') {
      return false
    }

    try {
      return (
        window.localStorage.getItem(
          `${PREMIUM_STORAGE_PREFIX}${this.userId}`
        ) === 'true'
      )
    } catch {
      return false
    }
  }

  private getBackupSignature(data: OnlineData): string {
    return JSON.stringify(data)
  }

  private getSavedBackupSignature(): string | null {
    if (!this.userId || typeof window === 'undefined') {
      return null
    }

    try {
      return window.localStorage.getItem(
        `${BACKUP_SIGNATURE_PREFIX}${this.userId}`
      )
    } catch {
      return null
    }
  }

  private saveBackupSignature(signature: string) {
    if (!this.userId || typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(
        `${BACKUP_SIGNATURE_PREFIX}${this.userId}`,
        signature
      )
    } catch {
      // Cache chỉ dùng để chống backup trùng, không ảnh hưởng dữ liệu chính.
    }
  }

  private async createAutomaticBackup(data: OnlineData) {
    if (!this.userId || !this.isPremiumEnabled()) {
      return
    }

    const signature = this.getBackupSignature(data)
    const savedSignature = this.getSavedBackupSignature()

    // Không có thay đổi thật sự -> tuyệt đối không tạo backup mới.
    if (savedSignature === signature) {
      return
    }

    try {
      // Lần đầu chưa có signature local: kiểm tra bản backup mới nhất một lần
      // để tránh tạo bản sao trùng sau khi đổi thiết bị / xóa cache trình duyệt.
      if (!savedSignature) {
        const { data: latest } = await supabase
          .from('user_backups')
          .select('data')
          .eq('user_id', this.userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (latest?.data) {
          const latestSignature = JSON.stringify(latest.data)
          if (latestSignature === signature) {
            this.saveBackupSignature(signature)
            return
          }
        }
      }

      const {
        data: existingBackups,
        error: fetchError,
      } = await supabase
        .from('user_backups')
        .select('id, created_at, is_pinned')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: true })

      if (fetchError) {
        console.error('Lỗi kiểm tra giới hạn backup tự động:', fetchError)
        return
      }

      const backups = existingBackups ?? []

      if (backups.length >= MAX_BACKUPS) {
        const overflow = backups.length - MAX_BACKUPS + 1
        const removable = backups
          .filter((backup) => backup.is_pinned === false)
          .slice(0, overflow)

        if (removable.length < overflow) {
          console.warn(
            'Đã đủ 20 backup và tất cả backup cũ cần giữ đều đã được ghim. Bỏ qua backup mới.'
          )
          return
        }

        const ids = removable.map((backup) => backup.id)
        const { error: deleteError } = await supabase
          .from('user_backups')
          .delete()
          .in('id', ids)
          .eq('user_id', this.userId)

        if (deleteError) {
          console.error('Lỗi dọn backup cũ:', deleteError)
          return
        }
      }

      const { error: insertError } = await supabase
        .from('user_backups')
        .insert({
          user_id: this.userId,
          data,
          is_pinned: false,
        })

      if (insertError) {
        console.error('Lỗi tạo backup tự động:', insertError)
        return
      }

      this.saveBackupSignature(signature)
    } catch (error) {
      console.error('Lỗi backup tự động:', error)
    }
  }

  async createManualBackup(): Promise<{
    success: boolean
    error?: string
  }> {
    if (!this.userId) {
      return {
        success: false,
        error: 'Bạn cần đăng nhập để lưu bản sao lưu',
      }
    }

    if (!this.isPremiumEnabled()) {
      return {
        success: false,
        error: 'Tính năng sao lưu dành cho Premium',
      }
    }

    const data = this.getDataForBackup()

    try {
      const {
        data: existingBackups,
        error: fetchError,
      } = await supabase
        .from('user_backups')
        .select('id, created_at, is_pinned')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: true })

      if (fetchError) {
        return { success: false, error: fetchError.message }
      }

      const backups = existingBackups ?? []

      if (backups.length >= MAX_BACKUPS) {
        const oldestUnpinned = backups.find(
          (backup) => backup.is_pinned === false
        )

        if (!oldestUnpinned) {
          return {
            success: false,
            error:
              'Đã đủ 20 bản sao lưu và tất cả đều đã được ghim. Hãy bỏ ghim hoặc xóa một bản để tiếp tục.',
          }
        }

        const { error: deleteError } = await supabase
          .from('user_backups')
          .delete()
          .eq('id', oldestUnpinned.id)
          .eq('user_id', this.userId)

        if (deleteError) {
          return { success: false, error: deleteError.message }
        }
      }

      const { error: insertError } = await supabase
        .from('user_backups')
        .insert({
          user_id: this.userId,
          data,
          is_pinned: false,
        })

      if (insertError) {
        return { success: false, error: insertError.message }
      }

      this.saveBackupSignature(this.getBackupSignature(data))
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Không thể tạo bản sao lưu',
      }
    }
  }

  // =========================================================
  // GET ALL DATA
  // =========================================================

  private getAllData(): OnlineData {
    return {
      subjects:
        this.subjects,

      resources:
        this.resources,

      quickLinks:
        this.quickLinks,

      settings:
        this.settings,

      notes:
        this.notes,

      formulas:
        this.formulas,

      profile:
        this.profile,

      equipment:
        this.equipment,

      stages:
        this.stages,

      dailyRewards:
        this.dailyRewards,

      leaderboard:
        this.leaderboard,

      coins:
        this.profile.coins ||
        0,

      combat:
        this.combat,

      initialized:
        true,
    }
  }

  // =========================================================
  // SAVE EVERYTHING
  // =========================================================

  private async saveAll() {
    const data = this.getAllData()
    const localKey = this.getStorageKey(this.userId)

    // LocalStorage is ALWAYS updated first. The UI never waits for the network.
    this.saveLocalData(localKey, data)

    if (!this.userId) return true

    this.markDataPending(data)

    // Online is an optimization, not a requirement.
    if (this.isOnline()) {
      return this.syncPendingData()
    }

    return true
  }

  private save() {
    if (
      this.saveTimer
    ) {
      clearTimeout(
        this.saveTimer
      )
    }

    this.saveTimer =
      setTimeout(() => {
        this.saveTimer = null

        void this.saveAll()
      }, 150)
  }

  // =========================================================
  // STATS
  // =========================================================

  getStats() {
    return {
      totalSubjects:
        this.subjects.length,

      totalResources:
        this.resources.length,

      totalLinks:
        this.quickLinks.length,

      totalFavorites:
        this.resources.filter(
          (resource) =>
            resource.favorite
        ).length,

      totalNotes:
        this.notes.length,

      totalFormulas:
        this.formulas.length,
    }
  }

  // =========================================================
  // RESET
  // =========================================================

  resetToDefault(): boolean {
    const data =
      this.createDefaultData()

    this.applyData(data)

    this.save()

    this.notify()

    return true
  }

  // =========================================================
  // PROFILE
  // =========================================================

  private async loadProfile(
    userId: string,
    localFirst = false
  ) {
    // When offline or when there is a pending profile update, local profile is
    // authoritative until the queued update reaches Supabase.
    const pending = this.loadSyncState(userId).profilePending
    if (!this.isOnline() || pending) return

    const {
      data,
      error,
    } = await supabase
      .from('profiles')
      .select(
        'id, username, avatar_url, level, exp, coins, last_check_in'
      )
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Lỗi lấy profile:', error)
      return
    }

    if (data) {
      this.profile = {
        ...this.profile,
        id: data.id,
        name: data.username || this.profile.name,
        username: data.username || this.profile.name,
        avatar: data.avatar_url || this.profile.avatar,
        avatar_url: data.avatar_url,
        level: data.level ?? 1,
        exp: data.exp ?? 0,
        coins: data.coins ?? 0,
        lastCheckIn: data.last_check_in,
      }
      return
    }

    const user = await this.getCurrentUser()
    const username =
      user?.email?.split('@')[0] || 'Người dùng'

    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username,
        avatar_url: null,
        level: 1,
        exp: 0,
        coins: 0,
        last_check_in: null,
        updated_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Lỗi tạo profile:', insertError)
      return
    }

    this.profile = {
      ...this.profile,
      id: userId,
      name: username,
      username,
      coins: 0,
    }
  }

  getProfile(): UserProfile {
    return {
      ...this.profile,
    } as UserProfile
  }

  updateProfile(
    data: Partial<
      Pick<
        UserProfile,
        'name' |
        'avatar'
      >
    >
  ) {
    this.profile = {
      ...this.profile,
      ...data,
    }

    const update: any = {
      updated_at:
        new Date().toISOString(),
    }

    if (
      data.name !==
      undefined
    ) {
      update.username =
        data.name

      this.profile.username =
        data.name
    }

    if (
      data.avatar !==
      undefined
    ) {
      update.avatar_url =
        data.avatar

      this.profile.avatar_url =
        data.avatar
    }

    if (this.userId) {
      this.markProfilePending(update)
    }

    this.save()
    this.notify()

    return {
      success:
        true,

      profile:
        this.profile,
    }
  }

  // =========================================================
  // EXP / COINS / LEVEL
  // =========================================================

  addCoins(
    amount: number
  ) {
    if (
      !Number.isFinite(
        amount
      )
    ) {
      return this.profile.coins || 0
    }

    this.profile.coins =
      (this.profile.coins ||
        0) +
      amount

    // Coin của tài khoản đăng nhập được lưu
    // trực tiếp vào profiles.coins
    if (this.userId) {
      this.markProfilePending({
        coins: this.profile.coins,
      })
    }

    // Vẫn lưu local + user_data như các dữ liệu khác
    this.save()
    this.notify()

    return this.profile.coins
  }

  addExp(
    amount: number
  ) {
    if (
      !Number.isFinite(
        amount
      )
    ) {
      return false
    }

    let exp =
      (this.profile.exp ||
        0) +
      amount

    let level =
      this.profile.level ||
      1

    while (
      exp >=
      level * 10
    ) {
      exp -=
        level * 10

      level++
    }

    this.profile.exp =
      exp

    this.profile.level =
      level

    if (this.userId) {
      this.markProfilePending({
        level,
        exp,
      })
    }

    this.save()
    this.notify()

    return true
  }

  updateStreak() {
    const today =
      this.getToday()

    if (
      this.profile.lastCheckIn ===
      today
    ) {
      return false
    }

    this.profile.streak =
      (this.profile.streak ||
        0) +
      1

    this.profile.lastCheckIn =
      today

    if (this.userId) {
      this.markProfilePending({
        last_check_in: today,
      })
    }

    this.save()
    this.notify()

    return true
  }

  getExpProgress() {
    const level =
      this.profile.level ||
      1

    const exp =
      this.profile.exp ||
      0

    const required =
      level * 10

    return {
      level,

      exp,

      currentExp:
        exp,

      requiredExp:
        required,

      maxExp:
        required,

      progress:
        required > 0
          ? Math.min(
              100,
              (exp /
                required) *
                100
            )
          : 0,
    }
  }

  // =========================================================
  // DAILY CHECK-IN
  // =========================================================

  private getToday() {
    const now =
      new Date()

    const year =
      now.getFullYear()

    const month =
      String(
        now.getMonth() +
          1
      ).padStart(
        2,
        '0'
      )

    const day =
      String(
        now.getDate()
      ).padStart(
        2,
        '0'
      )

    return `${year}-${month}-${day}`
  }

  getDailyRewards(): DailyReward[] {
    return this.dailyRewards as DailyReward[]
  }

  canCheckInToday() {
    return (
      this.profile.lastCheckIn !==
      this.getToday()
    )
  }

  getNextCheckInDay() {
    if (
      this.canCheckInToday()
    ) {
      return 1
    }

    return 2
  }

  claimDailyReward() {
    if (
      !this.canCheckInToday()
    ) {
      return {
        success:
          false,

        error:
          'Bạn đã điểm danh hôm nay',
      }
    }

    const beforeLevel =
      this.profile.level ||
      1

    this.addExp(
      10
    )

    this.updateStreak()

    const levelUp =
      this.profile.level >
      beforeLevel

    this.save()
    this.notify()

    return {
      success:
        true,

      exp:
        10,

      levelUp,

      level:
        this.profile.level,
    }
  }

  // =========================================================
  // LEADERBOARD
  // =========================================================

  getLeaderboard(
    limit = 100
  ): LeaderboardEntry[] {
    return this.leaderboard
      .slice(
        0,
        limit
      ) as LeaderboardEntry[]
  }

  getUserRank():
    | LeaderboardEntry
    | undefined {
    return this.leaderboard.find(
      (item: any) =>
        item.userId ===
          this.userId ||
        item.id ===
          this.userId
    ) as
      | LeaderboardEntry
      | undefined
  }

  // =========================================================
  // EQUIPMENT
  // =========================================================

  getEquipment(): Equipment[] {
    return this.equipment as Equipment[]
  }

  getEquippedBySlot(
    slot: EquipmentSlot
  ) {
    return this.equipment.find(
      (item: any) =>
        item.slot ===
          slot &&
        item.equipped
    )
  }

  getInventory(): Equipment[] {
    return this.equipment.filter(
      (item: any) =>
        !item.equipped
    ) as Equipment[]
  }

  equipItem(
    id: string
  ) {
    const item =
      this.equipment.find(
        (x: any) =>
          x.id === id
      )

    if (!item) {
      return false
    }

    this.equipment.forEach(
      (x: any) => {
        if (
          x.slot ===
          item.slot
        ) {
          x.equipped =
            false
        }
      }
    )

    item.equipped =
      true

    this.save()
    this.notify()

    return true
  }

  unequipItem(
    id: string
  ) {
    const item =
      this.equipment.find(
        (x: any) =>
          x.id === id
      )

    if (!item) {
      return false
    }

    item.equipped =
      false

    this.save()
    this.notify()

    return true
  }

  enhanceEquipment(
    id: string
  ) {
    const item =
      this.equipment.find(
        (x: any) =>
          x.id === id
      )

    if (!item) {
      return false
    }

    item.level =
      (item.level ||
        0) +
      1

    this.save()
    this.notify()

    return true
  }

  // =========================================================
  // COMBAT
  // =========================================================

  upgradeCombat() {
    this.combat.level =
      (this.combat.level ||
        0) +
      1

    this.save()
    this.notify()

    return true
  }

  // =========================================================
  // STAGES
  // =========================================================

  getStages(): Stage[] {
    return this.stages as Stage[]
  }

  getStage(
    id: number
  ) {
    return this.stages.find(
      (stage: any) =>
        stage.id === id
    ) as
      | Stage
      | undefined
  }

  completeStage(
    stageId: number
  ) {
    const stage =
      this.getStage(
        stageId
      ) as any

    if (!stage) {
      return false
    }

    stage.completed =
      true

    this.save()
    this.notify()

    return true
  }

  sweepStage(
    stageId: number,
    times = 1
  ) {
    const stage =
      this.getStage(
        stageId
      ) as any

    if (!stage) {
      return false
    }

    stage.completed =
      true

    this.save()
    this.notify()

    return {
      success:
        true,

      stage,

      times,
    }
  }

  // =========================================================
  // SUBJECTS
  // =========================================================

  getSubjects(): Subject[] {
    return [
      ...this.subjects,
    ].sort(
      (a, b) =>
        b.createdAt.localeCompare(
          a.createdAt
        )
    )
  }

  getSubjectById(
    id: string
  ) {
    return this.subjects.find(
      (subject) =>
        subject.id ===
        id
    )
  }

  searchSubjects(
    query: string
  ) {
    const q =
      query
        .toLowerCase()
        .trim()

    if (!q) {
      return this.getSubjects()
    }

    return this.subjects.filter(
      (subject) =>
        subject.name
          .toLowerCase()
          .includes(q) ||
        subject.code
          .toLowerCase()
          .includes(q) ||
        subject.teacher
          .toLowerCase()
          .includes(q) ||
        subject.description
          .toLowerCase()
          .includes(q)
    )
  }

  addSubject(
    data: Omit<
      Subject,
      'id' |
      'createdAt'
    >
  ) {
    const nameError =
      validateRequired(
        data.name,
        'Tên môn học'
      )

    if (nameError) {
      return {
        success:
          false,

        error:
          nameError,
      }
    }

    const subject:
      Subject = {
        ...data,

        name:
          sanitizeString(
            data.name
          ),

        code:
          sanitizeString(
            data.code
          ),

        teacher:
          sanitizeString(
            data.teacher
          ),

        description:
          sanitizeString(
            data.description
          ),

        id:
          generateId(
            'sub'
          ),

        createdAt:
          new Date().toISOString(),
      }

    this.subjects.push(
      subject
    )

    this.save()
    this.notify()

    return {
      success:
        true,

      subject,
    }
  }

  updateSubject(
    id: string,
    data: Partial<
      Omit<
        Subject,
        'id' |
        'createdAt'
      >
    >
  ) {
    const index =
      this.subjects.findIndex(
        (subject) =>
          subject.id ===
          id
      )

    if (
      index === -1
    ) {
      return {
        success:
          false,

        error:
          'Không tìm thấy môn học',
      }
    }

    if (
      data.name !==
      undefined
    ) {
      const error =
        validateRequired(
          data.name,
          'Tên môn học'
        )

      if (error) {
        return {
          success:
            false,

          error,
        }
      }
    }

    const current =
      this.subjects[index]

    const updated:
      Subject = {
        ...current,
        ...data,

        name:
          data.name !==
          undefined
            ? sanitizeString(
                data.name
              )
            : current.name,

        code:
          data.code !==
          undefined
            ? sanitizeString(
                data.code
              )
            : current.code,

        teacher:
          data.teacher !==
          undefined
            ? sanitizeString(
                data.teacher
              )
            : current.teacher,

        description:
          data.description !==
          undefined
            ? sanitizeString(
                data.description
              )
            : current.description,
      }

    this.subjects[index] =
      updated

    this.save()
    this.notify()

    return {
      success:
        true,

      subject:
        updated,
    }
  }

  deleteSubject(
    id: string
  ): boolean {
    const resourceCount =
      this.resources.filter(
        (resource) =>
          resource.subjectId ===
          id
      ).length

    if (
      resourceCount > 0 &&
      typeof window !==
        'undefined'
    ) {
      const confirmed =
        window.confirm(
          `Môn học này có ${resourceCount} tài liệu. Xóa môn học sẽ xóa hết tài liệu liên quan. Tiếp tục?`
        )

      if (!confirmed) {
        return false
      }
    }

    this.subjects =
      this.subjects.filter(
        (subject) =>
          subject.id !==
          id
      )

    this.resources =
      this.resources.filter(
        (resource) =>
          resource.subjectId !==
          id
      )

    this.save()
    this.notify()

    return true
  }

  // =========================================================
  // RESOURCES
  // =========================================================

  getResources(): Resource[] {
    return [
      ...this.resources,
    ].sort(
      (a, b) =>
        b.createdAt.localeCompare(
          a.createdAt
        )
    )
  }

  getResourceById(
    id: string
  ) {
    return this.resources.find(
      (resource) =>
        resource.id ===
        id
    )
  }

  getResourcesBySubject(
    subjectId: string
  ) {
    return this.resources
      .filter(
        (resource) =>
          resource.subjectId ===
          subjectId
      )
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(
            a.createdAt
          )
      )
  }

  getFavoriteResources() {
    return this.resources
      .filter(
        (resource) =>
          resource.favorite
      )
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(
            a.createdAt
          )
      )
  }

  getRecentResources(
    limit = 5
  ) {
    return [
      ...this.resources,
    ]
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(
            a.createdAt
          )
      )
      .slice(
        0,
        limit
      )
  }

  searchResources(params: {
    query?: string
    subjectId?: string
    type?:
      | ResourceType
      | 'all'
      | 'favorite'
    sort?: SortOption
  }) {
    let result = [
      ...this.resources,
    ]

    const {
      query,
      subjectId,
      type,
      sort = 'newest',
    } = params

    if (subjectId) {
      result =
        result.filter(
          (resource) =>
            resource.subjectId ===
            subjectId
        )
    }

    if (
      type &&
      type !== 'all'
    ) {
      if (
        type ===
        'favorite'
      ) {
        result =
          result.filter(
            (resource) =>
              resource.favorite
          )
      } else {
        result =
          result.filter(
            (resource) =>
              resource.type ===
              type
          )
      }
    }

    if (
      query &&
      query.trim()
    ) {
      const q =
        query
          .toLowerCase()
          .trim()

      result =
        result.filter(
          (resource) => {
            const subject =
              this.subjects.find(
                (item) =>
                  item.id ===
                  resource.subjectId
              )

            return (
              resource.title
                .toLowerCase()
                .includes(q) ||
              resource.description
                .toLowerCase()
                .includes(q) ||
              !!subject?.name
                .toLowerCase()
                .includes(q) ||
              resource.tags.some(
                (tag) =>
                  tag
                    .toLowerCase()
                    .includes(q)
              )
            )
          }
        )
    }

    switch (sort) {
      case 'newest':
        result.sort(
          (a, b) =>
            b.createdAt.localeCompare(
              a.createdAt
            )
        )
        break

      case 'oldest':
        result.sort(
          (a, b) =>
            a.createdAt.localeCompare(
              b.createdAt
            )
        )
        break

      case 'name_asc':
        result.sort(
          (a, b) =>
            a.title.localeCompare(
              b.title,
              'vi'
            )
        )
        break

      case 'name_desc':
        result.sort(
          (a, b) =>
            b.title.localeCompare(
              a.title,
              'vi'
            )
        )
        break
    }

    return result
  }

  addResource(
    data: Omit<
      Resource,
      'id' |
      'createdAt' |
      'favorite'
    > & {
      favorite?: boolean
    }
  ) {
    const titleError =
      validateRequired(
        data.title,
        'Tên tài liệu'
      )

    if (titleError) {
      return {
        success:
          false,

        error:
          titleError,
      }
    }

    const urlError =
      validateUrl(
        data.url
      )

    if (urlError) {
      return {
        success:
          false,

        error:
          urlError,
      }
    }

    const resource:
      Resource = {
        ...data,

        title:
          sanitizeString(
            data.title
          ),

        url:
          data.url.trim(),

        description:
          sanitizeString(
            data.description
          ),

        tags:
          data.tags
            .map((tag) =>
              sanitizeString(
                tag
              )
            )
            .filter(
              (tag) =>
                tag.length >
                0
            ),

        favorite:
          data.favorite ??
          false,

        id:
          generateId(
            'res'
          ),

        createdAt:
          new Date().toISOString(),
      }

    this.resources.push(
      resource
    )

    this.save()
    this.notify()

    return {
      success:
        true,

      resource,
    }
  }

  updateResource(
    id: string,
    data: Partial<
      Omit<
        Resource,
        'id' |
        'createdAt'
      >
    >
  ) {
    const index =
      this.resources.findIndex(
        (resource) =>
          resource.id ===
          id
      )

    if (
      index === -1
    ) {
      return {
        success:
          false,

        error:
          'Không tìm thấy tài liệu',
      }
    }

    if (
      data.title !==
      undefined
    ) {
      const error =
        validateRequired(
          data.title,
          'Tên tài liệu'
        )

      if (error) {
        return {
          success:
            false,

          error,
        }
      }
    }

    if (
      data.url !==
      undefined
    ) {
      const error =
        validateUrl(
          data.url
        )

      if (error) {
        return {
          success:
            false,

          error,
        }
      }
    }

    const current =
      this.resources[index]

    const updated:
      Resource = {
        ...current,
        ...data,

        title:
          data.title !==
          undefined
            ? sanitizeString(
                data.title
              )
            : current.title,

        url:
          data.url !==
          undefined
            ? data.url.trim()
            : current.url,

        description:
          data.description !==
          undefined
            ? sanitizeString(
                data.description
              )
            : current.description,

        tags:
          data.tags !==
          undefined
            ? data.tags
                .map((tag) =>
                  sanitizeString(
                    tag
                  )
                )
                .filter(
                  (tag) =>
                    tag.length >
                    0
                )
            : current.tags,
      }

    this.resources[index] =
      updated

    this.save()
    this.notify()

    return {
      success:
        true,

      resource:
        updated,
    }
  }

  deleteResource(
    id: string
  ): boolean {
    const before =
      this.resources.length

    this.resources =
      this.resources.filter(
        (resource) =>
          resource.id !==
          id
      )

    if (
      before ===
      this.resources.length
    ) {
      return false
    }

    this.save()
    this.notify()

    return true
  }

  toggleFavorite(
    id: string
  ): boolean {
    const index =
      this.resources.findIndex(
        (resource) =>
          resource.id ===
          id
      )

    if (
      index === -1
    ) {
      return false
    }

    this.resources[index]
      .favorite =
      !this.resources[index]
        .favorite

    this.save()
    this.notify()

    return true
  }

  // =========================================================
  // QUICK LINKS
  // =========================================================

  getQuickLinks() {
    return [
      ...this.quickLinks,
    ].sort(
      (a, b) => {
        if (
          a.pinned !==
          b.pinned
        ) {
          return b.pinned
            ? 1
            : -1
        }

        return b.createdAt.localeCompare(
          a.createdAt
        )
      }
    )
  }

  addQuickLink(
    data: Omit<
      QuickLink,
      'id' |
      'createdAt' |
      'pinned'
    > & {
      pinned?: boolean
    }
  ) {
    const titleError =
      validateRequired(
        data.title,
        'Tên link'
      )

    if (titleError) {
      return {
        success:
          false,

        error:
          titleError,
      }
    }

    const urlError =
      validateUrl(
        data.url
      )

    if (urlError) {
      return {
        success:
          false,

        error:
          urlError,
      }
    }

    const quickLink:
      QuickLink = {
        ...data,

        title:
          sanitizeString(
            data.title
          ),

        url:
          data.url.trim(),

        pinned:
          data.pinned ??
          false,

        id:
          generateId(
            'ql'
          ),

        createdAt:
          new Date().toISOString(),
      }

    this.quickLinks.push(
      quickLink
    )

    this.save()
    this.notify()

    return {
      success:
        true,

      quickLink,
    }
  }

  updateQuickLink(
    id: string,
    data: Partial<
      Omit<
        QuickLink,
        'id' |
        'createdAt'
      >
    >
  ) {
    const index =
      this.quickLinks.findIndex(
        (link) =>
          link.id ===
          id
      )

    if (
      index === -1
    ) {
      return {
        success:
          false,

        error:
          'Không tìm thấy link',
      }
    }

    const current =
      this.quickLinks[index]

    const updated:
      QuickLink = {
        ...current,
        ...data,

        title:
          data.title !==
          undefined
            ? sanitizeString(
                data.title
              )
            : current.title,

        url:
          data.url !==
          undefined
            ? data.url.trim()
            : current.url,
      }

    this.quickLinks[index] =
      updated

    this.save()
    this.notify()

    return {
      success:
        true,

      quickLink:
        updated,
    }
  }

  deleteQuickLink(
    id: string
  ): boolean {
    const before =
      this.quickLinks.length

    this.quickLinks =
      this.quickLinks.filter(
        (link) =>
          link.id !==
          id
      )

    if (
      before ===
      this.quickLinks.length
    ) {
      return false
    }

    this.save()
    this.notify()

    return true
  }

  togglePinQuickLink(
    id: string
  ): boolean {
    const index =
      this.quickLinks.findIndex(
        (link) =>
          link.id ===
          id
      )

    if (
      index === -1
    ) {
      return false
    }

    this.quickLinks[index]
      .pinned =
      !this.quickLinks[index]
        .pinned

    this.save()
    this.notify()

    return true
  }

  // =========================================================
  // NOTES
  // =========================================================

  getNotes(): Note[] {
    return [
      ...this.notes,
    ].sort(
      (a, b) =>
        b.updatedAt.localeCompare(
          a.updatedAt
        )
    )
  }

  getNoteById(
    id: string
  ) {
    return this.notes.find(
      (note) =>
        note.id === id
    )
  }

  searchNotes(
    query: string
  ) {
    const q =
      query
        .toLowerCase()
        .trim()

    if (!q) {
      return this.getNotes()
    }

    return this.notes
      .filter(
        (note) =>
          note.title
            .toLowerCase()
            .includes(q) ||
          note.content
            .toLowerCase()
            .includes(q)
      )
      .sort(
        (a, b) =>
          b.updatedAt.localeCompare(
            a.updatedAt
          )
      )
  }

  addNote(
    data: Omit<
      Note,
      'id' |
      'createdAt' |
      'updatedAt'
    >
  ) {
    const titleError =
      validateRequired(
        data.title,
        'Tiêu đề ghi chú'
      )

    if (titleError) {
      return {
        success:
          false,

        error:
          titleError,
      }
    }

    const now =
      new Date().toISOString()

    const note:
      Note = {
        ...data,

        title:
          sanitizeString(
            data.title
          ),

        content:
          data.content ??
          '',

        images:
          Array.isArray(
            data.images
          )
            ? data.images
            : [],

        id:
          generateId(
            'note'
          ),

        createdAt:
          now,

        updatedAt:
          now,
      }

    this.notes.push(
      note
    )

    this.save()
    this.notify()

    return {
      success:
        true,

      note,
    }
  }

  updateNote(
    id: string,
    data: Partial<
      Omit<
        Note,
        'id' |
        'createdAt'
      >
    >
  ) {
    const index =
      this.notes.findIndex(
        (note) =>
          note.id === id
      )

    if (
      index === -1
    ) {
      return {
        success:
          false,

        error:
          'Không tìm thấy ghi chú',
      }
    }

    const current =
      this.notes[index]

    const updated:
      Note = {
        ...current,
        ...data,

        title:
          data.title !==
          undefined
            ? sanitizeString(
                data.title
              )
            : current.title,

        content:
          data.content !==
          undefined
            ? data.content
            : current.content,

        images:
          data.images !==
          undefined
            ? data.images
            : current.images,

        updatedAt:
          new Date().toISOString(),
      }

    this.notes[index] =
      updated

    this.save()
    this.notify()

    return {
      success:
        true,

      note:
        updated,
    }
  }

  deleteNote(
    id: string
  ): boolean {
    const before =
      this.notes.length

    this.notes =
      this.notes.filter(
        (note) =>
          note.id !== id
      )

    if (
      before ===
      this.notes.length
    ) {
      return false
    }

    this.save()
    this.notify()

    return true
  }

  // =========================================================
  // FORMULAS
  // =========================================================

  getFormulas(): Formula[] {
    return [
      ...this.formulas,
    ].sort(
      (a, b) =>
        b.updatedAt.localeCompare(
          a.updatedAt
        )
    )
  }

  getFormulaById(
    id: string
  ) {
    return this.formulas.find(
      (formula) =>
        formula.id ===
        id
    )
  }

  searchFormulas(
    query: string
  ) {
    const q =
      query
        .toLowerCase()
        .trim()

    if (!q) {
      return this.getFormulas()
    }

    return this.formulas
      .filter(
        (formula) =>
          formula.title
            .toLowerCase()
            .includes(q) ||
          formula.content
            .toLowerCase()
            .includes(q)
      )
      .sort(
        (a, b) =>
          b.updatedAt.localeCompare(
            a.updatedAt
          )
      )
  }

  addFormula(
    data: Omit<
      Formula,
      'id' |
      'createdAt' |
      'updatedAt'
    >
  ) {
    const titleError =
      validateRequired(
        data.title,
        'Tên công thức'
      )

    if (titleError) {
      return {
        success:
          false,

        error:
          titleError,
      }
    }

    const now =
      new Date().toISOString()

    const formula:
      Formula = {
        ...data,

        title:
          sanitizeString(
            data.title
          ),

        content:
          data.content ??
          '',

        images:
          Array.isArray(
            data.images
          )
            ? data.images
            : [],

        id:
          generateId(
            'formula'
          ),

        createdAt:
          now,

        updatedAt:
          now,
      }

    this.formulas.push(
      formula
    )

    this.save()
    this.notify()

    return {
      success:
        true,

      formula,
    }
  }

  updateFormula(
    id: string,
    data: Partial<
      Omit<
        Formula,
        'id' |
        'createdAt'
      >
    >
  ) {
    const index =
      this.formulas.findIndex(
        (formula) =>
          formula.id ===
          id
      )

    if (
      index === -1
    ) {
      return {
        success:
          false,

        error:
          'Không tìm thấy công thức',
      }
    }

    const current =
      this.formulas[index]

    const updated:
      Formula = {
        ...current,
        ...data,

        title:
          data.title !==
          undefined
            ? sanitizeString(
                data.title
              )
            : current.title,

        content:
          data.content !==
          undefined
            ? data.content
            : current.content,

        images:
          data.images !==
          undefined
            ? data.images
            : current.images,

        updatedAt:
          new Date().toISOString(),
      }

    this.formulas[index] =
      updated

    this.save()
    this.notify()

    return {
      success:
        true,

      formula:
        updated,
    }
  }

  deleteFormula(
    id: string
  ): boolean {
    const before =
      this.formulas.length

    this.formulas =
      this.formulas.filter(
        (formula) =>
          formula.id !==
          id
      )

    if (
      before ===
      this.formulas.length
    ) {
      return false
    }

    this.save()
    this.notify()

    return true
  }

  // =========================================================
  // SETTINGS
  // =========================================================

  getSettings(): UserSettings {
    return {
      ...this.settings,
    }
  }

  updateSettings(
    data: Partial<UserSettings>
  ): boolean {
    this.settings = {
      ...this.settings,
      ...data,
    }

    this.save()
    this.notify()

    return true
  }

  // =========================================================
  // IMPORT / EXPORT
  // =========================================================

  exportData(): AppData {
    return {
      subjects:
        this.subjects,

      resources:
        this.resources,

      quickLinks:
        this.quickLinks,

      settings:
        this.settings,

      notes:
        this.notes,

      formulas:
        this.formulas,

      version:
        APP_VERSION,
    }
  }

  importData(
    jsonData: unknown
  ): {
    success: boolean
    error?: string
  } {
    try {
      if (
        !jsonData ||
        typeof jsonData !==
        'object'
      ) {
        return {
          success:
            false,

          error:
            'Dữ liệu không hợp lệ',
        }
      }

      const data =
        jsonData as Record<
          string,
          unknown
        >

      if (
        !Array.isArray(
          data.subjects
        ) ||
        !Array.isArray(
          data.resources
        ) ||
        !Array.isArray(
          data.quickLinks
        )
      ) {
        return {
          success:
            false,

          error:
            'Dữ liệu không hợp lệ',
        }
      }

      this.subjects =
        data.subjects as Subject[]

      this.resources =
        data.resources as Resource[]

      this.quickLinks =
        data.quickLinks as QuickLink[]

      this.notes =
        Array.isArray(
          data.notes
        )
          ? (data.notes as Note[])
          : []

      this.formulas =
        Array.isArray(
          data.formulas
        )
          ? (data.formulas as Formula[])
          : []

      if (
        data.settings &&
        typeof data.settings ===
        'object'
      ) {
        this.settings = {
          ...DEFAULT_SETTINGS,

          ...(data.settings as Partial<UserSettings>),
        }
      }

      this.save()
      this.notify()

      return {
        success:
          true,
      }
    } catch (error) {
      console.error(
        'Import error:',
        error
      )

      return {
        success:
          false,

        error:
          'Lỗi khi import dữ liệu',
      }
    }
  }
}

export const dataService =
  new DataService()