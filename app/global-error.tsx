'use client'

import { useEffect } from 'react'

export default function GlobalError({
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
    <html>
      <body>
        <div className="flex h-screen w-full items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Something went wrong!</h2>
            <p className="text-gray-600 mb-4">A critical error occurred in the application.</p>
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}