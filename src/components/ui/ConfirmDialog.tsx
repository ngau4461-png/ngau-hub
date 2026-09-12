import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'primary' | 'danger'
  icon?: React.ReactNode
  loading?: boolean
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  confirmVariant = 'danger',
  icon,
  loading = false,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      hideClose
    >
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4 mb-2">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
          {icon || <AlertTriangle className="h-6 w-6" />}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-1">{title}</h3>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 mt-6">
        <Button variant="ghost" onClick={onClose} disabled={loading} fullWidth className="sm:w-auto">
          {cancelText}
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} loading={loading} fullWidth className="sm:w-auto">
          {confirmText}
        </Button>
      </div>
    </Modal>
  )
}
