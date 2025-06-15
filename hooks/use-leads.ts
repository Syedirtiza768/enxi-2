'use client'

import { useState, useEffect, useCallback } from 'react'
import { LeadListQuery, LeadListResponse, LeadStats, CreateLeadData, UpdateLeadData } from '@/lib/types/lead.types'
import { apiClient } from '@/lib/api/client'

interface UseLeadsOptions extends Partial<LeadListQuery> {}

interface UseLeadsReturn {
  leads: LeadListResponse | null
  stats: LeadStats | null
  isLoading: boolean
  error: Error | null
  createLead: (data: CreateLeadData) => Promise<void>
  updateLead: (id: string, data: UpdateLeadData) => Promise<void>
  deleteLead: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

export function useLeads(options: UseLeadsOptions = {}): UseLeadsReturn {
  const [leads, setLeads] = useState<LeadListResponse | null>(null)
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const queryParams = new URLSearchParams()
      
      if (options.page) queryParams.set('page', options.page.toString())
      if (options.limit) queryParams.set('limit', options.limit.toString())
      if (options.search) queryParams.set('search', options.search)
      if (options.status) queryParams.set('status', options.status)
      if (options.source) queryParams.set('source', options.source)

      const response = await apiClient<LeadListResponse>(`/api/leads?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch leads')
      }

      setLeads(response?.data!)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [options.page, options.limit, options.search, options.status, options.source])

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient<LeadStats>('/api/leads/stats')
      
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch stats')
      }

      setStats(response?.data!)
    } catch (err) {
      console.error('Failed to fetch lead stats:', err)
      // Don't set error for stats, it's not critical
    }
  }, [])

  const createLead = useCallback(async (data: CreateLeadData) => {
    console.warn('Creating lead with data:', data)
    const response = await apiClient('/api/leads', data)

    if (!response.ok) {
      throw new Error(response.error || 'Failed to create lead')
    }

    return response?.data
  }, [])

  const updateLead = useCallback(async (id: string, data: UpdateLeadData) => {
    const response = await apiClient(`/api/leads/${id}`, data)

    if (!response.ok) {
      throw new Error(response.error || 'Failed to update lead')
    }

    return response?.data
  }, [])

  const deleteLead = useCallback(async (id: string) => {
    const response = await apiClient(`/api/leads/${id}`)

    if (!response.ok) {
      throw new Error(response.error || 'Failed to delete lead')
    }

    return response?.data
  }, [])

  const refetch = useCallback(async () => {
    await Promise.all([fetchLeads(), fetchStats()])
  }, [fetchLeads, fetchStats])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    leads,
    stats,
    isLoading,
    error,
    createLead,
    updateLead,
    deleteLead,
    refetch,
  }
}