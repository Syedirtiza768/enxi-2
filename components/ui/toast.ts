// Re-export toast functionality for backwards compatibility
import { useToast as useToastHook } from './use-toast'

// Create a singleton instance for direct toast calls
let toastInstance: ReturnType<typeof useToastHook> | null = null

export const setToastInstance = (instance: ReturnType<typeof useToastHook>) => {
  toastInstance = instance
}

export const toast = {
  success: (message: string, title?: string) => {
    if (toastInstance) {
      return toastInstance.success(message, title)
    }
    console.log('Toast success:', title, message)
    return 'mock-id'
  },
  error: (error: unknown, context?: Record<string, any>) => {
    if (toastInstance) {
      return toastInstance.error(error, context)
    }
    console.error('Toast error:', error)
    return 'mock-id'
  },
  warning: (message: string, title?: string) => {
    if (toastInstance) {
      return toastInstance.warning(message, title)
    }
    console.warn('Toast warning:', title, message)
    return 'mock-id'
  },
  info: (message: string, title?: string) => {
    if (toastInstance) {
      return toastInstance.info(message, title)
    }
    console.info('Toast info:', title, message)
    return 'mock-id'
  }
}

export { useToast } from './use-toast'