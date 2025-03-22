import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a currency string to a consistent format
 */
export function formatCurrency(value: string): string {
  const cleanValue = value.replace(/[^\d.,]/g, '').replace(/,/g, '.')
  const numValue = parseFloat(cleanValue)
  if (isNaN(numValue)) return '0.00'
  return numValue.toFixed(2)
}

/**
 * Formats a date range into a localized string
 */
export function formatDateRange(startDate: Date | null, endDate: Date | null): string {
  if (!startDate || !endDate) return ''
  
  try {
    const start = format(startDate, 'MMM dd', { locale: ptBR })
    const end = format(endDate, 'MMM dd', { locale: ptBR })
    const year = format(endDate, 'yyyy')
    
    return `${start} - ${end} ${year}`
  } catch (error) {
    console.error('Error formatting dates:', error)
    return ''
  }
}
