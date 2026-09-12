import React from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/utils/helpers'
import type { ToastMessage } from '@/types'

interface ToastItemProps {
  toast: ToastMessage
  onRemove: (id: string) => void
}

const typeConfig: Record<ToastMessage['type'], { icon: React.ReactNode; colors: string }> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    colors: 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
  },
  error: {
    icon: <XCircle className="h-5 w-5" />,
    colors: 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" />,
    colors: 'bg-amber-50 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    colors: 'bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
  },
}

export const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const config = typeConfig[toast.type]
  return (
    <div
      className={cn(
        'min-w-[280px] max-w-[400px] flex items-start gap-3 rounded-xl border p-4 shadow-soft-lg animate-slide-in-right',
        config.colors
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
      <div className="flex-1 text-sm font-medium break-words">{toast.message}</div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
        aria-label="Đóng thông báo"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  )
}
