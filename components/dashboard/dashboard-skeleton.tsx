'use client'

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Grid, VStack, HStack } from '@/components/design-system'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  lines?: number
}

function Skeleton({ className, lines = 1 }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse bg-gray-200 dark:bg-gray-700 rounded", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 last:mb-0" />
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <VStack gap="xl" className="py-6">
      {/* Header Skeleton */}
      <VStack gap="sm">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </VStack>

      {/* Stats Cards Skeleton */}
      <Grid cols={{ xs: 1, sm: 2, lg: 3 }} gap="lg" className="w-full">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} variant="elevated" padding="lg">
            <CardContent>
              <HStack justify="between" align="center" className="mb-4">
                <VStack gap="xs">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </VStack>
                <Skeleton className="h-12 w-12 rounded-lg" />
              </HStack>
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </Grid>

      {/* Lead Stats Skeleton */}
      <Card variant="elevated" padding="lg" className="w-full">
        <CardHeader border>
          <HStack justify="between" align="center">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-28" />
          </HStack>
        </CardHeader>
        <CardContent className="pt-6">
          <Grid cols={{ xs: 1, sm: 2, lg: 4 }} gap="lg">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="p-4">
                <VStack gap="sm">
                  <HStack gap="sm" align="center">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-4 w-20" />
                  </HStack>
                  <Skeleton className="h-8 w-12" />
                </VStack>
              </Card>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Quick Actions Skeleton */}
      <Card variant="elevated" padding="lg" className="w-full">
        <CardHeader border>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="pt-6">
          <Grid cols={{ xs: 1, sm: 2 }} gap="md">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded" />
            ))}
          </Grid>
        </CardContent>
      </Card>
    </VStack>
  )
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card className="p-6">
      <VStack gap="md">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="w-full" style={{ height: `${height}px` }} />
      </VStack>
    </Card>
  )
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <Card className="p-6">
      <VStack gap="md">
        <Skeleton className="h-6 w-48" />
        
        {/* Mobile Card Skeletons */}
        <div className="block lg:hidden">
          <VStack gap="md">
            {Array.from({ length: rows }).map((_, i) => (
              <Card key={i} className="p-4">
                <VStack gap="sm">
                  {Array.from({ length: Math.min(columns, 3) }).map((_, j) => (
                    <HStack key={j} justify="between" align="center">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </HStack>
                  ))}
                </VStack>
              </Card>
            ))}
          </VStack>
        </div>

        {/* Desktop Table Skeleton */}
        <div className="hidden lg:block">
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-4 gap-4 pb-2 border-b">
              {Array.from({ length: columns }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-20" />
              ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-4 py-2">
                {Array.from({ length: columns }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-24" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </VStack>
    </Card>
  )
}

export function MetricCardSkeleton() {
  return (
    <Card className="p-3 sm:p-4">
      <VStack gap="sm">
        <HStack justify="between" align="start">
          <VStack gap="xs" className="flex-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-3 w-20" />
          </VStack>
          <Skeleton className="h-8 w-8 rounded-lg" />
        </HStack>
        <HStack gap="xs" align="center">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-16" />
        </HStack>
      </VStack>
    </Card>
  )
}