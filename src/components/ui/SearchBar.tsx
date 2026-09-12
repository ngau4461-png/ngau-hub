import React from 'react'
import { Search as SearchIcon, X } from 'lucide-react'
import { cn } from '@/utils/helpers'
import { useDebounce } from '@/hooks/useDebounce'
import { useEffect, useState } from 'react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  debounceMs = 250,
  className,
}) => {
  const [localValue, setLocalValue] = useState(value)
  const debounced = useDebounce(localValue, debounceMs)

  useEffect(() => {
    if (debounced !== value) onChange(debounced)
  }, [debounced])

  useEffect(() => {
    if (value !== localValue) setLocalValue(value)
  }, [value])

  return (
    <div
      className={cn(
        'relative w-full',
        className
      )}
    >
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full h-10 pl-10 pr-10 rounded-xl border bg-white dark:bg-gray-800/60',
          'border-gray-200 dark:border-gray-600/60',
          'text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          'transition-all duration-200 text-sm'
        )}
      />
      {localValue && (
        <button
          onClick={() => setLocalValue('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
