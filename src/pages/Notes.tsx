import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Search, Plus, Pencil, Trash2, FileText, FlaskConical, X,
  Image as ImageIcon, Save, Upload, ExternalLink, Eye, CheckCircle, AlertCircle, Info
} from 'lucide-react'
import { useData } from '@/hooks/useData'
import { cn } from '@/utils/helpers'

type TabType = 'notes' | 'formulas'
type ToastType = 'success' | 'error' | 'warning' | 'info'

interface EditorData {
  title: string
  content: string
  images: string[]
}

// ==================== Toast System ====================
interface ToastMessage {
  id: number
  type: ToastType
  message: string
}

let toastId = 0

const Notes: React.FC = () => {
  const { getNotes, getFormulas, addNote, updateNote, deleteNote, addFormula, updateFormula, deleteFormula } = useData()

  // Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (type: ToastType, message: string) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  // Các state khác
  const [activeTab, setActiveTab] = useState<TabType>('notes')
  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EditorData>({ title: '', content: '', images: [] })
  const [processingImages, setProcessingImages] = useState(false)
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Lọc dữ liệu
  const items = useMemo(() => {
    try {
      const source = activeTab === 'notes' ? getNotes() : getFormulas()
      const keyword = search.trim().toLowerCase()
      if (!keyword) return source
      return source.filter((item: any) =>
        item.title?.toLowerCase().includes(keyword) ||
        item.content?.toLowerCase().includes(keyword)
      )
    } catch (error) {
      console.error('Lỗi lọc:', error)
      return []
    }
  }, [activeTab, search, getNotes, getFormulas])

  // Mở tạo mới
  const openCreate = () => {
    if (processingImages) return
    setEditingId(null)
    setForm({ title: '', content: '', images: [] })
    setEditorOpen(true)
  }

  // Mở sửa
  const openEdit = (item: any, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (processingImages) return
    setEditingId(item.id)
    setForm({
      title: item.title || '',
      content: item.content || '',
      images: Array.isArray(item.images) ? item.images : []
    })
    setEditorOpen(true)
    if (detailOpen) setDetailOpen(false)
  }

  const closeEditor = () => {
    if (processingImages) return
    setEditorOpen(false)
    setEditingId(null)
    setForm({ title: '', content: '', images: [] })
  }

  // Lưu
  const handleSave = () => {
    if (processingImages) {
      showToast('warning', 'Đang xử lý ảnh, vui lòng chờ...')
      return
    }
    if (!form.title.trim()) {
      showToast('warning', 'Vui lòng nhập tiêu đề')
      return
    }
    try {
      if (activeTab === 'notes') {
        if (editingId) {
          updateNote(editingId, { title: form.title, content: form.content, images: form.images })
        } else {
          addNote({ title: form.title, content: form.content, images: form.images })
        }
      } else {
        if (editingId) {
          updateFormula(editingId, { title: form.title, content: form.content, images: form.images })
        } else {
          addFormula({ title: form.title, content: form.content, images: form.images })
        }
      }
      closeEditor()
      showToast('success', 'Lưu thành công!')
    } catch (error) {
      console.error('Lỗi lưu:', error)
      showToast('error', 'Lỗi lưu dữ liệu')
    }
  }

  // Xóa
  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (processingImages) return
    if (!window.confirm('Bạn có chắc muốn xóa?')) return
    try {
      const success = activeTab === 'notes' ? deleteNote(id) : deleteFormula(id)
      if (success) {
        showToast('success', 'Đã xóa')
        if (detailOpen) setDetailOpen(false)
      } else showToast('error', 'Xóa thất bại')
    } catch (error) {
      console.error('Lỗi xóa:', error)
      showToast('error', 'Lỗi xóa')
    }
  }

  // Upload ảnh -> Base64
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (processingImages) return
    const files = Array.from(e.target.files || [])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (files.length === 0) return

    const maxImages = 5
    const maxSize = 15 * 1024 * 1024
    const validFiles = files.slice(0, maxImages).filter(f =>
      f.type.startsWith('image/') && f.size <= maxSize
    )
    if (validFiles.length === 0) {
      showToast('warning', 'Không có ảnh hợp lệ (tối đa 5 ảnh, mỗi ảnh <=15MB)')
      return
    }

    setProcessingImages(true)
    const base64List: string[] = []
    for (const file of validFiles) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        base64List.push(base64)
      } catch (err) {
        console.error('Lỗi đọc file:', err)
      }
    }
    if (base64List.length > 0) {
      setForm(prev => ({
        ...prev,
        images: [...prev.images, ...base64List]
      }))
      showToast('success', `Đã thêm ${base64List.length} ảnh`)
    }
    setProcessingImages(false)
  }

  // Thêm URL
  const handleAddUrl = () => {
    if (processingImages) return
    const url = window.prompt('Nhập URL hình ảnh:')
    if (!url?.trim()) return
    try {
      new URL(url)
      setForm(prev => ({
        ...prev,
        images: [...prev.images, url.trim()]
      }))
      showToast('success', 'Đã thêm URL ảnh')
    } catch {
      showToast('warning', 'URL không hợp lệ')
    }
  }

  // Xóa ảnh trong form
  const removeImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
    if (viewingImage && form.images[index] === viewingImage) {
      setViewingImage(null)
    }
  }

  // Xem ảnh
  const openImageViewer = (image: string) => setViewingImage(image)
  const closeImageViewer = () => setViewingImage(null)

  // Chuyển tab
  const switchTab = (tab: TabType) => {
    if (processingImages) return
    setActiveTab(tab)
    setSearch('')
    closeEditor()
    closeDetail()
  }

  // Mở xem chi tiết
  const openDetail = (item: any) => {
    if (processingImages) return
    setDetailItem(item)
    setDetailOpen(true)
  }
  const closeDetail = () => {
    setDetailOpen(false)
    setDetailItem(null)
  }

  // Component preview ảnh (đồng bộ)
  const ImagePreview = ({ image, index }: { image: string; index: number }) => (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
      <img
        src={image}
        alt={`Preview ${index + 1}`}
        className="h-full w-full object-cover"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
          const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon')
          if (fallback) fallback.classList.remove('hidden')
        }}
      />
      <div className="fallback-icon hidden absolute inset-0 flex items-center justify-center">
        <ImageIcon className="h-8 w-8 text-gray-400" />
      </div>
      <button
        type="button"
        onClick={() => removeImage(index)}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow-sm transition hover:bg-red-600 group-hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[300] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto rounded-xl shadow-lg p-4 flex items-start gap-3 animate-slide-in",
              toast.type === 'success' && "bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200",
              toast.type === 'error' && "bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200",
              toast.type === 'warning' && "bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-200",
              toast.type === 'info' && "bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200"
            )}
          >
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
              {toast.type === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
              {toast.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
            </div>
            <div className="flex-1 text-sm font-medium">{toast.message}</div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-soft',
              activeTab === 'notes'
                ? 'bg-gradient-to-br from-blue-500 to-blue-700'
                : 'bg-gradient-to-br from-purple-500 to-purple-700'
            )}
          >
            {activeTab === 'notes' ? (
              <FileText className="h-6 w-6" />
            ) : (
              <FlaskConical className="h-6 w-6" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
              Ghi chú & Công thức
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Lưu lại kiến thức quan trọng để học nhanh hơn
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreate}
          disabled={processingImages}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-5 w-5" />
          {activeTab === 'notes' ? 'Thêm ghi chú' : 'Thêm công thức'}
        </button>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => switchTab('notes')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition',
              activeTab === 'notes'
                ? 'bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-900/30 dark:text-blue-300'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100'
            )}
          >
            <FileText className="h-5 w-5" />
            Ghi chú
          </button>
          <button
            type="button"
            onClick={() => switchTab('formulas')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition',
              activeTab === 'formulas'
                ? 'bg-purple-50 text-purple-700 shadow-sm dark:bg-purple-900/30 dark:text-purple-300'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100'
            )}
          >
            <FlaskConical className="h-5 w-5" />
            Công thức
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={activeTab === 'notes' ? 'Tìm kiếm ghi chú...' : 'Tìm kiếm công thức...'}
          className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-12 pr-12 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label="Xóa tìm kiếm"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {items.length} {activeTab === 'notes' ? 'ghi chú' : 'công thức'}
          {search && (
            <span>
              {' '}
              phù hợp với "<strong>{search}</strong>"
            </span>
          )}
        </p>
      </div>

      {/* Items grid */}
      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700">
            {activeTab === 'notes' ? (
              <FileText className="h-8 w-8 text-gray-400" />
            ) : (
              <FlaskConical className="h-8 w-8 text-gray-400" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {search
              ? 'Không tìm thấy kết quả'
              : activeTab === 'notes'
                ? 'Chưa có ghi chú'
                : 'Chưa có công thức'}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            {search
              ? 'Thử tìm kiếm bằng từ khóa khác.'
              : activeTab === 'notes'
                ? 'Hãy tạo ghi chú đầu tiên để lưu lại kiến thức quan trọng.'
                : 'Hãy tạo công thức đầu tiên để lưu lại các công thức cần nhớ.'}
          </p>
          {!search && (
            <button
              type="button"
              onClick={openCreate}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              {activeTab === 'notes' ? 'Tạo ghi chú' : 'Tạo công thức'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item: any) => (
            <div
              key={item.id}
              onClick={() => openDetail(item)}
              className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 cursor-pointer"
            >
              <div className="p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
                      activeTab === 'notes'
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                    )}
                  >
                    {activeTab === 'notes' ? (
                      <FileText className="h-5 w-5" />
                    ) : (
                      <FlaskConical className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => openEdit(item, e)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                      title="Chỉnh sửa"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(item.id, e)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h2 className="line-clamp-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                  {item.title}
                </h2>
                <p className="mt-3 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {item.content || 'Chưa có nội dung.'}
                </p>

                {Array.isArray(item.images) && item.images.length > 0 && (
                  <div className="mt-4 rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {item.images.length} hình ảnh đính kèm
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openImageViewer(item.images[0])
                      }}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      <Eye className="h-4 w-4" />
                      Xem ảnh đầu tiên
                    </button>
                  </div>
                )}

                <div className="mt-5 border-t border-gray-100 pt-4 text-xs text-gray-400 dark:border-gray-700">
                  Cập nhật {new Date(item.updatedAt).toLocaleString('vi-VN')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {editorOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && closeEditor()}
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {editingId ? 'Chỉnh sửa ' : 'Tạo mới '}
                {activeTab === 'notes' ? 'ghi chú' : 'công thức'}
              </h2>
              <button
                onClick={closeEditor}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tiêu đề</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder={activeTab === 'notes' ? 'Nhập tiêu đề ghi chú...' : 'Nhập tên công thức...'}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nội dung</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={6}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Nhập nội dung chi tiết..."
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Hình ảnh đính kèm ({form.images.length}/5)
                </label>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {form.images.map((img, idx) => (
                    <ImagePreview key={`${img}-${idx}`} image={img} index={idx} />
                  ))}
                  {form.images.length < 5 && (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={processingImages}
                        className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-6 text-gray-500 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
                      >
                        <Upload className="h-6 w-6" />
                        <span className="text-xs font-medium text-center px-2">Tải ảnh lên</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddUrl}
                        disabled={processingImages}
                        className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Thêm từ URL
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*"
                  multiple
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800/50">
              <button
                onClick={closeEditor}
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={processingImages}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-5 w-5" />
                {processingImages ? 'Đang xử lý...' : 'Lưu lại'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailOpen && detailItem && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && closeDetail()}
        >
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Chi tiết</h2>
              <button
                onClick={closeDetail}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{detailItem.title}</h3>
              <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {detailItem.content || 'Không có nội dung.'}
              </div>

              {Array.isArray(detailItem.images) && detailItem.images.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hình ảnh đính kèm ({detailItem.images.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {detailItem.images.map((img: string, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => openImageViewer(img)}
                        className="aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800 cursor-pointer hover:opacity-80 transition"
                      >
                        <img
                          src={img}
                          alt={`Hình ${idx + 1}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 flex-wrap">
                <button
                  type="button"
                  onClick={(e) => openEdit(detailItem, e)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Pencil className="h-4 w-4" />
                  Chỉnh sửa
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDelete(detailItem.id, e)}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa
                </button>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="ml-auto rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={closeImageViewer}
        >
          <button
            onClick={closeImageViewer}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={viewingImage}
            alt="Full view"
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

export default Notes