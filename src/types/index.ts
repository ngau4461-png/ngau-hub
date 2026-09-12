export type ResourceType =
  | 'document'
  | 'video'
  | 'exam'
  | 'exercise'
  | 'website'
  | 'other'

export const RESOURCE_TYPES: {
  value: ResourceType
  label: string
  icon: string
  color: string
}[] = [
  {
    value: 'document',
    label: 'Tài liệu',
    icon: '📄',
    color:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    value: 'video',
    label: 'Video',
    icon: '🎥',
    color:
      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  {
    value: 'exam',
    label: 'Đề thi',
    icon: '📝',
    color:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  {
    value: 'exercise',
    label: 'Bài tập',
    icon: '📚',
    color:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  {
    value: 'website',
    label: 'Website',
    icon: '🌐',
    color:
      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  {
    value: 'other',
    label: 'Link khác',
    icon: '🔗',
    color:
      'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-400',
  },
]

export const SUBJECT_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#6366f1',
  '#14b8a6',
  '#a855f7',
  '#84cc16',
]

export const SUBJECT_ICONS = [
  'BookOpen',
  'Calculator',
  'Atom',
  'FlaskConical',
  'Languages',
  'Music',
  'Palette',
  'Code2',
  'Globe',
  'History',
  'GraduationCap',
  'Lightbulb',
]

export interface Subject {
  id: string
  name: string
  code: string
  teacher: string
  description: string
  color: string
  icon: string
  createdAt: string
}

export interface Resource {
  id: string
  title: string
  url: string
  subjectId: string
  type: ResourceType
  description: string
  tags: string[]
  favorite: boolean
  createdAt: string
}

export interface QuickLink {
  id: string
  title: string
  url: string
  icon: string
  color: string
  pinned: boolean
  createdAt: string
}

export interface UserSettings {
  name: string
  avatar: string
  theme: 'light' | 'dark' | 'system'
  language: 'vi'
}

/* =========================================================
   👤 HỒ SƠ NGƯỜI DÙNG
   ========================================================= */

export interface UserProfile {
  id: string
  name: string
  avatar: string
  level: number
  exp: number
  coins: number
  streak: number
  lastCheckIn: string | null
}

/* =========================================================
   🏆 BẢNG XẾP HẠNG
   ========================================================= */

export interface LeaderboardEntry {
  id: string
  username: string
  avatar_url: string | null
  level: number
  exp: number
}

/* =========================================================
   ⚔️ TRANG BỊ
   ========================================================= */

export interface Equipment {
  id: string
  name: string
  description: string
  slot: EquipmentSlot
  level: number
  enhancement: number
  rarity: string
  equipped: boolean
  stats?: Record<string, number>
}

export type EquipmentSlot =
  | 'weapon'
  | 'armor'
  | 'accessory'

/* =========================================================
   🗺️ STAGE
   ========================================================= */

export interface Stage {
  id: number
  name: string
  description: string
  unlocked: boolean
  completed: boolean
  reward: number
}

/* =========================================================
   🎁 DAILY REWARD
   ========================================================= */

export interface DailyReward {
  day: number
  coins: number
  exp: number
  claimed: boolean
}

/* =========================================================
   📝 GHI CHÚ
   ========================================================= */

export interface Note {
  id: string
  title: string
  content: string
  images: string[]
  createdAt: string
  updatedAt: string
}

/* =========================================================
   🧪 CÔNG THỨC
   ========================================================= */

export interface Formula {
  id: string
  title: string
  content: string
  images: string[]
  createdAt: string
  updatedAt: string
}

/* =========================================================
   💾 APP DATA
   ========================================================= */

export interface AppData {
  subjects: Subject[]
  resources: Resource[]
  quickLinks: QuickLink[]
  settings: UserSettings
  notes: Note[]
  formulas: Formula[]
  version: string
}

export type ViewMode = 'grid' | 'list'

export type SortOption =
  | 'newest'
  | 'oldest'
  | 'name_asc'
  | 'name_desc'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}