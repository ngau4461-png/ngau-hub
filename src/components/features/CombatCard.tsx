import React from 'react'
import { Sword, Shield, Heart, Target, TrendingUp, Zap, Coins } from 'lucide-react'
import { useData } from '@/hooks/useData'
import { useToast } from '@/hooks/useToast'
import { Card, CardHeader, CardTitle, CardBody, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/helpers'
import { COMBAT_UPGRADE_COST } from '@/constants'

export const CombatCard: React.FC<{ className?: string }> = ({ className }) => {
  const { getProfile, upgradeCombat, addCoins, addExp } = useData()
  const { showToast } = useToast()
  const profile = getProfile()
  const cost = COMBAT_UPGRADE_COST(profile.combatLevel)
  const canAfford = profile.coins >= cost

  const handleUpgrade = () => {
    const r = upgradeCombat()
    if (!r.success) {
      showToast('error', r.error || 'Nâng cấp thất bại!')
      return
    }
    showToast(
      'success',
      `⚡ Nâng cấp Lực chiến lên Lv.${r.newCombatLevel} thành công! +${r.powerGain?.toLocaleString()} Lực chiến`
    )
  }

  const handleTestReward = (type: 'exp' | 'coins') => {
    if (type === 'exp') {
      const r = addExp(Math.floor(30 + Math.random() * 40))
      if (r.leveledUp) {
        showToast('success', `🎉 LÊN LEVEL ${r.newLevel}! Tổng EXP: ${r.exp.toLocaleString()}`)
      } else {
        showToast('info', `✨ +${Math.round(30 + Math.random() * 10)} EXP → ${r.exp.toLocaleString()}`)
      }
    } else {
      const r = addCoins(150)
      showToast('success', `🪙 +150 Xu → ${r.coins.toLocaleString()}`)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-amber-500 fill-amber-200" />
        Lực chiến
      </CardTitle>
      <CardDescription>Nâng cấp Lực chiến để vượt ải cao hơn</CardDescription>
    </CardHeader>
      <CardBody className="!pt-1 space-y-4">
      <div className="relative p-4 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_left,white,transparent_50%)]" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-white/80 font-semibold uppercase tracking-wider">Lực chiến</span>
            <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full border border-white/30">
              CLB Lv.{profile.combatLevel}
            </span>
          </div>
          <p className="text-4xl font-black tabular-nums tracking-tight drop-shadow">
            {profile.combatPower.toLocaleString()}
          </p>
          <p className="text-xs text-white/70 mt-1">
            Giảm 8% sát thương nhận mỗi Lv CLB
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400 mb-1">
            <Sword className="h-3.5 w-3.5" /> Công kích
          </div>
          <p className="text-xl font-black tabular-nums text-gray-900 dark:text-white">
            {profile.stats.attack.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/20 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 mb-1">
            <Shield className="h-3.5 w-3.5" /> Phòng thủ
          </div>
          <p className="text-xl font-black tabular-nums text-gray-900 dark:text-white">
            {profile.stats.defense.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-green-100 dark:border-green-900/30 bg-green-50 dark:bg-green-900/20 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-green-600 dark:text-green-400 mb-1">
            <Heart className="h-3.5 w-3.5" /> Máu
          </div>
          <p className="text-xl font-black tabular-nums text-gray-900 dark:text-white">
            {profile.stats.hp.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-orange-100 dark:border-orange-900/30 bg-orange-50 dark:bg-orange-900/20 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-600 dark:text-orange-400 mb-1">
            <Target className="h-3.5 w-3.5" /> Bạo kích
          </div>
          <p className="text-xl font-black tabular-nums text-gray-900 dark:text-white">
            {profile.stats.critRate}%
          </p>
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <Button
          size="lg"
          fullWidth
          leftIcon={<TrendingUp className="h-4.5 w-4.5" />
          onClick={handleUpgrade}
          disabled={!canAfford}
          className={cn(
            "!h-12 !text-base !font-bold !rounded-2xl !shadow-lg !shadow-primary-500/30",
            canAfford && "!bg-gradient-to-r !from-primary-600 !to-violet-600 !text-white !shadow-primary-500/40",
            !canAfford && "!opacity-70"
          )}
        >
          <span className="flex items-center gap-2 flex-wrap justify-center">
            <span>Nâng cấp Lực chiến</span>
            <span className="!ml-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/15">
              <Coins className="h-3.5 w-3.5 text-amber-300" />
              <span className="tabular-nums">{cost.toLocaleString()}</span>
            </span>
          </span>
        </Button>

        <div className="grid grid-cols-2 gap-2.5">
          <Button size="sm" variant="outline" onClick={() => handleTestReward('exp')}
            leftIcon={<Zap className="h-4 w-4" />}
          >
            Thử +EXP
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleTestReward('coins')}
            leftIcon={<Coins className="h-4 w-4" />}
          >
            Thử +Xu
          </Button>
        </div>
      </div>
    </CardBody>
  </Card>
  )
}
