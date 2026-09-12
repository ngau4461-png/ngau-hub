import React from 'react'
import { cn } from '@/utils/helpers'
import { X } from 'lucide-react'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
}

const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
}

const sizes: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-xs rounded-md',
  md: 'px-2.5 py-1 text-xs font-medium rounded-lg',
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', size = 'md', className, ...rest }) => (
  <span className={cn('inline-flex items-center', variants[variant], sizes[size], className)} {...rest} />
)

interface TagProps {
  label: string
  onRemove?: () => void
  className?: string
}

export const Tag: React.FC<TagProps> = ({ label, onRemove, className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg',
      'bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300',
      'text-xs font-medium border border-gray-200 dark:border-gray-600/50',
      className
    )}
  >
    <span>{label}</span>
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className="p-0.5 -mr-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    )}
  </span>
)

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export const TagInput: React.FC<TagInputProps> = ({ tags, onChange, placeholder = 'Nhập tag và nhấn Enter' }) => {
  const [input, setInput] = React.useState('')

  const addTag = () => {
    const value = input.trim().toLowerCase()
    if (value && !tags.includes(value) && value.length <= 30) {
      onChange([...tags, value])
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div>
      <div
        className={cn(
          'w-full min-h-[44px] rounded-xl border bg-white dark:bg-gray-800/60',
          'border-gray-200 dark:border-gray-600/60',
          'focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent',
          'transition-all duration-200 p-2 flex flex-wrap items-center gap-1.5'
        )}
      >
        {tags.map((tag) => (
          <Tag key={tag} label={tag} onRemove={() => onChange(tags.filter((t) => t !== tag))} />
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] h-8 px-2 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
      </div>
    </div>
  )
}
