import {
  RESOURCE_TYPES,
  SUBJECT_COLORS,
  SUBJECT_ICONS,
} from '@/types'

export { RESOURCE_TYPES, SUBJECT_COLORS, SUBJECT_ICONS }

export const STORAGE_KEYS = {
  SUBJECTS: 'ngauhub_subjects',
  RESOURCES: 'ngauhub_resources',
  QUICK_LINKS: 'ngauhub_quick_links',

  // Ghi chú
  NOTES: 'ngauhub_notes',

  // Công thức
  FORMULAS: 'ngauhub_formulas',

  SETTINGS: 'ngauhub_settings',
  INITIALIZED: 'ngauhub_initialized',
} as const

export const APP_VERSION = '1.1.0'

export const DEFAULT_SETTINGS = {
  name: 'Học sinh',
  avatar: '',
  theme: 'light' as const,
  language: 'vi' as const,
}

export const ROUTES = {
  HOME: '/',
  SUBJECTS: '/subjects',
  SUBJECT_DETAIL: '/subjects/:id',

  RESOURCES: '/resources',

  // Ghi chú
  NOTES: '/notes',

  // Công thức
  FORMULAS: '/formulas',

  FAVORITES: '/favorites',
  QUICK_ACCESS: '/quick-access',
  SETTINGS: '/settings',
} as const

export const SIDEBAR_MENU = [
  {
    path: ROUTES.HOME,
    label: 'Tổng quan',
    icon: 'Home',
  },

  {
    path: ROUTES.SUBJECTS,
    label: 'Môn học',
    icon: 'BookOpen',
  },

  {
    path: ROUTES.RESOURCES,
    label: 'Tất cả tài liệu',
    icon: 'Link2',
  },

  // Ghi chú
  {
    path: ROUTES.NOTES,
    label: 'Ghi chú',
    icon: 'NotebookPen',
  },

  {
    path: ROUTES.FAVORITES,
    label: 'Yêu thích',
    icon: 'Star',
  },

  {
    path: ROUTES.QUICK_ACCESS,
    label: 'Truy cập nhanh',
    icon: 'Zap',
  },

  {
    path: ROUTES.SETTINGS,
    label: 'Cài đặt',
    icon: 'Settings',
  },
] as const

export const RESOURCE_FILTERS = [
  {
    value: 'all',
    label: 'Tất cả',
  },

  {
    value: 'document',
    label: '📄 Tài liệu',
  },

  {
    value: 'video',
    label: '🎥 Video',
  },

  {
    value: 'exam',
    label: '📝 Đề thi',
  },

  {
    value: 'exercise',
    label: '📚 Bài tập',
  },

  {
    value: 'website',
    label: '🌐 Website',
  },

  {
    value: 'favorite',
    label: '⭐ Yêu thích',
  },
] as const

export const SORT_OPTIONS = [
  {
    value: 'newest',
    label: 'Mới nhất',
  },

  {
    value: 'oldest',
    label: 'Cũ nhất',
  },

  {
    value: 'name_asc',
    label: 'Tên A-Z',
  },

  {
    value: 'name_desc',
    label: 'Tên Z-A',
  },
] as const