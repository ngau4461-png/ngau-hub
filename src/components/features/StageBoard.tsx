import React, { useState, useEffect, useRef } from 'react'
import { Map, Lock, Coins, Sparkles, Swords, ChevronDown, Zap, X } from 'lucide-react'
import { useData } from '@/hooks/useData'
import { useToast } from '@/hooks/useToast'
import { Card, CardHeader, CardTitle, CardBody, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/helpers'
import { TOTAL_STAGES, RARITY_STYLES, SLOT_LABELS } from '@/constants'
import type { Stage, Equipment } from '@/types'

interface BattleResult {
  victory: boolean
  coins?: number
  exp?: number
  newEquipment?: Equipment
  firstClear?: boolean
  logs: string[]
  playerHp: number
  enemyHp: number
  maxPlayerHp: number
  maxEnemyHp: number
}

interface SweepResult {
  totalCoins: number
  totalExp: number
  equipments: Equipment[]
}

export const StageBoard: React.FC<{ className?: string }> = ({ className }) => {
  const { getStages, getProfile, completeStage, sweepStage } = useData()
  const { showToast } = useToast()
  const profile = getProfile()
  const stages = getStages()
  const highestStage = profile.highestStage

  const [selectedStage, setSelectedStage] = useState<Stage | null>(null)
  const [battleOpen, setBattleOpen] = useState(false)
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null)
  const [battleLogs, setBattleLogs] = useState<string[]>([])
  const [playerHp, setPlayerHp] = useState(profile.stats.hp)
  const [enemyHp, setEnemyHp] = useState(0)
  const [isAttacking, setIsAttacking] = useState(false)
  const [showRewards, setShowRewards] = useState(false)
  const [sweepResult, setSweepResult] = useState<SweepResult | null>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [battleLogs])

  const openBattle = (stage: Stage) => {
    if (!stage.unlocked) {
      showToast('warning', 'Ấi này chưa được mở khóa! Vượt ải trước đó để mở.')
      return
    }
    setSelectedStage(stage)
    setBattleResult(null)
    setBattleLogs([])
    setPlayerHp(profile.stats.hp)
    setEnemyHp(stage.enemyHp)
    setShowRewards(false)
    setSweepResult(null)
    setBattleOpen(true)
  }

  const closeBattle = () => {
    setBattleOpen(false)
    setTimeout(() => {
      setSelectedStage(null)
      setBattleResult(null)
      setBattleLogs([])
      setShowRewards(false)
      setSweepResult(null)
    }, 300)
  }

  const addLog = (msg: string) => {
    setBattleLogs((prev) => [...prev, msg].slice(-8))
  }

  const handleAttack = () => {
    if (!selectedStage || isAttacking) return
    setIsAttacking(true)

    setTimeout(() => {
      const r = completeStage(selectedStage.id)
      if (!r.success) {
        showToast('error', r.error || 'Vào ải thất bại!')
        setIsAttacking(false)
        return
      }

      const battle = r.battle!
      setBattleLogs(battle.logs.slice(-8))

      if (r.victory) {
        const finalPlayerHp = Math.max(0, profile.stats.hp - battle.damageTaken)
        setPlayerHp(finalPlayerHp)
        setEnemyHp(0)
        setBattleResult({
          victory: true,
          coins: r.rewards?.coins,
          exp: r.rewards?.exp,
          newEquipment: r.rewards?.newEquipment,
          firstClear: r.rewards?.firstClear,
          logs: battle.logs,
          playerHp: finalPlayerHp,
          enemyHp: 0,
          maxPlayerHp: profile.stats.hp,
          maxEnemyHp: selectedStage.enemyHp,
        })
        setTimeout(() => {
          setShowRewards(true)
          const msgs: string[] = []
          msgs.push(`🏆 Chiến thắng ải ${selectedStage.id}!`)
          if (r.rewards?.firstClear) msgs.push(`🎊 First Clear Bonus!`)
          if (r.rewards?.newEquipment) msgs.push(`✨ Đã nhận trang bị: ${r.rewards.newEquipment.icon} ${r.rewards.newEquipment.name}`)
          showToast('success', msgs.join(' '))
        }, 400)
      } else {
        const finalEnemyHp = Math.max(0, selectedStage.enemyHp - battle.damageDealt)
        setPlayerHp(0)
        setEnemyHp(finalEnemyHp)
        setBattleResult({
          victory: false,
          logs: battle.logs,
          playerHp: 0,
          enemyHp: finalEnemyHp,
          maxPlayerHp: profile.stats.hp,
          maxEnemyHp: selectedStage.enemyHp,
        })
        showToast('error', '💀 Thất bại! Nâng cấp Lực chiến rồi thử lại nhé.')
      }
      setIsAttacking(false)
    }, 350)
  }

  const handleSweep = (stageId: number) => {
    const r = sweepStage(stageId, 3)
    if (!r.success) {
      showToast('error', r.error || 'Quét nhanh thất bại!')
      return
    }
    setSweepResult({
      totalCoins: r.totalCoins ?? 0,
      totalExp: r.totalExp ?? 0,
      equipments: r.equipments ?? [],
    })
    const parts: string[] = [`Quét nhanh x3 ải ${stageId}:`]
    parts.push(`🪙 +${(r.totalCoins ?? 0).toLocaleString()}`)
    parts.push(`✨ +${(r.totalExp ?? 0).toLocaleString()} EXP`)
    if (r.equipments?.length) parts.push(`🎁 ${r.equipments.length} trang bị mới`)
    showToast('success', parts.join(' '))
  }

  const playerHpPct = Math.max(0, Math.min(100, (playerHp / profile.stats.hp) * 100))
  const enemyHpPct = selectedStage ? Math.max(0, Math.min(100, (enemyHp / selectedStage.enemyHp) * 100)) : 0

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-soft">
                <Map className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  Leo ải · Vượt thám
                </CardTitle>
                <CardDescription>
                  Vượt ải nhận Xu, EXP và trang bị
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardBody className="!pt-2 space-y-4">
          <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Ấi cao nhất đã qua
                </p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-3xl font-black tabular-nums text-emerald-700 dark:text-emerald-300">
                    {highestStage}
                  </span>
                  <span className="text-sm text-emerald-600/70 dark:text-emerald-400/70 font-semibold">
                    / {TOTAL_STAGES}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Lực chiến
                </p>
                <p className="text-xl font-black tabular-nums text-gray-900 dark:text-white">
                  {profile.combatPower.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="h-2.5 bg-white/60 dark:bg-black/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (highestStage / TOTAL_STAGES) * 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {stages.map((stage: Stage) => {
              const powerDiff = profile.combatPower - stage.recommendedPower
              const enoughPower = powerDiff >= 0
              return (
                <div
                  key={stage.id}
                  className={cn(
                    'relative rounded-2xl border overflow-hidden transition-all duration-200',
                    stage.unlocked
                      ? stage.cleared
                        ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800/50'
                        : 'bg-white dark:bg-gray-800/60 border-gray-100 dark:border-gray-700/60 hover:border-primary-200 dark:hover:border-primary-700 hover:shadow-soft -active:scale-[0.98]'
                      : 'bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800/50 opacity-70'
                  )}
                >
                  {stage.cleared && (
                    <div className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-soft ring-2 ring-white dark:ring-gray-800">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path
                          fillRule="evenodd"
                          d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 011.414-1.42L8.5 12.086l6.79-6.796a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}

                  <div className="p-2.5 sm:p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={cn(
                          'text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums',
                          stage.cleared
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : stage.unlocked
                            ? 'bg-primary-500/10 text-primary-700 dark:text-primary-300'
                            : 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
                        )}
                      >
                        #{stage.id}
                      </span>
                      {!stage.unlocked ? (
                        <Lock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      ) : !stage.cleared && !enoughPower ? (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">⚠</span>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-center text-center gap-1.5 mb-3">
                      <div
                        className={cn(
                          'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl',
                          stage.unlocked
                            ? 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/40 dark:to-gray-800/60 shadow-inner'
                            : 'bg-gray-100/50 dark:bg-gray-800/30 grayscale'
                        )}
                      >
                        {stage.enemyIcon}
                      </div>
                      <p
                        className={cn(
                          'text-[11px] font-bold leading-tight',
                          stage.unlocked
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-400 dark:text-gray-500'
                        )}
                      >
                        {stage.enemyName}
                      </p>
                      <p
                        className={cn(
                          'text-[10px] font-medium leading-tight',
                          enoughPower
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : stage.unlocked
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-gray-400 dark:text-gray-500'
                        )}
                      >
                        ⚔️ {stage.recommendedPower.toLocaleString()}
                      </p>
                    </div>

                    {stage.cleared && stage.unlocked && (
                      <Button
                        size="sm"
                        variant="outline"
                        fullWidth
                        className="!h-8 !rounded-xl !text-[11px] !font-bold mb-1.5"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSweep(stage.id)
                        }}
                      >
                        ⚡ Quét x3
                      </Button>
                    )}
                    <Button
                      size="sm"
                      fullWidth
                      className={cn(
                        '!h-10 !rounded-xl !text-sm !font-bold',
                        stage.unlocked &&
                          !stage.cleared &&
                          '!bg-gradient-to-r !from-primary-600 !to-violet-600 !shadow-lg !shadow-primary-500/30 active:!scale-[0.98]'
                      )}
                      disabled={!stage.unlocked}
                      onClick={() => openBattle(stage)}
                    >
                      {stage.unlocked ? 'Vào ải' : 'Khóa'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>

      <div
        className={cn(
          'fixed inset-0 z-50 transition-all duration-300',
          battleOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      >
        <div
          className={cn(
            'absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
            battleOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={closeBattle}
        />
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 max-h-[92vh] overflow-hidden flex flex-col',
            'bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl border-t border-gray-100 dark:border-gray-800',
            'transition-transform duration-300 ease-out',
            battleOpen ? 'translate-y-0' : 'translate-y-full'
          )}
        >
          <div className="flex-shrink-0 flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
          </div>

          {selectedStage && (
            <div className="flex-shrink-0 px-5 pb-3 flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                  {selectedStage.name}
                </p>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
                  Đấu với {selectedStage.enemyIcon} {selectedStage.enemyName}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Lực đề nghị: <span className="font-bold text-amber-600 dark:text-amber-400">{selectedStage.recommendedPower.toLocaleString()}</span>
                  {' · '}Bạn: <span className="font-bold text-emerald-600 dark:text-emerald-400">{profile.combatPower.toLocaleString()}</span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeBattle}
                className="!h-9 !w-9 !rounded-xl -mr-1"
              >
                <X className="h-4.5 w-4.5" />
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {selectedStage && (
              <>
                <div className="rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-100 dark:border-red-900/40 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 shadow-soft flex items-center justify-center text-3xl border border-red-100 dark:border-red-900/30">
                      {selectedStage.enemyIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{selectedStage.enemyName}</p>
                        <span className="text-[11px] font-bold text-red-600 dark:text-red-400 tabular-nums shrink-0 ml-2">
                          ATK {selectedStage.enemyAttack}
                        </span>
                      </div>
                      <div className="h-3 bg-red-100 dark:bg-red-900/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full transition-all duration-500"
                          style={{ width: `${enemyHpPct}%` }}
                        />
                      </div>
                      <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mt-1 tabular-nums">
                        ❤️ {enemyHp.toLocaleString()} / {selectedStage.enemyHp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="relative">
                    <Swords className="h-6 w-6 text-primary-500" />
                    {isAttacking && (
                      <div className="absolute inset-0 animate-ping">
                        <Swords className="h-6 w-6 text-primary-400" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-900/40 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 shadow-soft flex items-center justify-center text-2xl border border-white/50">
                      {profile.avatar || '🧑‍🎓'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{profile.name}</p>
                        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 tabular-nums shrink-0 ml-2">
                          ATK {profile.stats.attack}
                        </span>
                      </div>
                      <div className="h-3 bg-blue-100 dark:bg-blue-900/40 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            playerHpPct > 50
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                              : playerHpPct > 25
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                              : 'bg-gradient-to-r from-red-500 to-rose-500'
                          )}
                          style={{ width: `${playerHpPct}%` }}
                        />
                      </div>
                      <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mt-1 tabular-nums">
                        ❤️ {playerHp.toLocaleString()} / {profile.stats.hp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {battleLogs.length > 0 && (
                  <div
                    ref={logContainerRef}
                    className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-3 max-h-48 overflow-y-auto"
                  >
                    <div className="space-y-1">
                      {battleLogs.map((l, i) => {
                        const isPlayer = l.includes('Bạn tấn công') || l.includes('CHIẾN THẮNG')
                        const isLoss = l.includes('BẠN BỊ ĐÁNH BẠI')
                        return (
                          <p
                            key={i}
                            className={cn(
                              'text-[11px] leading-snug font-medium',
                              isPlayer && !isLoss && 'text-blue-700 dark:text-blue-300',
                              !isPlayer && !isLoss && 'text-gray-600 dark:text-gray-400',
                              isLoss && 'text-red-600 dark:text-red-400 font-bold'
                            )}
                          >
                            {l}
                          </p>
                        )
                      })}
                    </div>
                  </div>
                )}

                {showRewards && battleResult?.victory && (
                  <div className="rounded-3xl bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/30 dark:via-yellow-900/20 dark:to-orange-900/30 border-2 border-amber-200 dark:border-amber-700/40 p-4 shadow-lg shadow-amber-500/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-3">
                      <span className="inline-block text-4xl mb-1">🎉</span>
                      <h4 className="text-lg font-black text-amber-700 dark:text-amber-300">
                        {battleResult.firstClear ? 'First Clear! Phần thưởng lớn' : 'Nhận phần thưởng'}
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                      <div className="rounded-xl bg-white/80 dark:bg-gray-900/50 p-3 border border-amber-100 dark:border-amber-800/30">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 mb-1">
                          <Coins className="h-3.5 w-3.5 text-amber-500" /> Xu
                        </div>
                        <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-white">
                          +{(battleResult.coins ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/80 dark:bg-gray-900/50 p-3 border border-indigo-100 dark:border-indigo-800/30">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> EXP
                        </div>
                        <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-white">
                          +{(battleResult.exp ?? 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {battleResult.newEquipment && (
                      <div
                        className={cn(
                          'rounded-2xl p-3 border-2',
                          RARITY_STYLES[battleResult.newEquipment.rarity].bg,
                          RARITY_STYLES[battleResult.newEquipment.rarity].border,
                          'shadow-lg',
                          RARITY_STYLES[battleResult.newEquipment.rarity].glow
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-white/70 dark:bg-black/20 flex items-center justify-center text-3xl shadow-inner">
                            {battleResult.newEquipment.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              <span
                                className={cn(
                                  'text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                                  RARITY_STYLES[battleResult.newEquipment.rarity].text,
                                  RARITY_STYLES[battleResult.newEquipment.rarity].bg,
                                  'border',
                                  RARITY_STYLES[battleResult.newEquipment.rarity].border
                                )}
                              >
                                {RARITY_STYLES[battleResult.newEquipment.rarity].label}
                              </span>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                {SLOT_LABELS[battleResult.newEquipment.slot].icon} {SLOT_LABELS[battleResult.newEquipment.slot].label}
                              </span>
                            </div>
                            <p className="font-black text-gray-900 dark:text-white leading-tight truncate">
                              {battleResult.newEquipment.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-gray-600 dark:text-gray-300">
                              {battleResult.newEquipment.attack > 0 && <span>⚔️+{battleResult.newEquipment.attack}</span>}
                              {battleResult.newEquipment.defense > 0 && <span>🛡️+{battleResult.newEquipment.defense}</span>}
                              {battleResult.newEquipment.hp > 0 && <span>❤️+{battleResult.newEquipment.hp}</span>}
                              {battleResult.newEquipment.critRate > 0 && <span>💥+{battleResult.newEquipment.critRate}%</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {sweepResult && (
                  <div className="rounded-3xl bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-900/30 dark:via-purple-900/20 dark:to-fuchsia-900/30 border-2 border-violet-200 dark:border-violet-700/40 p-4 shadow-lg shadow-violet-500/10">
                    <div className="text-center mb-3">
                      <span className="inline-block text-4xl mb-1">⚡</span>
                      <h4 className="text-lg font-black text-violet-700 dark:text-violet-300">
                        Quét nhanh x3 thành công
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                      <div className="rounded-xl bg-white/80 dark:bg-gray-900/50 p-3 border border-amber-100 dark:border-amber-800/30">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 mb-1">
                          <Coins className="h-3.5 w-3.5 text-amber-500" /> Tổng Xu
                        </div>
                        <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-white">
                          +{sweepResult.totalCoins.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/80 dark:bg-gray-900/50 p-3 border border-indigo-100 dark:border-indigo-800/30">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Tổng EXP
                        </div>
                        <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-white">
                          +{sweepResult.totalExp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {sweepResult.equipments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider px-1">
                          🎁 Trang bị nhận được ({sweepResult.equipments.length})
                        </p>
                        {sweepResult.equipments.map((eq, i) => (
                          <div
                            key={i}
                            className={cn(
                              'rounded-xl p-2.5 border',
                              RARITY_STYLES[eq.rarity].bg,
                              RARITY_STYLES[eq.rarity].border
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-lg bg-white/70 dark:bg-black/20 flex items-center justify-center text-2xl">
                                {eq.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span
                                    className={cn(
                                      'text-[9px] font-bold px-1.5 py-0.5 rounded',
                                      RARITY_STYLES[eq.rarity].text,
                                      RARITY_STYLES[eq.rarity].bg,
                                      'border',
                                      RARITY_STYLES[eq.rarity].border
                                    )}
                                  >
                                    {RARITY_STYLES[eq.rarity].label}
                                  </span>
                                </div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
                                  {eq.name}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex-shrink-0 px-5 pt-3 pb-5 border-t border-gray-100 dark:border-gray-800 space-y-2.5 bg-white dark:bg-gray-900">
            {selectedStage?.cleared && (
              <Button
                fullWidth
                size="sm"
                variant="outline"
                disabled={isAttacking}
                onClick={() => handleSweep(selectedStage.id)}
                className="!h-10 !rounded-xl !text-sm !font-bold border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30"
              >
                <Zap className="h-4 w-4" />
                Quét nhanh x3
              </Button>
            )}
            <Button
              fullWidth
              size="lg"
              disabled={isAttacking || !!battleResult}
              onClick={handleAttack}
              className={cn(
                '!h-14 !rounded-2xl !text-lg !font-black !shadow-xl active:!scale-[0.98] transition-transform',
                '!bg-gradient-to-r !from-red-500 via-rose-500 !to-fuchsia-600',
                '!shadow-red-500/30 dark:!shadow-red-500/20',
                '!text-white',
                (isAttacking || battleResult?.victory === false) &&
                  '!opacity-90'
              )}
            >
              {isAttacking ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block animate-spin">⚔️</span> Đang chiến đấu...
                </span>
              ) : battleResult?.victory ? (
                <span>🏆 Chiến thắng! Đóng để tiếp tục</span>
              ) : battleResult?.victory === false ? (
                <span>💀 Đã thua. Thoát & nâng cấp</span>
              ) : (
                <span className="flex items-center gap-2 tracking-wide">
                  ⚔️ TẤN CÔNG
                </span>
              )}
            </Button>
            {battleResult && (
              <Button
                fullWidth
                variant="ghost"
                size="sm"
                onClick={closeBattle}
                className="!h-10 !rounded-xl !text-sm !font-semibold"
              >
                <ChevronDown className="h-4 w-4" /> Đóng cửa sổ
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
