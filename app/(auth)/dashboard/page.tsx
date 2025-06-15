'use client'

import { useEffect, useState } from 'react'
import { 
  VStack, 
  HStack, 
  Grid, 
  Card, 
  CardHeader, 
  CardContent, 
  Text, 
  Button,
  PageLayout,
  PageHeader,
  PageSection
} from '@/components/design-system'
import { LeadStats } from '@/components/leads/lead-stats'
import { LeadStats as LeadStatsType } from '@/lib/types/lead.types'
import { apiClient } from '@/lib/api/client'
import Link from 'next/link'
import { Users, Plus, TrendingUp } from 'lucide-react'

export default function DashboardPage(): React.JSX.Element {
  const [leadStats, setLeadStats] = useState<LeadStatsType | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async (): Promise<void> => {
      try {
        const response = await apiClient<LeadStatsType>('/api/leads/stats')
        if (response.ok && response.data) {
          setLeadStats(response.data)
        } else {
          console.error('Failed to fetch lead stats:', response.error)
        }
        setIsLoading(false)
      } catch (error) {
        console.error('Error:', error);
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const totalLeads = leadStats ? Object.values(leadStats).reduce((sum, value) => sum + value, 0) : 0

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        {/* Header */}
        <PageHeader 
          title="Dashboard"
          description="Welcome to Enxi ERP System"
        />

        {/* Quick Stats */}
        <PageSection>
          <Grid cols={3} gap="lg" className="w-full">
            <Card variant="elevated" padding="lg">
              <CardContent>
                <HStack justify="between" align="center" className="mb-4">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Total Leads</Text>
                    <Text size="xl" weight="bold">
                      {isLoading ? '-' : totalLeads}
                    </Text>
                  </VStack>
                  <div className="p-3 bg-[var(--color-brand-primary-100)] dark:bg-[var(--color-brand-primary-900)] rounded-[var(--radius-lg)]">
                    <Users className="h-6 w-6 text-[var(--color-brand-primary-600)]" />
                  </div>
                </HStack>
                <Text size="xs" color="secondary">
                  Active leads in pipeline
                </Text>
              </CardContent>
            </Card>

            <Card variant="elevated" padding="lg">
              <CardContent>
                <HStack justify="between" align="center" className="mb-4">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Converted</Text>
                    <Text size="xl" weight="bold">
                      {isLoading ? '-' : leadStats?.CONVERTED || 0}
                    </Text>
                  </VStack>
                  <div className="p-3 bg-[var(--color-semantic-success-100)] dark:bg-[var(--color-semantic-success-900)] rounded-[var(--radius-lg)]">
                    <TrendingUp className="h-6 w-6 text-[var(--color-semantic-success-600)]" />
                  </div>
                </HStack>
                <Text size="xs" color="secondary">
                  Successfully converted leads
                </Text>
              </CardContent>
            </Card>

            <Card variant="elevated" padding="lg">
              <CardContent>
                <HStack justify="between" align="center" className="mb-4">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">New This Month</Text>
                    <Text size="xl" weight="bold">
                      {isLoading ? '-' : leadStats?.NEW || 0}
                    </Text>
                  </VStack>
                  <div className="p-3 bg-[var(--color-semantic-info-100)] dark:bg-[var(--color-semantic-info-900)] rounded-[var(--radius-lg)]">
                    <Plus className="h-6 w-6 text-[var(--color-semantic-info-600)]" />
                  </div>
                </HStack>
                <Text size="xs" color="secondary">
                  Fresh leads to contact
                </Text>
              </CardContent>
            </Card>
          </Grid>
        </PageSection>

        {/* Lead Stats */}
        <PageSection>
          <Card variant="elevated" padding="lg" className="w-full">
            <CardHeader border>
              <HStack justify="between" align="center">
                <h2 className="text-xl font-semibold">Lead Pipeline</h2>
                <Link href="/leads">
                  <Button variant="outline" size="sm">
                    View All Leads
                  </Button>
                </Link>
              </HStack>
            </CardHeader>
            <CardContent className="pt-6">
              <LeadStats stats={leadStats} />
            </CardContent>
          </Card>
        </PageSection>

        {/* Quick Actions */}
        <PageSection>
          <Card variant="elevated" padding="lg" className="w-full">
            <CardHeader border>
              <h2 className="text-xl font-semibold">Quick Actions</h2>
            </CardHeader>
            <CardContent className="pt-6">
              <Grid cols={2} gap="md">
                <Link href="/leads" className="block">
                  <Button fullWidth variant="outline" size="lg" className="justify-start">
                    <Users className="mr-3 h-5 w-5" />
                    Manage Leads
                  </Button>
                </Link>
                <Link href="/leads" className="block">
                  <Button fullWidth variant="outline" size="lg" className="justify-start">
                    <Plus className="mr-3 h-5 w-5" />
                    Add New Lead
                  </Button>
                </Link>
              </Grid>
            </CardContent>
          </Card>
        </PageSection>
      </VStack>
    </PageLayout>
  )
}