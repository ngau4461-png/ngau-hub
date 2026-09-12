import React, { useState, useMemo } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  Plus,
  Search as SearchIcon,
  BookOpen,
  Pencil,
  Trash2,
  ChevronRight,
  FolderOpen,
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useData } from '@/hooks/useData'
import { useToast } from '@/hooks/useToast'
import { Card, CardHeader, CardTitle, CardBody, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SubjectForm } from '@/components/features/SubjectForm'
import { hexToRgba, cn } from '@/utils/helpers'
import type { Subject } from '@/types'

interface OutletCtx {
  globalSearch: string
}

const Subjects: React.FC = () => {
  const { globalSearch } = useOutletContext<OutletCtx>()
  const { showToast } = useToast()
  const { getSubjects, searchSubjects, deleteSubject, getResourcesBySubject } = useData()

  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const subjects = useMemo(() => {
    const q = (globalSearch || query).trim()
    return q ? searchSubjects(q) : getSubjects()
  }, [getSubjects, searchSubjects, globalSearch, query])

  const handleAdd = () => {
    setEditingSubject(null)
    setFormOpen(true)
  }

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject)
    setFormOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (deleteId) {
      const ok = deleteSubject(deleteId)
      showToast(ok ? 'success' : 'error', ok ? 'Đã xóa môn học' : 'Xóa thất bại')
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
            📚 Quản lý môn học
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {subjects.length > 0
              ? `${subjects.length} môn học - Thêm, sửa, xóa và tìm kiếm môn học`
              : 'Tạo môn học đầu tiên để bắt đầu'}
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleAdd} fullWidth className="sm:w-auto">
          Thêm môn học
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="w-full sm:max-w-md">
              <SearchBar value={query} onChange={setQuery} placeholder="Tên môn, mã, giáo viên..." />
            </div>
            <Badge variant="primary" size="sm" className="self-start sm:self-auto">
              {subjects.length} môn học
            </Badge>
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          {subjects.length === 0 ? (
            <EmptyState
              icon={LucideIcons.BookOpen}
              title="Không tìm thấy môn học"
              description={
                query || globalSearch
                  ? 'Thử tìm với từ khóa khác'
                  : 'Bắt đầu thêm môn học đầu tiên để quản lý tài liệu'
              }
              action={{
                label: 'Thêm môn học',
                onClick: handleAdd,
                icon: <Plus className="h-4 w-4" />,
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {subjects.map((s: Subject) => {
                const I = (LucideIcons as Record<string, unknown>)[s.icon] as React.ComponentType<{
                  className?: string
                  style?: React.CSSProperties
                }>
                const resourceCount = getResourcesBySubject(s.id).length
                return (
                  <Link
                    key={s.id}
                    to={`/subjects/${s.id}`}
                    className="group block"
                  >
                    <div
                      className={cn(
                        'h-full relative p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60',
                        'bg-white dark:bg-gray-800/60 hover:shadow-card-hover hover:-translate-y-0.5',
                        'transition-all duration-300 overflow-hidden'
                      )}
                    >
                      <div
                        className="absolute inset-x-0 top-0 h-1"
                        style={{ backgroundColor: s.color }}
                      />
                      <div
                        className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
                        style={{ backgroundColor: s.color }}
                      />

                      <div className="relative">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-soft"
                            style={{ backgroundColor: hexToRgba(s.color, 0.15), color: s.color }}
                          >
                            {I ? <I className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
                          </div>
                          <div className="flex items-center gap-0.5 -mr-1 -mt-1 opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.preventDefault()
                                handleEdit(s)
                              }}
                              aria-label="Sửa"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.preventDefault()
                                setDeleteId(s.id)
                              }}
                              aria-label="Xóa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {s.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {s.code} · {s.teacher || 'Chưa có giáo viên'}
                        </p>

                        {s.description && (
                          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                            {s.description}
                          </p>
                        )}

                        <div className="mt-5 pt-4 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between">
                          <Badge size="sm" style={{ backgroundColor: hexToRgba(s.color, 0.12), color: s.color }}>
                            <FolderOpen className="h-3 w-3 mr-1" />
                            {resourceCount} tài liệu
                          </Badge>
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 font-medium">
                            Xem chi tiết
                            <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <SubjectForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingSubject(null)
        }}
        subject={editingSubject}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Xóa môn học?"
        description="Tất cả tài liệu thuộc môn học này cũng sẽ bị xóa. Thao tác không thể khôi phục."
      />
    </div>
  )
}

export default Subjects
