'use client'

import { useState, useEffect } from 'react'

export interface BreakpointValues {
  mobile: boolean
  mobileLg: boolean
  tablet: boolean
  tabletLg: boolean
  desktop: boolean
  desktopLg: boolean
  sm: boolean
  md: boolean
  lg: boolean
  xl: boolean
  '2xl': boolean
}

export function useResponsive(): BreakpointValues {
  const [breakpoints, setBreakpoints] = useState<BreakpointValues>({
    mobile: false,
    mobileLg: false,
    tablet: false,
    tabletLg: false,
    desktop: false,
    desktopLg: false,
    sm: false,
    md: false,
    lg: false,
    xl: false,
    '2xl': false,
  })

  useEffect(() => {
    const updateBreakpoints = () => {
      const width = window.innerWidth
      
      setBreakpoints({
        mobile: width >= 320,
        mobileLg: width >= 425,
        tablet: width >= 768,
        tabletLg: width >= 1024,
        desktop: width >= 1280,
        desktopLg: width >= 1536,
        sm: width >= 640,
        md: width >= 768,
        lg: width >= 1024,
        xl: width >= 1280,
        '2xl': width >= 1536,
      })
    }

    updateBreakpoints()
    window.addEventListener('resize', updateBreakpoints)
    
    return () => window.removeEventListener('resize', updateBreakpoints)
  }, [])

  return breakpoints
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth
      setIsTablet(width >= 768 && width < 1024)
    }
    
    checkTablet()
    window.addEventListener('resize', checkTablet)
    
    return () => window.removeEventListener('resize', checkTablet)
  }, [])

  return isTablet
}

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  return isDesktop
}

export function useViewportSize(): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateSize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return size
}

export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
    }

    updateOrientation()
    window.addEventListener('resize', updateOrientation)
    
    return () => window.removeEventListener('resize', updateOrientation)
  }, [])

  return orientation
}

export function useScrollDirection(): 'up' | 'down' | null {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    let lastScrollY = window.scrollY

    const updateScrollDirection = () => {
      const scrollY = window.scrollY
      const direction = scrollY > lastScrollY ? 'down' : 'up'
      
      if (direction !== scrollDirection && Math.abs(scrollY - lastScrollY) > 10) {
        setScrollDirection(direction)
      }
      
      lastScrollY = scrollY
    }

    window.addEventListener('scroll', updateScrollDirection)
    
    return () => window.removeEventListener('scroll', updateScrollDirection)
  }, [scrollDirection])

  return scrollDirection
}