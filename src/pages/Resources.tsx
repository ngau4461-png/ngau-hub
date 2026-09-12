import React, { useState, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Plus,
  Grid3x3,
  List,
  FolderOpen,
  Pencil,
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useData } from '@/hooks/useData'
import { useToast } from '@/hooks/useToast'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Select } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { ResourceCard } from '@/components/features/ResourceCard'
import { ResourceForm } from '@/components/features/ResourceForm'
import { RESOURCE_FILTERS, SORT_OPTIONS } from '@/constants'
import type { Resource, ViewMode, SortOption, ResourceType } from '@/types'

interface OutletCtx {
  globalSearch: string
}

const Resources: React.FC = () => {
  const { globalSearch } = useOutletContext<OutletCtx>()
  const { showToast } = useToast()
  const { searchResources, getSubjects } = useData()

  const [query, setQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sort, setSort] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [formOpen, setFormOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)

  const subjects = getSubjects()

  const resources = useMemo(() => {
    const finalQuery = globalSearch || query
    return searchResources({
      query: finalQuery,
      subjectId: subjectFilter === 'all' ? undefined : subjectFilter,
      type: typeFilter === 'all' ? 'all' : (typeFilter as ResourceType | 'favorite'),
      sort,
    })
  }, [globalSearch, query, subjectFilter, typeFilter, sort, searchResources])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
            🔗 Tất cả tài liệu
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {resources.length} tài liệu - Quản lý toàn bộ link học tập của bạn
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setEditingResource(null)
            setFormOpen(true)
          }}
          fullWidth
          className="sm:w-auto"
        >
          Thêm tài liệu
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
            <div className="flex-1 min-w-0">
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder="Tìm theo tên, mô tả, môn, thẻ tag..."
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0">
              <Select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Tất cả môn' },
                  ...subjects.map((s) => ({ value: s.id, label: s.name })),
                ]}
                className="!h-10 w-full sm:w-[150px]"
              />
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={RESOURCE_FILTERS as unknown as { value: string; label: string }[]}
                className="!h-10 w-full sm:w-[150px]"
              />
              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                options={SORT_OPTIONS as unknown as { value: string; label: string }[]}
                className="!h-10 w-full sm:w-[140px]"
              />
              <div className="hidden sm:flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setViewMode('grid')}
                  className={
                    'p-1.5 rounded-lg transition-all ' +
                    (viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200')
                  }
                  aria-label="Lưới"
                >
                  <Grid3x3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={
                    'p-1.5 rounded-lg transition-all ' +
                    (viewMode === 'list'
                      ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200')
                  }
                  aria-label="Danh sách"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge variant="primary" size="sm">
              {resources.length} kết quả
            </Badge>
            {subjectFilter !== 'all' && (
              <Badge variant="info" size="sm" onRemove={() => setSubjectFilter('all')}>
                Môn: {subjects.find((s) => s.id === subjectFilter)?.name}
              </Badge>
            )}
            {typeFilter !== 'all' && (
              <Badge variant="success" size="sm" onRemove={() => setTypeFilter('all')}>
                Lọc: {RESOURCE_FILTERS.find((f) => f.value === typeFilter)?.label}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          {resources.length === 0 ? (
            <EmptyState
              icon={LucideIcons.FolderOpen}
              title="Không có tài liệu"
              description={
                query || subjectFilter !== 'all' || typeFilter !== 'all'
                  ? 'Thử thay đổi điều kiện tìm kiếm hoặc bộ lọc'
                  : 'Chưa có tài liệu nào. Hãy thêm tài liệu đầu tiên!'
              }
              action={{
                label: 'Thêm tài liệu',
                onClick: () => {
                  setEditingResource(null)
                  setFormOpen(true)
                },
                icon: <Plus className="h-4 w-4" />,
              }}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {resources.map((r) => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  onEdit={() => {
                    setEditingResource(r)
                    setFormOpen(true)
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {resources.map((r) => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  viewMode="list"
                  onEdit={() => {
                    setEditingResource(r)
                    setFormOpen(true)
                  }}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <ResourceForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingResource(null)
        }}
        resource={editingResource}
      />
    </div>
  )
}

export default Resources
