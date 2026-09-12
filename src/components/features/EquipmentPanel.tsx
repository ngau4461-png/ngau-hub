import React from 'react'
import { Sword, Shield, HardHat, Footprints, Gem, ArrowUp, Coins } from 'lucide-react'
import { useData } from '@/hooks/useData'
import { useToast } from '@/hooks/useToast'
import { Card, CardHeader, CardTitle, CardBody, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { RARITY_STYLES, SLOT_LABELS } from '@/constants'
import { cn } from '@/utils/helpers'
import type { EquipmentSlot } from '@/types'

const SLOT_ICONS: Record<EquipmentSlot, typeof Sword> = {
  weapon: Sword,
  armor: Shield,
  helmet: HardHat,
  boots: Footprints,
  accessory: Gem,
}

const SLOT_ORDER: EquipmentSlot[] = ['weapon', 'helmet', 'armor', 'boots', 'accessory']

const ENHANCE_COST = (level: number) => level * 80

export const EquipmentPanel: React.FC<{ className?: string }> = ({ className }) => {
  const { getEquippedBySlot, getInventory, enhanceEquipment, getProfile } = useData()
  const { showToast } = useToast()
  const profile = getProfile()
  const inventory = getInventory()

  const handleEnhance = (id: string, name: string, level: number) => {
    const cost = ENHANCE_COST(level)
    if (profile.coins < cost) {
      showToast('error', `Không đủ Xu! Cần ${cost.toLocaleString()} 🪙`)
      return
    }
    const r = enhanceEquipment(id)
    if (!r.success) {
      showToast('error', r.error || 'Cường hóa thất bại!')
      return
    }
    showToast('success', `✨ Cường hóa ${name} lên Lv.${r.newLevel} thành công!`)
  }

  const renderSlot = (slot: EquipmentSlot) => {
    const equipped = getEquippedBySlot(slot)
    const slotInfo = SLOT_LABELS[slot]
    const SlotIcon = SLOT_ICONS[slot]
    const rarity = equipped ? RARITY_STYLES[equipped.rarity] : null

    return (
      <div
        key={slot}
        className={cn(
          'relative rounded-2xl p-3 border-2 transition-all',
          equipped
            ? cn(rarity!.bg, rarity!.border, rarity!.glow && 'shadow-lg')
            : 'bg-gray-50 dark:bg-gray-800/30 border-dashed border-gray-300 dark:border-gray-700'
        )}
      >
        <div className="flex items-center gap-1 mb-2">
          <SlotIcon className={cn(
            'h-3.5 w-3.5',
            equipped ? rarity!.text : 'text-gray-400'
          )} />
          <span className={cn(
            'text-[11px] font-bold uppercase tracking-wider',
            equipped ? rarity!.text : 'text-gray-500 dark:text-gray-400'
          )}>
            {slotInfo.label}
          </span>
        </div>

        {equipped ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center text-2xl border-2 shadow-inner',
                rarity!.bg,
                rarity!.border
              )}>
                <span>{equipped.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className={cn('text-sm font-bold truncate', rarity!.text)}>
                    {equipped.name}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                    rarity!.bg,
                    rarity!.border,
                    'border'
                  )}>
                    {rarity!.label}
                  </span>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-200/60 dark:bg-gray-700/60 px-1.5 py-0.5 rounded-md">
                    Lv.{equipped.level}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 mb-2.5">
              {equipped.attack > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 font-semibold">
                  <Sword className="h-3 w-3" />
                  <span>+{equipped.attack}</span>
                </div>
              )}
              {equipped.defense > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                  <Shield className="h-3 w-3" />
                  <span>+{equipped.defense}</span>
                </div>
              )}
              {equipped.hp > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>❤️</span>
                  <span>+{equipped.hp}</span>
                </div>
              )}
              {equipped.critRate > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-orange-600 dark:text-orange-400 font-semibold">
                  <span>💥</span>
                  <span>+{equipped.critRate}%</span>
                </div>
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              fullWidth
              leftIcon={<ArrowUp className="h-3.5 w-3.5" />}
              onClick={() => handleEnhance(equipped.id, equipped.name, equipped.level)}
              className="!h-9 !text-xs !rounded-xl"
            >
              <span className="flex items-center gap-1">
                <span>Cường hóa</span>
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold">
                  <Coins className="h-3 w-3" />
                  {ENHANCE_COST(equipped.level)}
                </span>
              </span>
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-3 text-center">
            <div className="w-11 h-11 rounded-xl bg-gray-200/60 dark:bg-gray-700/40 flex items-center justify-center mb-1.5">
              <SlotIcon className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              Chưa có trang bị
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gem className="h-5 w-5 text-purple-500" />
          Trang bị
        </CardTitle>
        <CardDescription>
          {inventory.length > 0
            ? `${inventory.length} trang bị trong túi · Cường hóa để tăng chỉ số`
            : 'Hoàn thành ải để nhận trang bị'}
        </CardDescription>
      </CardHeader>
      <CardBody className="!pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2.5 sm:gap-3">
          {SLOT_ORDER.map(renderSlot)}
        </div>
      </CardBody>
    </Card>
  )
}
