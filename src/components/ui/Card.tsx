import React from 'react'
import { cn } from '@/utils/helpers'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean
}

export const Card: React.FC<CardProps> = ({ className, hoverable, children, ...rest }) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60',
        'rounded-2xl shadow-soft',
        hoverable &&
          'transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 hover:border-gray-200 dark:hover:border-gray-600',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div className={cn('px-6 py-5 border-b border-gray-100 dark:border-gray-700/60', className)} {...rest} />
)

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div className={cn('px-6 py-5', className)} {...rest} />
)

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div className={cn('px-6 py-4 border-t border-gray-100 dark:border-gray-700/60', className)} {...rest} />
)

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...rest }) => (
  <h3 className={cn('text-lg font-semibold text-gray-900 dark:text-gray-50', className)} {...rest} />
)

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...rest }) => (
  <p className={cn('text-sm text-gray-500 dark:text-gray-400 mt-1', className)} {...rest} />
)
