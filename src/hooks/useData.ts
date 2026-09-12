import { useState, useEffect, useCallback } from 'react'

import type {
  Subject,
  Resource,
  QuickLink,
  UserSettings,
  ResourceType,
  SortOption,
  UserProfile,
  LeaderboardEntry,
  Equipment,
  Stage,
  DailyReward,
  EquipmentSlot,
  Note,
  Formula,
} from '@/types'

import { dataService } from '@/services/dataService'

export function useData() {
  const [, setTick] = useState(0)

  const forceUpdate = useCallback(
    () => setTick((t) => t + 1),
    []
  )

  useEffect(() => {
    return dataService.subscribe(forceUpdate)
  }, [forceUpdate])

  return {
    getStats: useCallback(
      () => dataService.getStats(),
      []
    ),

    resetToDefault: useCallback(
      () => dataService.resetToDefault(),
      []
    ),

    // =====================================================
    // PROFILE
    // =====================================================

    getProfile: useCallback(
      (): UserProfile => dataService.getProfile(),
      []
    ),

    updateProfile: useCallback(
      (
        data: Partial<
          Pick<UserProfile, 'name' | 'avatar'>
        >
      ) => dataService.updateProfile(data),
      []
    ),

    addCoins: useCallback(
      (amount: number) =>
        dataService.addCoins(amount),
      []
    ),

    addExp: useCallback(
      (amount: number) =>
        dataService.addExp(amount),
      []
    ),

    updateStreak: useCallback(
      () => dataService.updateStreak(),
      []
    ),

    getExpProgress: useCallback(
      () => dataService.getExpProgress(),
      []
    ),

    // =====================================================
    // LEADERBOARD
    // =====================================================

    getLeaderboard: useCallback(
      (
        limit?: number
      ): LeaderboardEntry[] =>
        dataService.getLeaderboard(limit),
      []
    ),

    getUserRank: useCallback(
      (): LeaderboardEntry | undefined =>
        dataService.getUserRank(),
      []
    ),

    // =====================================================
    // COMBAT
    // =====================================================

    upgradeCombat: useCallback(
      () => dataService.upgradeCombat(),
      []
    ),

    // =====================================================
    // EQUIPMENT
    // =====================================================

    getEquipment: useCallback(
      (): Equipment[] =>
        dataService.getEquipment(),
      []
    ),

    getEquippedBySlot: useCallback(
      (slot: EquipmentSlot) =>
        dataService.getEquippedBySlot(slot),
      []
    ),

    getInventory: useCallback(
      (): Equipment[] =>
        dataService.getInventory(),
      []
    ),

    equipItem: useCallback(
      (id: string) =>
        dataService.equipItem(id),
      []
    ),

    unequipItem: useCallback(
      (id: string) =>
        dataService.unequipItem(id),
      []
    ),

    enhanceEquipment: useCallback(
      (id: string) =>
        dataService.enhanceEquipment(id),
      []
    ),

    // =====================================================
    // STAGES
    // =====================================================

    getStages: useCallback(
      (): Stage[] =>
        dataService.getStages(),
      []
    ),

    getStage: useCallback(
      (id: number) =>
        dataService.getStage(id),
      []
    ),

    completeStage: useCallback(
      (stageId: number) =>
        dataService.completeStage(stageId),
      []
    ),

    sweepStage: useCallback(
      (
        stageId: number,
        times?: number
      ) =>
        dataService.sweepStage(
          stageId,
          times
        ),
      []
    ),

    // =====================================================
    // DAILY CHECK-IN
    // =====================================================

    getDailyRewards: useCallback(
      (): DailyReward[] =>
        dataService.getDailyRewards(),
      []
    ),

    canCheckInToday: useCallback(
      () =>
        dataService.canCheckInToday(),
      []
    ),

    getNextCheckInDay: useCallback(
      () =>
        dataService.getNextCheckInDay(),
      []
    ),

    claimDailyReward: useCallback(
      () =>
        dataService.claimDailyReward(),
      []
    ),

    // =====================================================
    // SUBJECTS
    // =====================================================

    getSubjects: useCallback(
      (): Subject[] =>
        dataService.getSubjects(),
      []
    ),

    getSubjectById: useCallback(
      (id: string) =>
        dataService.getSubjectById(id),
      []
    ),

    searchSubjects: useCallback(
      (q: string) =>
        dataService.searchSubjects(q),
      []
    ),

    addSubject: useCallback(
      (
        ...args: Parameters<
          typeof dataService.addSubject
        >
      ) =>
        dataService.addSubject(...args),
      []
    ),

    updateSubject: useCallback(
      (
        ...args: Parameters<
          typeof dataService.updateSubject
        >
      ) =>
        dataService.updateSubject(...args),
      []
    ),

    deleteSubject: useCallback(
      (id: string) =>
        dataService.deleteSubject(id),
      []
    ),

    // =====================================================
    // RESOURCES
    // =====================================================

    getResources: useCallback(
      (): Resource[] =>
        dataService.getResources(),
      []
    ),

    getResourceById: useCallback(
      (id: string) =>
        dataService.getResourceById(id),
      []
    ),

    getResourcesBySubject: useCallback(
      (id: string) =>
        dataService.getResourcesBySubject(id),
      []
    ),

    getFavoriteResources: useCallback(
      (): Resource[] =>
        dataService.getFavoriteResources(),
      []
    ),

    getRecentResources: useCallback(
      (limit: number = 5) =>
        dataService.getRecentResources(limit),
      []
    ),

    searchResources: useCallback(
      (params: {
        query?: string
        subjectId?: string
        type?:
          | ResourceType
          | 'all'
          | 'favorite'
        sort?: SortOption
      }) =>
        dataService.searchResources(params),
      []
    ),

    addResource: useCallback(
      (
        ...args: Parameters<
          typeof dataService.addResource
        >
      ) =>
        dataService.addResource(...args),
      []
    ),

    updateResource: useCallback(
      (
        ...args: Parameters<
          typeof dataService.updateResource
        >
      ) =>
        dataService.updateResource(...args),
      []
    ),

    deleteResource: useCallback(
      (id: string) =>
        dataService.deleteResource(id),
      []
    ),

    toggleFavorite: useCallback(
      (id: string) =>
        dataService.toggleFavorite(id),
      []
    ),

    // =====================================================
    // QUICK LINKS
    // =====================================================

    getQuickLinks: useCallback(
      (): QuickLink[] =>
        dataService.getQuickLinks(),
      []
    ),

    addQuickLink: useCallback(
      (
        ...args: Parameters<
          typeof dataService.addQuickLink
        >
      ) =>
        dataService.addQuickLink(...args),
      []
    ),

    updateQuickLink: useCallback(
      (
        ...args: Parameters<
          typeof dataService.updateQuickLink
        >
      ) =>
        dataService.updateQuickLink(...args),
      []
    ),

    deleteQuickLink: useCallback(
      (id: string) =>
        dataService.deleteQuickLink(id),
      []
    ),

    togglePinQuickLink: useCallback(
      (id: string) =>
        dataService.togglePinQuickLink(id),
      []
    ),

    // =====================================================
    // 📝 NOTES
    // =====================================================

    getNotes: useCallback(
      (): Note[] =>
        dataService.getNotes(),
      []
    ),

    getNoteById: useCallback(
      (id: string) =>
        dataService.getNoteById(id),
      []
    ),

    searchNotes: useCallback(
      (query: string) =>
        dataService.searchNotes(query),
      []
    ),

    addNote: useCallback(
      (
        ...args: Parameters<
          typeof dataService.addNote
        >
      ) =>
        dataService.addNote(...args),
      []
    ),

    updateNote: useCallback(
      (
        ...args: Parameters<
          typeof dataService.updateNote
        >
      ) =>
        dataService.updateNote(...args),
      []
    ),

    deleteNote: useCallback(
      (id: string) =>
        dataService.deleteNote(id),
      []
    ),

    // =====================================================
    // 🧪 FORMULAS
    // =====================================================

    getFormulas: useCallback(
      (): Formula[] =>
        dataService.getFormulas(),
      []
    ),

    getFormulaById: useCallback(
      (id: string) =>
        dataService.getFormulaById(id),
      []
    ),

    searchFormulas: useCallback(
      (query: string) =>
        dataService.searchFormulas(query),
      []
    ),

    addFormula: useCallback(
      (
        ...args: Parameters<
          typeof dataService.addFormula
        >
      ) =>
        dataService.addFormula(...args),
      []
    ),

    updateFormula: useCallback(
      (
        ...args: Parameters<
          typeof dataService.updateFormula
        >
      ) =>
        dataService.updateFormula(...args),
      []
    ),

    deleteFormula: useCallback(
      (id: string) =>
        dataService.deleteFormula(id),
      []
    ),

    // =====================================================
    // SETTINGS
    // =====================================================

    getSettings: useCallback(
      (): UserSettings =>
        dataService.getSettings(),
      []
    ),

    updateSettings: useCallback(
      (data: Partial<UserSettings>) =>
        dataService.updateSettings(data),
      []
    ),

    // =====================================================
    // IMPORT / EXPORT
    // =====================================================

    exportData: useCallback(
      () => dataService.exportData(),
      []
    ),

    importData: useCallback(
      (jsonData: unknown) =>
        dataService.importData(jsonData),
      []
    ),
  }
}