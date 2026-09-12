import React from 'react'
import { cn } from '@/utils/helpers'
import { Search, X } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  onClear?: () => void
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onClear,
  className,
  id,
  value,
  ...rest
}) => {
  const inputId = id || rest.name || Math.random().toString(36).slice(2, 9)
  const showClear = onClear && value !== undefined && value !== null && String(value).length > 0

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          value={value}
          className={cn(
            'w-full h-10 rounded-xl border bg-white dark:bg-gray-800/60',
            'border-gray-200 dark:border-gray-600/60',
            'text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'transition-all duration-200',
            leftIcon && 'pl-10',
            (rightIcon || showClear) && 'pr-10',
            !leftIcon && 'pl-4',
            error && 'border-red-400 focus:ring-red-500',
            className
          )}
          {...rest}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
          {showClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {!showClear && rightIcon && (
            <div className="text-gray-400 dark:text-gray-500 pointer-events-none">{rightIcon}</div>
          )}
        </div>
      </div>
      {error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className, id, ...rest }) => {
  const inputId = id || rest.name || Math.random().toString(36).slice(2, 9)
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'w-full min-h-[96px] rounded-xl border bg-white dark:bg-gray-800/60 p-3 resize-y',
          'border-gray-200 dark:border-gray-600/60',
          'text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          'transition-all duration-200',
          error && 'border-red-400 focus:ring-red-500',
          className
        )}
        {...rest}
      />
      {error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select: React.FC<SelectProps> = ({ label, error, options, className, id, ...rest }) => {
  const inputId = id || rest.name || Math.random().toString(36).slice(2, 9)
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={cn(
          'w-full h-10 rounded-xl border bg-white dark:bg-gray-800/60 px-3',
          'border-gray-200 dark:border-gray-600/60',
          'text-gray-900 dark:text-gray-100',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          'transition-all duration-200',
          error && 'border-red-400 focus:ring-red-500',
          className
        )}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export { Search }
