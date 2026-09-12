import React, { useState, useMemo } from 'react'
import { Link, useParams, useNavigate, useOutletContext } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Grid3x3,
  List,
  SortAsc,
  Pencil,
  Trash2,
  BookOpen,
  User as UserIcon,
  FolderOpen,
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
import { SubjectForm } from '@/components/features/SubjectForm'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { RESOURCE_FILTERS, SORT_OPTIONS } from '@/constants'
import { hexToRgba } from '@/utils/helpers'
import type { Subject, Resource, ViewMode, SortOption, ResourceType } from '@/types'

interface OutletCtx {
  globalSearch: string
}

const SubjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { globalSearch } = useOutletContext<OutletCtx>()
  const { showToast } = useToast()
  const {
    getSubjectById,
    deleteSubject,
    searchResources,
    getResourcesBySubject,
  } = useData()

  const subject: Subject | undefined = id ? getSubjectById(id) : undefined

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sort, setSort] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [resourceFormOpen, setResourceFormOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [subjectFormOpen, setSubjectFormOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const resources = useMemo(() => {
    if (!subject) return []
    const finalQuery = globalSearch || query
    return searchResources({
      query: finalQuery,
      subjectId: subject.id,
      type: typeFilter === 'all' ? 'all' : (typeFilter as ResourceType | 'favorite'),
      sort,
    })
  }, [subject, globalSearch, query, typeFilter, sort, searchResources])

  if (!subject) {
    return (
      <div className="space-y-4">
        <Link to="/subjects">
          <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Quay lại môn học
          </Button>
        </Link>
        <EmptyState
          icon={LucideIcons.BookOpen}
          title="Không tìm thấy môn học"
          description="Môn học không tồn tại hoặc đã bị xóa."
          action={{ label: 'Xem tất cả môn học', onClick: () => navigate('/subjects') }}
        />
      </div>
    )
  }

  const IconComp = (LucideIcons as Record<string, unknown>)[subject.icon] as React.ComponentType<{
    className?: string
    style?: React.CSSProperties
  }>

  const handleDeleteSubject = () => {
    const ok = deleteSubject(subject.id)
    if (ok) {
      showToast('success', 'Đã xóa môn học')
      navigate('/subjects')
    } else {
      showToast('error', 'Xóa thất bại')
    }
    setDeleteConfirmOpen(false)
  }

  return (
    <div className="space-y-6">
      <Link to="/subjects">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Quay lại danh sách
        </Button>
      </Link>

      <Card>
        <CardBody className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-soft-lg flex-shrink-0"
              style={{ backgroundColor: hexToRgba(subject.color, 0.2), color: subject.color }}
            >
              {IconComp ? (
                <IconComp className="h-8 w-8 sm:h-10 sm:w-10" />
              ) : (
                <BookOpen className="h-8 w-8 sm:h-10 sm:w-10" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
                    {subject.name}
                  </h1>
                  <div className="mt-2 flex items-center gap-2 sm:gap-3 flex-wrap">
                    {subject.code && <Badge size="sm">Mã: {subject.code}</Badge>}
                    {subject.teacher && (
                      <Badge variant="info" size="sm">
                        <UserIcon className="h-3 w-3 mr-1" />
                        {subject.teacher}
                      </Badge>
                    )}
                    <Badge
                      size="sm"
                      style={{ backgroundColor: hexToRgba(subject.color, 0.15), color: subject.color }}
                    >
                      <FolderOpen className="h-3 w-3 mr-1" />
                      {getResourcesBySubject(subject.id).length} tài liệu
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Pencil className="h-4 w-4" />}
                    onClick={() => setSubjectFormOpen(true)}
                  >
                    Sửa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 className="h-4 w-4" />}
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="!text-red-600 hover:!bg-red-50 dark:!text-red-400 dark:hover:!bg-red-900/20"
                  >
                    Xóa
                  </Button>
                </div>
              </div>
              {subject.description && (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {subject.description}
                </p>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              Tài liệu môn học
              <Badge variant="primary" size="sm">
                {resources.length}
              </Badge>
            </CardTitle>
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditingResource(null)
                setResourceFormOpen(true)
              }}
            >
              Thêm tài liệu
            </Button>
          </div>
        </CardHeader>
        <CardBody className="pt-0 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 sticky top-16 z-10 py-3 -mx-6 px-6 bg-white/90 dark:bg-gray-800/80 backdrop-blur border-b border-gray-100 dark:border-gray-700/60 -mt-5 mb-4">
            <div className="flex-1 min-w-0 w-full sm:max-w-md">
              <SearchBar value={query} onChange={setQuery} placeholder="Tìm trong môn này..." />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={RESOURCE_FILTERS as unknown as { value: string; label: string }[]}
                className="!h-10 sm:w-[160px]"
              />
              <div className="flex items-center gap-1 sm:w-auto w-full">
                <div className="flex-1">
                  <Select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortOption)}
                    options={SORT_OPTIONS as unknown as { value: string; label: string }[]}
                    className="!h-10"
                  />
                </div>
                <div className="hidden sm:flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={
                      'p-1.5 rounded-lg transition-all ' +
                      (viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200')
                    }
                    aria-label="Chế độ lưới"
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
                    aria-label="Chế độ danh sách"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {resources.length === 0 ? (
            <EmptyState
              icon={LucideIcons.FolderOpen}
              title="Chưa có tài liệu"
              description={
                query || typeFilter !== 'all'
                  ? 'Không tìm thấy tài liệu phù hợp. Thử lại với từ khóa khác.'
                  : 'Hãy thêm tài liệu đầu tiên cho môn học này.'
              }
              action={{
                label: 'Thêm tài liệu',
                onClick: () => {
                  setEditingResource(null)
                  setResourceFormOpen(true)
                },
                icon: <Plus className="h-4 w-4" />,
              }}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {resources.map((r: Resource) => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  subject={subject}
                  onEdit={() => {
                    setEditingResource(r)
                    setResourceFormOpen(true)
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {resources.map((r: Resource) => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  subject={subject}
                  viewMode="list"
                  onEdit={() => {
                    setEditingResource(r)
                    setResourceFormOpen(true)
                  }}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <ResourceForm
        open={resourceFormOpen}
        onClose={() => {
          setResourceFormOpen(false)
          setEditingResource(null)
        }}
        resource={editingResource}
        defaultSubjectId={subject.id}
      />

      <SubjectForm
        open={subjectFormOpen}
        onClose={() => setSubjectFormOpen(false)}
        subject={subject}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteSubject}
        title="Xóa môn học?"
        description={`Môn "${subject.name}" và ${resources.length} tài liệu liên quan sẽ bị xóa vĩnh viễn.`}
      />
    </div>
  )
}

export default SubjectDetail
