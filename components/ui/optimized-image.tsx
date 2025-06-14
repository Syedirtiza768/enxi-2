'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  onLoad?: () => void
  onError?: () => void
  sizes?: string
  fill?: boolean
  lazy?: boolean
  fallbackSrc?: string
  aspectRatio?: 'square' | '16:9' | '4:3' | '3:2' | 'auto'
}

const ASPECT_RATIOS = {
  square: 'aspect-square',
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '3:2': 'aspect-[3/2]',
  auto: ''
}

// Generate placeholder blur data URL
const generateBlurDataURL = (width: number, height: number): string => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  
  ctx.fillStyle = '#f3f4f6'
  ctx.fillRect(0, 0, width, height)
  
  return canvas.toDataURL()
}

// Intersection Observer hook for lazy loading
function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  { threshold = 0.1, rootMargin = '50px' }: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false)
  
  useEffect(() => {
    if (!elementRef.current || isIntersecting) return
    
    const observer = new IntersectionObserver(
      ([entry]): void => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )
    
    observer.observe(elementRef.current)
    
    return (): void => observer.disconnect()
  }, [elementRef, isIntersecting, threshold, rootMargin])
  
  return isIntersecting
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 75,
  placeholder = 'blur',
  blurDataURL,
  onLoad,
  onError,
  sizes,
  fill = false,
  lazy = true,
  fallbackSrc,
  aspectRatio = 'auto'
}): void => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)
  const imageRef = useRef<HTMLDivElement>(null)
  
  // Use intersection observer for lazy loading
  const isIntersecting = useIntersectionObserver(imageRef, {
    threshold: 0.1,
    rootMargin: '50px'
  })
  
  // Should load the image
  const shouldLoad = !lazy || priority || isIntersecting
  
  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoading(false)
    onLoad?.()
  }, [onLoad])
  
  // Handle image error with fallback
  const handleError = useCallback(() => {
    setHasError(true)
    setIsLoading(false)
    
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
      setHasError(false)
      setIsLoading(true)
    }
    
    onError?.()
  }, [fallbackSrc, currentSrc, onError])
  
  // Generate blur data URL if not provided
  const blurData = blurDataURL || (
    width && height ? generateBlurDataURL(width, height) : undefined
  )
  
  // Determine image dimensions based on aspectRatio
  const aspectRatioClass = aspectRatio !== 'auto' ? ASPECT_RATIOS[aspectRatio] : ''
  
  // Container classes
  const containerClasses = cn(
    'relative overflow-hidden',
    aspectRatioClass,
    className
  )
  
  // Loading skeleton
  const LoadingSkeleton = (): void => (
    <div className={cn(
      'absolute inset-0 bg-gray-200 animate-pulse',
      'flex items-center justify-center'
    )}>
      <div className="w-8 h-8 text-gray-400">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
      </div>
    </div>
  )
  
  // Error state
  const ErrorState = (): void => (
    <div className={cn(
      'absolute inset-0 bg-gray-100 border-2 border-dashed border-gray-300',
      'flex flex-col items-center justify-center text-gray-500'
    )}>
      <div className="w-8 h-8 mb-2">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 5v6.59l-3-3.01-4 4.01-4-4-4 4-3-3.01V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2zm-3 6.42l3 3.01V19c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-6.58l3 2.99 4-4 4 4 4-3.99z"/>
        </svg>
      </div>
      <span className="text-xs text-center">Failed to load image</span>
    </div>
  )
  
  return (
    <div ref={imageRef} className={containerClasses}>
      {/* Show loading skeleton while not intersecting or loading */}
      {(!shouldLoad || isLoading) && !hasError && <LoadingSkeleton />}
      
      {/* Show error state */}
      {hasError && <ErrorState />}
      
      {/* Actual image */}
      {shouldLoad && !hasError && (
        <Image
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          fill={fill}
          sizes={sizes}
          priority={priority}
          quality={quality}
          placeholder={placeholder}
          blurDataURL={blurData}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            fill ? 'object-cover' : ''
          )}
        />
      )}
    </div>
  )
}

// Specific optimized image components for common use cases
export const ProductImage: React.FC<Omit<OptimizedImageProps, 'aspectRatio'>> = (props): void => (
  <OptimizedImage {...props} aspectRatio="square" />
)

export const HeroImage: React.FC<Omit<OptimizedImageProps, 'aspectRatio'>> = (props): void => (
  <OptimizedImage {...props} aspectRatio="16:9" priority />
)

export const AvatarImage: React.FC<Omit<OptimizedImageProps, 'aspectRatio' | 'width' | 'height'>> = (props): void => (
  <OptimizedImage {...props} aspectRatio="square" width={40} height={40} />
)

export const ThumbnailImage: React.FC<Omit<OptimizedImageProps, 'aspectRatio' | 'width' | 'height'>> = (props): void => (
  <OptimizedImage {...props} aspectRatio="square" width={120} height={120} />
)