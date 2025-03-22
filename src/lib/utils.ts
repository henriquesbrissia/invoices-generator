import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'

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
    // Ensure dates are actual Date objects
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Format with en-US locale for better compatibility
    const startFormatted = format(start, 'MMM dd', { locale: enUS })
    const endFormatted = format(end, 'MMM dd', { locale: enUS })
    const year = format(end, 'yyyy')
    
    return `${startFormatted} - ${endFormatted} ${year}`
  } catch (error) {
    console.error('Error formatting dates:', error)
    return ''
  }
}
