import { NextRequest, NextResponse } from 'next/server'
// // import { getServerSession } from 'next-auth'
// // import { authOptions } from '@/lib/auth'
import { CompanySettingsService } from '@/lib/services/company-settings.service'

export async function GET(request: NextRequest) {
  try {
    const session = { user: { id: 'system' } }
    // const session = { user: { id: 'system' } }
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const settingsService = new CompanySettingsService()
    const quotationSettings = await settingsService.getQuotationSettings()

    return NextResponse.json(quotationSettings)
  } catch (error) {
    console.error('Error fetching quotation settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quotation settings' },
      { status: 500 }
    )
  }
}