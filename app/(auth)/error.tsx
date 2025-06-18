'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[400px] w-full items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-4 flex justify-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Something went wrong!</h2>
        <p className="text-gray-600 mb-6">
          {error.message || 'An unexpected error occurred while processing your request.'}
        </p>
        <Button
          onClick={() => reset()}
          variant="default"
        >
          Try again
        </Button>
      </div>
    </div>
  )
}