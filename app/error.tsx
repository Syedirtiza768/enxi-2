'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

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
    <div className="flex h-screen w-full items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Something went wrong!</h2>
        <p className="text-gray-600 mb-4">An error occurred while loading this page.</p>
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