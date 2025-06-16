import { NextRequest, NextResponse } from 'next/server'
// // import { getServerSession } from 'next-auth'
// // import { authOptions } from '@/lib/auth'
import { CompanySettingsService } from '@/lib/services/company-settings.service'
import { z } from 'zod'

const updateSettingsSchema = z.object({
  companyName: z.string().max(200).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  defaultCurrency: z.string().length(3).optional(),
  defaultTaxRateId: z.string().optional(),
  taxRegistrationNumber: z.string().optional(),
  quotationTermsAndConditions: z.string().optional(),
  quotationFooterNotes: z.string().optional(),
  quotationValidityDays: z.number().min(1).max(365).optional(),
  quotationPrefix: z.string().max(10).optional(),
  quotationNumberFormat: z.string().max(50).optional(),
  showCompanyLogoOnQuotations: z.boolean().optional(),
  showTaxBreakdown: z.boolean().optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = { user: { id: 'system' } }
    // const session = { user: { id: 'system' } }
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const settingsService = new CompanySettingsService()
    const settings = await settingsService.getSettings()

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching company settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch company settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = { user: { id: 'system' } }
    // const session = { user: { id: 'system' } }
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // Check if user has admin role
    // if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
    //   return NextResponse.json(
    //     { error: 'Only administrators can update company settings' },
    //     { status: 403 }
    //   )
    // }

    const body = await request.json()
    const validatedData = updateSettingsSchema.parse(body)

    const settingsService = new CompanySettingsService()
    const settings = await settingsService.updateSettings({
      ...validatedData,
      updatedBy: session.user.id
    })

    return NextResponse.json(settings)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating company settings:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update company settings' },
      { status: 500 }
    )
  }
}