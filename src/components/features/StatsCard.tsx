import React from 'react'
import { BookOpen, Link2, FolderOpen, Star, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/helpers'

interface StatsCardProps {
  icon: 'subjects' | 'resources' | 'links' | 'favorites' | 'trending'
  label: string
  value: number
  color: string
  trend?: string
}

const iconMap: Record<StatsCardProps['icon'], LucideIcon> = {
  subjects: BookOpen,
  resources: FolderOpen,
  links: Link2,
  favorites: Star,
  trending: TrendingUp,
}

export const StatsCard: React.FC<StatsCardProps> = ({ icon, label, value, color, trend }) => {
  const Icon = iconMap[icon]
  return (
    <Card hoverable className="p-5 overflow-hidden relative group">
      <div
        className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-start justify-between gap-3 relative">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-soft"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        {trend && (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4 relative">
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
          {value.toLocaleString('vi-VN')}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
      </div>
    </Card>
  )
}
