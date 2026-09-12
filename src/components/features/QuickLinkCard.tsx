import React, { useState } from 'react'
import { ExternalLink, Pencil, Trash2, Pin, PinOff } from 'lucide-react'
import type { QuickLink } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/hooks/useToast'
import { useData } from '@/hooks/useData'
import { cn, getFaviconUrl, normalizeUrl, hexToRgba } from '@/utils/helpers'

interface QuickLinkCardProps {
  link: QuickLink
  onEdit?: () => void
}

export const QuickLinkCard: React.FC<QuickLinkCardProps> = ({ link, onEdit }) => {
  const { showToast } = useToast()
  const { deleteQuickLink, togglePinQuickLink } = useData()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleOpen = () => {
    window.open(normalizeUrl(link.url), '_blank', 'noopener,noreferrer')
  }

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation()
    togglePinQuickLink(link.id)
    showToast('success', link.pinned ? 'Đã bỏ ghim' : 'Đã ghim lên đầu 📌')
  }

  const handleDelete = () => {
    const ok = deleteQuickLink(link.id)
    showToast(ok ? 'success' : 'error', ok ? 'Đã xóa link' : 'Xóa thất bại')
    setDeleteOpen(false)
  }

  return (
    <>
      <Card
        hoverable
        className="p-4 sm:p-5 overflow-hidden group relative cursor-pointer"
        onClick={handleOpen}
      >
        <div
          className="absolute -right-10 -top-10 w-28 h-28 rounded-full opacity-10 group-hover:opacity-20 transition-opacity blur-xl"
          style={{ backgroundColor: link.color }}
        />

        <div className="relative flex items-start justify-between gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-soft transition-transform group-hover:scale-110"
            style={{ backgroundColor: hexToRgba(link.color, 0.15), color: link.color }}
          >
            <img
              src={getFaviconUrl(link.url)}
              alt=""
              className="w-7 h-7 rounded-lg object-contain"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
                const next = e.target.nextElementSibling as HTMLElement
                if (next) next.style.display = 'flex'
              }}
            />
            <div className="hidden items-center justify-center w-7 h-7 text-lg font-bold">
              {link.title.charAt(0)}
            </div>
          </div>

          <div className="flex items-center gap-0.5 opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleTogglePin}
              className={cn(
                'p-2 rounded-xl transition-colors',
                link.pinned
                  ? 'opacity-100 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30'
                  : 'text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
              aria-label={link.pinned ? 'Bỏ ghim' : 'Ghim'}
            >
              {link.pinned ? <Pin className="h-4 w-4 fill-current" /> : <PinOff className="h-4 w-4" />}
            </button>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
                aria-label="Sửa"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                setDeleteOpen(true)
              }}
              aria-label="Xóa"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors mb-1 line-clamp-1 relative">
          {link.title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate relative">
          {link.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
        </p>

        <div className="relative mt-4 flex items-center justify-between">
          <span
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg"
            style={{ backgroundColor: hexToRgba(link.color, 0.1), color: link.color }}
          >
            {link.pinned && '📌 Đã ghim'}
            {!link.pinned && (
              <>
                <ExternalLink className="h-3 w-3" />
                Truy cập
              </>
            )}
          </span>
        </div>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Xóa link?"
        description={`Link "${link.title}" sẽ bị xóa khỏi truy cập nhanh.`}
      />
    </>
  )
}
