import React, { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import type { Subject } from '@/types'
import { SUBJECT_COLORS, SUBJECT_ICONS } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { cn, hexToRgba } from '@/utils/helpers'
import { useToast } from '@/hooks/useToast'
import { useData } from '@/hooks/useData'
import * as LucideIcons from 'lucide-react'

interface SubjectFormProps {
  open: boolean
  onClose: () => void
  subject?: Subject | null
}

export const SubjectForm: React.FC<SubjectFormProps> = ({
  open,
  onClose,
  subject,
}) => {
  const isEdit = !!subject

  const { showToast } = useToast()
  const { addSubject, updateSubject } = useData()

  const [form, setForm] = useState({
    name: '',
    code: '',
    teacher: '',
    description: '',
    color: SUBJECT_COLORS[0],
    icon: SUBJECT_ICONS[0],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  /*
   * Chỉ reset form khi:
   * - mở modal
   * - đổi subject đang chỉnh sửa
   *
   * Không reset khi người dùng đang nhập.
   */
  useEffect(() => {
    if (!open) return

    if (subject) {
      setForm({
        name: subject.name ?? '',
        code: subject.code ?? '',
        teacher: subject.teacher ?? '',
        description: subject.description ?? '',
        color: subject.color ?? SUBJECT_COLORS[0],
        icon: subject.icon ?? SUBJECT_ICONS[0],
      })
    } else {
      setForm({
        name: '',
        code: '',
        teacher: '',
        description: '',
        color:
          SUBJECT_COLORS[
            Math.floor(Math.random() * SUBJECT_COLORS.length)
          ],
        icon: SUBJECT_ICONS[0],
      })
    }

    setErrors({})
    setSubmitting(false)
  }, [open, subject])

  const updateForm = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))

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

    if (!form.name.trim()) {
      newErrors.name = 'Tên môn học không được để trống'
    }

    setErrors(newErrors)

    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setSubmitting(true)

    try {
      if (isEdit && subject) {
        const result = updateSubject(subject.id, form)

        if (!result.success) {
          showToast(
            'error',
            result.error || 'Cập nhật thất bại'
          )
          return
        }

        showToast(
          'success',
          `Đã cập nhật môn "${result.subject?.name}"`
        )
      } else {
        const result = addSubject(form)

        if (!result.success) {
          showToast(
            'error',
            result.error || 'Thêm môn học thất bại'
          )
          return
        }

        showToast(
          'success',
          `Đã thêm môn "${result.subject?.name}"`
        )
      }

      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const IconComponent = (
    LucideIcons as Record<string, unknown>
  )[form.icon] as
    | React.ComponentType<{
        className?: string
        style?: React.CSSProperties
      }>
    | undefined

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Sửa môn học' : 'Thêm môn học mới'}
      description={
        isEdit
          ? 'Cập nhật thông tin môn học của bạn'
          : 'Tạo môn học mới để quản lý tài liệu'
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
            {isEdit ? 'Lưu thay đổi' : 'Thêm môn học'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {/* PREVIEW */}
        <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/50">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-soft"
            style={{
              backgroundColor: hexToRgba(form.color, 0.15),
              color: form.color,
            }}
          >
            {IconComponent ? (
              <IconComponent className="h-7 w-7" />
            ) : (
              <span className="text-xl">📚</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Xem trước
            </p>

            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {form.name || 'Tên môn học'}
            </p>
          </div>
        </div>

        {/* TÊN + MÃ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Tên môn học *"
            placeholder="Ví dụ: Toán học"
            value={form.name}
            onChange={(e) =>
              updateForm('name', e.target.value)
            }
            error={errors.name}
            required
          />

          <Input
            label="Mã môn"
            placeholder="Ví dụ: TOAN"
            value={form.code}
            onChange={(e) =>
              updateForm('code', e.target.value)
            }
          />
        </div>

        {/* GIÁO VIÊN */}
        <Input
          label="Giáo viên"
          placeholder="Tên giáo viên phụ trách"
          value={form.teacher}
          onChange={(e) =>
            updateForm('teacher', e.target.value)
          }
        />

        {/* MÔ TẢ */}
        <Textarea
          label="Mô tả"
          placeholder="Mô tả ngắn gọn về môn học này..."
          value={form.description}
          onChange={(e) =>
            updateForm(
              'description',
              e.target.value
            )
          }
          rows={3}
        />

        {/* ICON */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Icon
          </label>

          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
            {SUBJECT_ICONS.map((iconName) => {
              const I = (
                LucideIcons as Record<string, unknown>
              )[iconName] as React.ComponentType<{
                className?: string
              }>

              const selected =
                form.icon === iconName

              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() =>
                    updateForm('icon', iconName)
                  }
                  className={cn(
                    'aspect-square rounded-xl flex items-center justify-center transition-all duration-200 border-2',
                    selected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
                  )}
                >
                  {I ? (
                    <I className="h-5 w-5" />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        {/* MÀU */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Màu sắc
          </label>

          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
            {SUBJECT_COLORS.map((color) => {
              const selected =
                form.color === color

              return (
                <button
                  key={color}
                  type="button"
                  onClick={() =>
                    updateForm('color', color)
                  }
                  className={cn(
                    'aspect-square rounded-xl transition-all duration-200 border-2',
                    selected
                      ? 'ring-2 ring-offset-2 dark:ring-offset-gray-800 scale-105'
                      : 'hover:scale-105'
                  )}
                  style={{
                    backgroundColor: color,
                    borderColor: selected
                      ? color
                      : 'transparent',
                  }}
                  aria-label={`Màu ${color}`}
                />
              )
            })}
          </div>
        </div>
      </form>
    </Modal>
  )
}