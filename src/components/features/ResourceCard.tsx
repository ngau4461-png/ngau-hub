import React, { useState } from 'react'
import {
  ExternalLink,
  Pencil,
  Trash2,
  Star,
  Copy,
  Clock,
} from 'lucide-react'

import type { Resource, Subject } from '@/types'
import { RESOURCE_TYPES } from '@/types'

import { Card } from '@/components/ui/Card'
import { Badge, Tag } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

import { useToast } from '@/hooks/useToast'
import { useData } from '@/hooks/useData'

import {
  cn,
  formatDate,
  getFaviconUrl,
  getHostname,
  copyToClipboard,
  normalizeUrl,
  hexToRgba,
} from '@/utils/helpers'

interface ResourceCardProps {
  resource: Resource
  subject?: Subject
  onEdit?: () => void
  viewMode?: 'grid' | 'list'
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  subject,
  onEdit,
  viewMode = 'grid',
}) => {
  const { showToast } = useToast()

  const {
    toggleFavorite,
    deleteResource,
    getSubjectById,
  } = useData()

  const [deleteOpen, setDeleteOpen] = useState(false)

  const typeInfo =
    RESOURCE_TYPES.find((t) => t.value === resource.type) ||
    RESOURCE_TYPES[5]

  const subjectData =
    subject || getSubjectById(resource.subjectId)

  const subjectColor =
    subjectData?.color || '#6b7280'

  // =========================
  // MỞ LINK
  // =========================

  const handleOpen = (
    e: React.MouseEvent
  ) => {
    e.stopPropagation()

    window.open(
      normalizeUrl(resource.url),
      '_blank',
      'noopener,noreferrer'
    )
  }

  // =========================
  // YÊU THÍCH
  // =========================

  const handleFavorite = (
    e: React.MouseEvent
  ) => {
    e.stopPropagation()

    toggleFavorite(resource.id)

    showToast(
      resource.favorite
        ? 'success'
        : 'info',
      resource.favorite
        ? 'Đã thêm vào yêu thích ⭐'
        : 'Đã bỏ yêu thích'
    )
  }

  // =========================
  // COPY
  // =========================

  const handleCopy = async (
    e: React.MouseEvent
  ) => {
    e.stopPropagation()

    const ok = await copyToClipboard(
      normalizeUrl(resource.url)
    )

    showToast(
      ok ? 'success' : 'error',
      ok
        ? 'Đã sao chép link'
        : 'Sao chép thất bại'
    )
  }

  // =========================
  // XÓA
  // =========================

  const handleDelete = () => {
    const ok = deleteResource(resource.id)

    showToast(
      ok ? 'success' : 'error',
      ok
        ? 'Đã xóa tài liệu Rồi Ngâu'
        : 'Xóa thất bại'
    )

    setDeleteOpen(false)
  }

  // =========================
  // NÚT ACTION
  // =========================

  const actionButtonClass =
    'w-9 h-9 rounded-lg flex items-center justify-center ' +
    'transition-all duration-150 border ' +
    'focus:outline-none focus:ring-2 focus:ring-primary-500/30'

  // =========================
  // LIST VIEW
  // =========================

  if (viewMode === 'list') {
    return (
      <>
        <Card className="p-4 hover:shadow-soft-lg transition-all duration-300 overflow-hidden group">
          <div className="flex items-center gap-3 sm:gap-4">

            {/* ICON */}

            <button
              type="button"
              onClick={handleOpen}
              className={cn(
                'flex-shrink-0 w-12 h-12 rounded-xl',
                'flex items-center justify-center text-xl',
                'transition-transform hover:scale-105'
              )}
              style={{
                backgroundColor:
                  hexToRgba(
                    subjectColor,
                    0.15
                  ),
              }}
              aria-label="Mở tài liệu"
            >
              {typeInfo.icon}
            </button>

            {/* INFO */}

            <div className="flex-1 min-w-0">

              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3
                  className="font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer"
                  onClick={handleOpen}
                >
                  {resource.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">

                <Badge
                  variant="default"
                  size="sm"
                >
                  {typeInfo.label}
                </Badge>

                {subjectData && (
                  <Badge
                    size="sm"
                    style={{
                      backgroundColor:
                        hexToRgba(
                          subjectColor,
                          0.15
                        ),
                      color: subjectColor,
                    }}
                  >
                    {subjectData.name}
                  </Badge>
                )}

                <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="h-3 w-3" />
                  {formatDate(
                    resource.createdAt
                  )}
                </span>

              </div>
            </div>

            {/* ACTIONS */}

            <div className="flex items-center gap-1.5 flex-shrink-0">

              {/* FAVORITE */}

              <button
                type="button"
                onClick={handleFavorite}
                className={cn(
                  actionButtonClass,
                  resource.favorite
                    ? 'text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800/50'
                    : 'text-gray-600 bg-gray-50 border-gray-200 hover:text-amber-500 hover:bg-amber-50 hover:border-amber-200 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:text-amber-400 dark:hover:bg-amber-900/30'
                )}
                aria-label={
                  resource.favorite
                    ? 'Bỏ yêu thích'
                    : 'Yêu thích'
                }
              >
                <Star
                  className={cn(
                    'h-4 w-4',
                    resource.favorite &&
                      'fill-current'
                  )}
                />
              </button>

              {/* OPEN */}

              <button
                type="button"
                onClick={handleOpen}
                className={cn(
                  actionButtonClass,
                  'text-blue-600 bg-blue-50 border-blue-200',
                  'hover:bg-blue-100 hover:border-blue-300',
                  'dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800/50',
                  'dark:hover:bg-blue-900/50'
                )}
                aria-label="Mở link"
                title="Mở link"
              >
                <ExternalLink className="h-4 w-4" />
              </button>

              {/* EDIT */}

              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                  className={cn(
                    actionButtonClass,
                    'text-indigo-600 bg-indigo-50 border-indigo-200',
                    'hover:bg-indigo-100 hover:border-indigo-300',
                    'dark:text-indigo-400 dark:bg-indigo-900/30 dark:border-indigo-800/50',
                    'dark:hover:bg-indigo-900/50'
                  )}
                  aria-label="Sửa"
                  title="Sửa tài liệu"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}

              {/* DELETE */}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteOpen(true)
                }}
                className={cn(
                  actionButtonClass,
                  'text-red-600 bg-red-50 border-red-200',
                  'hover:bg-red-100 hover:border-red-300',
                  'dark:text-red-400 dark:bg-red-900/30 dark:border-red-800/50',
                  'dark:hover:bg-red-900/50'
                )}
                aria-label="Xóa"
                title="Xóa tài liệu"
              >
                <Trash2 className="h-4 w-4" />
              </button>

            </div>
          </div>
        </Card>

        <ConfirmDialog
          open={deleteOpen}
          onClose={() =>
            setDeleteOpen(false)
          }
          onConfirm={handleDelete}
          title="Xóa tài liệu?"
          description={`Tài liệu "${resource.title}" sẽ bị xóa vĩnh viễn.`}
          confirmText="Xóa tài liệu"
        />
      </>
    )
  }

  // =========================
  // GRID VIEW
  // =========================

  return (
    <>
      <Card
        hoverable
        className="flex flex-col h-full overflow-hidden group"
      >

        {/* HEADER */}

        <div
          className="relative h-28 flex items-center justify-center overflow-hidden"
          style={{
            backgroundColor:
              hexToRgba(
                subjectColor,
                0.08
              ),
          }}
        >

          {/* BACKGROUND */}

          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background:
                `radial-gradient(circle at top right, ${hexToRgba(
                  subjectColor,
                  0.4
                )}, transparent 60%)`,
            }}
          />

          {/* FAVICON */}

          <button
            type="button"
            onClick={handleOpen}
            className="relative z-[1] w-12 h-12 rounded-xl bg-white dark:bg-gray-800 p-2 shadow-soft flex items-center justify-center transition-transform hover:scale-105"
            aria-label="Mở tài liệu"
          >
            <img
              src={getFaviconUrl(
                resource.url
              )}
              alt=""
              className="w-full h-full object-contain rounded-lg"
              onError={(e) => {
                const img =
                  e.target as HTMLImageElement

                const fallback =
                  img.nextElementSibling as HTMLElement | null

                img.style.display = 'none'

                if (fallback) {
                  fallback.style.display =
                    'flex'
                }
              }}
            />

            <span className="w-full h-full items-center justify-center text-2xl hidden">
              {typeInfo.icon}
            </span>
          </button>

          {/* FAVORITE */}

          <button
            type="button"
            onClick={handleFavorite}
            className={cn(
              'absolute top-3 right-3 z-10',
              'w-9 h-9 rounded-xl',
              'flex items-center justify-center',
              'backdrop-blur-sm border',
              'transition-all duration-150',
              resource.favorite
                ? 'bg-amber-500 text-white border-amber-400 shadow-soft'
                : 'bg-white/95 dark:bg-gray-800/95',
              resource.favorite
                ? ''
                : 'text-gray-600 border-gray-200 hover:text-amber-500 hover:border-amber-300 hover:bg-amber-50 dark:text-gray-300 dark:border-gray-700 dark:hover:text-amber-400 dark:hover:bg-amber-900/30'
            )}
            aria-label={
              resource.favorite
                ? 'Bỏ yêu thích'
                : 'Yêu thích'
            }
            title={
              resource.favorite
                ? 'Bỏ yêu thích'
                : 'Yêu thích'
            }
          >
            <Star
              className={cn(
                'h-4 w-4',
                resource.favorite &&
                  'fill-current'
              )}
            />
          </button>

          {/* TYPE */}

          <div className="absolute top-3 left-3 z-10">
            <Badge
              size="sm"
              className={cn(
                typeInfo.color,
                'backdrop-blur-sm shadow-soft'
              )}
            >
              <span className="mr-1">
                {typeInfo.icon}
              </span>
              {typeInfo.label}
            </Badge>
          </div>

        </div>

        {/* CONTENT */}

        <div className="flex-1 flex flex-col p-4 min-h-0">

          {/* TITLE */}

          <button
            type="button"
            onClick={handleOpen}
            className="text-left group/title"
          >
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover/title:text-primary-600 dark:group-hover/title:text-primary-400 transition-colors">
              {resource.title}
            </h3>
          </button>

          {/* DESCRIPTION */}

          {resource.description && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 flex-shrink-0">
              {resource.description}
            </p>
          )}

          {/* SUBJECT */}

          <div className="mt-3 flex items-center gap-2 flex-wrap flex-shrink-0">

            {subjectData && (
              <Badge
                size="sm"
                style={{
                  backgroundColor:
                    hexToRgba(
                      subjectColor,
                      0.15
                    ),
                  color: subjectColor,
                }}
              >
                {subjectData.name}
              </Badge>
            )}

            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {getHostname(
                resource.url
              )}
            </span>

          </div>

          {/* TAGS */}

          {resource.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 flex-shrink-0">

              {resource.tags
                .slice(0, 3)
                .map((t) => (
                  <Tag
                    key={t}
                    label={`#${t}`}
                    className="!text-[10px] !py-0.5 !px-2"
                  />
                ))}

              {resource.tags.length > 3 && (
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  +{resource.tags.length - 3}
                </span>
              )}

            </div>
          )}

          {/* FOOTER */}

          <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 flex-shrink-0">

            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">

              <Clock className="h-3 w-3" />

              {formatDate(
                resource.createdAt
              )}

            </span>

            {/* ACTION BUTTONS */}

            <div className="flex items-center gap-1">

              {/* COPY */}

              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  'w-9 h-9 rounded-lg',
                  'flex items-center justify-center',
                  'border',
                  'text-gray-600 bg-gray-50 border-gray-200',
                  'hover:text-gray-900 hover:bg-gray-100 hover:border-gray-300',
                  'dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700',
                  'dark:hover:text-white dark:hover:bg-gray-700',
                  'transition-all'
                )}
                aria-label="Sao chép link"
                title="Sao chép link"
              >
                <Copy className="h-4 w-4" />
              </button>

              {/* OPEN */}

              <button
                type="button"
                onClick={handleOpen}
                className={cn(
                  'w-9 h-9 rounded-lg',
                  'flex items-center justify-center',
                  'border',
                  'text-blue-600 bg-blue-50 border-blue-200',
                  'hover:bg-blue-100 hover:border-blue-300',
                  'dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800/50',
                  'dark:hover:bg-blue-900/50',
                  'transition-all'
                )}
                aria-label="Mở link"
                title="Mở link"
              >
                <ExternalLink className="h-4 w-4" />
              </button>

              {/* EDIT */}

              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                  className={cn(
                    'w-9 h-9 rounded-lg',
                    'flex items-center justify-center',
                    'border',
                    'text-indigo-600 bg-indigo-50 border-indigo-200',
                    'hover:bg-indigo-100 hover:border-indigo-300',
                    'dark:text-indigo-400 dark:bg-indigo-900/30 dark:border-indigo-800/50',
                    'dark:hover:bg-indigo-900/50',
                    'transition-all'
                  )}
                  aria-label="Sửa"
                  title="Sửa tài liệu"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}

              {/* DELETE */}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteOpen(true)
                }}
                className={cn(
                  'w-9 h-9 rounded-lg',
                  'flex items-center justify-center',
                  'border',
                  'text-red-600 bg-red-50 border-red-200',
                  'hover:bg-red-100 hover:border-red-300',
                  'dark:text-red-400 dark:bg-red-900/30 dark:border-red-800/50',
                  'dark:hover:bg-red-900/50',
                  'transition-all'
                )}
                aria-label="Xóa"
                title="Xóa tài liệu"
              >
                <Trash2 className="h-4 w-4" />
              </button>

            </div>
          </div>

        </div>
      </Card>

      {/* DELETE CONFIRM */}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() =>
          setDeleteOpen(false)
        }
        onConfirm={handleDelete}
        title="Xóa tài liệu?"
        description={`Tài liệu "${resource.title}" sẽ bị xóa vĩnh viễn.`}
        confirmText="Xóa tài liệu"
      />
    </>
  )
}