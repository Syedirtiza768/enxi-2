import { format, parse } from 'date-fns'

// Chart color palettes
export const CHART_COLORS = {
  primary: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'],
  secondary: ['#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'],
  gradient: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'],
  monochrome: ['#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#F3F4F6']
}

// Chart themes
export const CHART_THEMES = {
  light: {
    background: '#ffffff',
    text: '#374151',
    grid: '#f3f4f6',
    tooltip: '#ffffff',
    border: '#e5e7eb'
  },
  dark: {
    background: '#1f2937',
    text: '#f9fafb',
    grid: '#374151',
    tooltip: '#374151',
    border: '#4b5563'
  }
}

// Format numbers for display
export const formatNumber = (value: number, type: 'currency' | 'number' | 'percentage' = 'number'): string => {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-AE', { 
        style: 'currency', 
        currency: 'AED',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value)
    case 'percentage':
      return `${value.toFixed(1)}%`
    case 'number':
      return new Intl.NumberFormat('en-AE').format(value)
    default:
      return value.toString()
  }
}

// Format dates for charts
export const formatChartDate = (date: string | Date, granularity: 'day' | 'week' | 'month' | 'year' = 'day'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  switch (granularity) {
    case 'day':
      return format(dateObj, 'MMM dd')
    case 'week':
      return format(dateObj, "'W'w yyyy")
    case 'month':
      return format(dateObj, 'MMM yyyy')
    case 'year':
      return format(dateObj, 'yyyy')
    default:
      return format(dateObj, 'MMM dd, yyyy')
  }
}

// Generate trend indicator
export const getTrendIndicator = (current: number, previous: number): { 
  trend: 'up' | 'down' | 'stable', 
  percentage: number 
} => {
  if (previous === 0) return { trend: 'stable', percentage: 0 }
  
  const percentage = ((current - previous) / previous) * 100
  
  if (percentage > 2) return { trend: 'up', percentage }
  if (percentage < -2) return { trend: 'down', percentage }
  return { trend: 'stable', percentage }
}

// Calculate moving average
export const calculateMovingAverage = (data: number[], windowSize: number = 7): number[] => {
  const result: number[] = []
  
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1)
    const window = data.slice(start, i + 1)
    const average = window.reduce((sum, val) => sum + val, 0) / window.length
    result.push(Math.round(average * 100) / 100)
  }
  
  return result
}

// Generate chart data with trend
export const addTrendToData = <T extends Record<string, any>>(
  data: T[], 
  valueKey: keyof T, 
  windowSize: number = 7
): (T & { trend: number })[] => {
  const values = data.map(item => item[valueKey] as number)
  const trends = calculateMovingAverage(values, windowSize)
  
  return data.map((item, index) => ({
    ...item,
    trend: trends[index]
  }))
}

// Chart export utilities
export const downloadChart = (canvas: HTMLCanvasElement, filename: string, format: 'png' | 'jpg' = 'png') => {
  const link = document.createElement('a')
  link.download = `${filename}.${format}`
  link.href = canvas.toDataURL(`image/${format}`)
  link.click()
}

// Responsive chart dimensions
export const getResponsiveChartDimensions = (containerWidth: number) => {
  if (containerWidth < 640) {
    return { width: containerWidth - 32, height: 250 }
  } else if (containerWidth < 1024) {
    return { width: containerWidth - 48, height: 300 }
  } else {
    return { width: containerWidth - 64, height: 400 }
  }
}

// Chart animation config
export const getChartAnimationConfig = (duration: number = 1000) => ({
  duration,
  easing: 'ease-out' as const,
  animationBegin: 0
})

// Custom tooltip formatter
export const formatTooltipContent = (value: any, name: string, props: any) => {
  if (typeof value === 'number') {
    if (name.toLowerCase().includes('revenue') || name.toLowerCase().includes('amount')) {
      return [formatNumber(value, 'currency'), name]
    }
    if (name.toLowerCase().includes('rate') || name.toLowerCase().includes('percentage')) {
      return [formatNumber(value, 'percentage'), name]
    }
    return [formatNumber(value, 'number'), name]
  }
  return [value, name]
}