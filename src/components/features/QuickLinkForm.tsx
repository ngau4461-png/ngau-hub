import React, { useState, useEffect } from 'react'
import { Save, Pin } from 'lucide-react'
import type { QuickLink } from '@/types'
import { SUBJECT_COLORS } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/hooks/useToast'
import { useData } from '@/hooks/useData'
import { cn } from '@/utils/helpers'

interface QuickLinkFormProps {
  open: boolean
  onClose: () => void
  link?: QuickLink | null
}

export const QuickLinkForm: React.FC<QuickLinkFormProps> = ({ open, onClose, link }) => {
  const isEdit = !!link
  const { showToast } = useToast()
  const { addQuickLink, updateQuickLink } = useData()

  const [form, setForm] = useState({
    title: '',
    url: '',
    icon: 'link',
    color: SUBJECT_COLORS[0],
    pinned: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (link) {
        setForm({
          title: link.title,
          url: link.url,
          icon: link.icon,
          color: link.color,
          pinned: link.pinned,
        })
      } else {
        setForm({
          title: '',
          url: '',
          icon: 'link',
          color: SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)],
          pinned: false,
        })
      }
      setErrors({})
      setSubmitting(false)
    }
  }, [link, open])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.title.trim()) newErrors.title = 'Tên link không được để trống'
    if (!form.url.trim()) {
      newErrors.url = 'URL không được để trống'
    } else {
      try {
        const trimmed = form.url.trim()
        const toCheck = trimmed.startsWith('http') ? trimmed : 'https://' + trimmed
        new URL(toCheck)
      } catch {
        newErrors.url = 'URL không hợp lệ (ví dụ: https://example.com)'
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    try {
      if (isEdit && link) {
        const result = updateQuickLink(link.id, form)
        if (!result.success) {
          showToast('error', result.error || 'Cập nhật thất bại')
          return
        }
        showToast('success', 'Đã cập nhật link')
      } else {
        const result = addQuickLink(form)
        if (!result.success) {
          showToast('error', result.error || 'Thêm link thất bại')
          return
        }
        showToast('success', `Đã thêm link "${result.quickLink?.title}" ⚡`)
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
      title={isEdit ? 'Sửa link' : 'Thêm link truy cập nhanh'}
      description={isEdit ? 'Cập nhật thông tin link' : 'Thêm link thường dùng để truy cập nhanh chóng'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} loading={submitting} leftIcon={<Save className="h-4 w-4" />}>
            {isEdit ? 'Lưu thay đổi' : 'Thêm link'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Tên link *"
          placeholder="Ví dụ: Google Drive"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          error={errors.title}
          required
        />

        <Input
          label="URL *"
          placeholder="https://example.com"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          error={errors.url}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Màu sắc
          </label>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
            {SUBJECT_COLORS.map((color) => {
              const selected = form.color === color
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={cn(
                    'aspect-square rounded-xl transition-all duration-200 border-2',
                    selected && 'ring-2 ring-offset-2 dark:ring-offset-gray-800 scale-105'
                  )}
                  style={{ backgroundColor: color, borderColor: selected ? color : 'transparent' }}
                />
              )
            })}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none p-3 rounded-xl border border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <input
            type="checkbox"
            checked={form.pinned}
            onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
              <Pin className="h-4 w-4" /> Ghim lên đầu
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Link được ghim sẽ xuất hiện ở vị trí đầu tiên
            </p>
          </div>
        </label>
      </form>
    </Modal>
  )
}
