'use client'

import { VStack, HStack, Grid, Card, CardContent, Heading, Text } from '@/components/design-system'
import { LeadStats as LeadStatsType } from '@/lib/types/lead.types'
import { 
  Users, 
  Phone, 
  CheckCircle, 
  FileText, 
  Handshake, 
  Trophy, 
  X, 
  XCircle 
} from 'lucide-react'

interface LeadStatsProps {
  stats: LeadStatsType | null
}

export function LeadStats({ stats }: LeadStatsProps): React.JSX.Element {
  if (!stats || typeof stats !== 'object' || stats === null) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} variant="subtle" padding="lg">
            <CardContent>
              <div className="animate-pulse">
                <div className="h-4 bg-[var(--bg-secondary)] rounded-[var(--radius-sm)] w-3/4 mb-2"></div>
                <div className="h-8 bg-[var(--bg-secondary)] rounded-[var(--radius-sm)] w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statItems = [
    {
      title: 'New Leads',
      value: stats.NEW,
      icon: Users,
      bgColor: 'bg-[var(--color-brand-primary-100)] dark:bg-[var(--color-brand-primary-900)]',
      iconColor: 'text-[var(--color-brand-primary-600)]',
    },
    {
      title: 'Contacted',
      value: stats.CONTACTED,
      icon: Phone,
      bgColor: 'bg-[var(--color-semantic-warning-100)] dark:bg-[var(--color-semantic-warning-900)]',
      iconColor: 'text-[var(--color-semantic-warning-600)]',
    },
    {
      title: 'Qualified',
      value: stats.QUALIFIED,
      icon: CheckCircle,
      bgColor: 'bg-[var(--color-semantic-success-100)] dark:bg-[var(--color-semantic-success-900)]',
      iconColor: 'text-[var(--color-semantic-success-600)]',
    },
    {
      title: 'Proposals Sent',
      value: stats.PROPOSAL_SENT,
      icon: FileText,
      bgColor: 'bg-[var(--color-brand-secondary-100)] dark:bg-[var(--color-brand-secondary-900)]',
      iconColor: 'text-[var(--color-brand-secondary-600)]',
    },
    {
      title: 'Negotiating',
      value: stats.NEGOTIATING,
      icon: Handshake,
      bgColor: 'bg-[var(--color-semantic-warning-100)] dark:bg-[var(--color-semantic-warning-900)]',
      iconColor: 'text-[var(--color-semantic-warning-600)]',
    },
    {
      title: 'Converted',
      value: stats.CONVERTED,
      icon: Trophy,
      bgColor: 'bg-[var(--color-semantic-success-100)] dark:bg-[var(--color-semantic-success-900)]',
      iconColor: 'text-[var(--color-semantic-success-600)]',
    },
    {
      title: 'Lost',
      value: stats.LOST,
      icon: X,
      bgColor: 'bg-[var(--color-semantic-error-100)] dark:bg-[var(--color-semantic-error-900)]',
      iconColor: 'text-[var(--color-semantic-error-600)]',
    },
    {
      title: 'Disqualified',
      value: stats.DISQUALIFIED,
      icon: XCircle,
      bgColor: 'bg-[var(--color-neutral-200)] dark:bg-[var(--color-neutral-800)]',
      iconColor: 'text-[var(--color-neutral-600)]',
    },
  ]

  const totalLeads = stats && typeof stats === 'object' ? Object.values(stats).reduce((sum, value) => sum + value, 0) : 0

  return (
    <VStack gap="lg">
      <HStack justify="between" align="center">
        <Heading as="h3" size="lg">Lead Statistics</Heading>
        <Text size="sm" color="secondary">
          Total: {totalLeads} leads
        </Text>
      </HStack>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title} variant="subtle" padding="lg" className="transition-all duration-[var(--transition-fast)] hover:shadow-[var(--shadow-lg)]">
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                  <div className={`p-3 rounded-[var(--radius-lg)] ${item.bgColor} self-start`}>
                    <Icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Text size="sm" weight="medium" color="secondary">
                      {item.title}
                    </Text>
                    <Text size="xl" weight="bold">
                      {item.value}
                    </Text>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </VStack>
  )
}