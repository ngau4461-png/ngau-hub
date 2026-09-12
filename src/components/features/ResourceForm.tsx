import React, { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import type { Resource, ResourceType } from '@/types'
import { RESOURCE_TYPES } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { TagInput } from '@/components/ui/Badge'
import { useToast } from '@/hooks/useToast'
import { useData } from '@/hooks/useData'

interface ResourceFormProps {
  open: boolean
  onClose: () => void
  resource?: Resource | null
  defaultSubjectId?: string
}

export const ResourceForm: React.FC<ResourceFormProps> = ({
  open,
  onClose,
  resource,
  defaultSubjectId,
}) => {
  const isEdit = !!resource

  const { showToast } = useToast()
  const { addResource, updateResource, getSubjects } = useData()

  const subjects = getSubjects()

  const [form, setForm] = useState({
    title: '',
    url: '',
    subjectId: '',
    type: 'document' as ResourceType,
    description: '',
    tags: [] as string[],
    favorite: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  /*
   * QUAN TRỌNG:
   * Chỉ khởi tạo lại form khi modal mở hoặc resource thay đổi.
   *
   * KHÔNG đưa `subjects` vào dependency.
   * `getSubjects()` có thể trả về array mới sau mỗi render,
   * khiến useEffect chạy lại mỗi lần người dùng gõ chữ.
   */
  useEffect(() => {
    if (!open) return

    if (resource) {
      setForm({
        title: resource.title ?? '',
        url: resource.url ?? '',
        subjectId: resource.subjectId ?? '',
        type: resource.type ?? 'document',
        description: resource.description ?? '',
        tags: Array.isArray(resource.tags) ? [...resource.tags] : [],
        favorite: Boolean(resource.favorite),
      })
    } else {
      setForm({
        title: '',
        url: '',
        subjectId: defaultSubjectId ?? '',
        type: 'document',
        description: '',
        tags: [],
        favorite: false,
      })
    }

    setErrors({})
    setSubmitting(false)
  }, [open, resource, defaultSubjectId])

  /*
   * Nếu đang thêm tài liệu và chưa có defaultSubjectId,
   * tự chọn môn đầu tiên.
   *
   * Effect này chạy riêng và KHÔNG reset toàn bộ form.
   */
  useEffect(() => {
    if (!open) return
    if (resource) return
    if (form.subjectId) return
    if (!defaultSubjectId && subjects.length > 0) {
      setForm((prev) => ({
        ...prev,
        subjectId: subjects[0].id,
      }))
    }
  }, [open, resource, defaultSubjectId, subjects])

  const updateForm = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))

    /*
     * Khi người dùng sửa trường nào thì xóa lỗi của trường đó.
     */
    if (errors[key as string]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key as string]
        return next
      })
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!form.title.trim()) {
      newErrors.title = 'Tên tài liệu không được để trống'
    }

    if (!form.url.trim()) {
      newErrors.url = 'URL không được để trống'
    } else {
      try {
        const trimmed = form.url.trim()

        const toCheck = /^https?:\/\//i.test(trimmed)
          ? trimmed
          : `https://${trimmed}`

        new URL(toCheck)
      } catch {
        newErrors.url =
          'URL không hợp lệ. Ví dụ: https://example.com'
      }
    }

    if (!form.subjectId) {
      newErrors.subjectId = 'Vui lòng chọn môn học'
    }

    setErrors(newErrors)

    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setSubmitting(true)

    try {
      if (isEdit && resource) {
        const result = updateResource(resource.id, form)

        if (!result.success) {
          showToast(
            'error',
            result.error || 'Cập nhật thất bại'
          )
          return
        }

        showToast(
          'success',
          'Đã cập nhật tài liệu'
        )
      } else {
        const result = addResource(form)

        if (!result.success) {
          showToast(
            'error',
            result.error || 'Thêm tài liệu thất bại'
          )
          return
        }

        showToast(
          'success',
          `Đã thêm "${result.resource?.title}" ✨`
        )
      }

      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Sửa tài liệu' : 'Thêm tài liệu mới'}
      description={
        isEdit
          ? 'Cập nhật thông tin tài liệu'
          : 'Thêm link/tài liệu mới vào thư viện'
      }
      size="md"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Hủy
          </Button>

          <Button
            onClick={handleSubmit}
            loading={submitting}
            leftIcon={<Save className="h-4 w-4" />}
          >
            {isEdit ? 'Lưu thay đổi' : 'Thêm tài liệu'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {/* TÊN */}
        <Input
          label="Tên tài liệu *"
          placeholder="Ví dụ: Tài liệu giải tích chương 1"
          value={form.title}
          onChange={(e) =>
            updateForm('title', e.target.value)
          }
          error={errors.title}
          required
        />

        {/* URL */}
        <Input
          label="URL *"
          placeholder="https://example.com/document"
          value={form.url}
          onChange={(e) =>
            updateForm('url', e.target.value)
          }
          error={errors.url}
          required
        />

        {/* MÔN + LOẠI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Môn học *"
            value={form.subjectId}
            onChange={(e) =>
              updateForm(
                'subjectId',
                e.target.value
              )
            }
            error={errors.subjectId}
            options={[
              {
                value: '',
                label: '-- Chọn môn học --',
              },
              ...subjects.map((s) => ({
                value: s.id,
                label: s.name,
              })),
            ]}
          />

          <Select
            label="Loại tài liệu"
            value={form.type}
            onChange={(e) =>
              updateForm(
                'type',
                e.target.value as ResourceType
              )
            }
            options={RESOURCE_TYPES.map((r) => ({
              value: r.value,
              label: `${r.icon} ${r.label}`,
            }))}
          />
        </div>

        {/* LOẠI NHANH */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Loại tài liệu nhanh
          </label>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {RESOURCE_TYPES.map((t) => {
              const selected =
                form.type === t.value

              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() =>
                    updateForm(
                      'type',
                      t.value as ResourceType
                    )
                  }
                  className={
                    'flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-medium transition-all duration-200 border-2 ' +
                    (selected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-600')
                  }
                >
                  <span className="text-xl">
                    {t.icon}
                  </span>

                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* MÔ TẢ */}
        <Textarea
          label="Mô tả"
          placeholder="Mô tả ngắn gọn về tài liệu này..."
          value={form.description}
          onChange={(e) =>
            updateForm(
              'description',
              e.target.value
            )
          }
          rows={2}
        />

        {/* TAG */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Thẻ tag
          </label>

          <TagInput
            tags={form.tags}
            onChange={(tags) =>
              updateForm('tags', tags)
            }
          />

          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Nhập tag và nhấn Enter để thêm
          </p>
        </div>

        {/* FAVORITE */}
        <label className="flex items-center gap-2 cursor-pointer select-none py-1">
          <input
            type="checkbox"
            checked={form.favorite}
            onChange={(e) =>
              updateForm(
                'favorite',
                e.target.checked
              )
            }
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />

          <span className="text-sm text-gray-700 dark:text-gray-200">
            Đánh dấu là yêu thích ⭐
          </span>
        </label>
      </form>
    </Modal>
  )
}