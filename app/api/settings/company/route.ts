import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth/server-auth'
import { CompanySettingsService } from '@/lib/services/company-settings.service'

const companySettingsService = new CompanySettingsService()

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAuth(request)
    if (!auth.isValid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await companySettingsService.getSettings()
    const supportedCurrencies = companySettingsService.getSupportedCurrencies()

    return NextResponse.json({
      settings,
      supportedCurrencies
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch company settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await validateAuth(request)
    if (!auth.isValid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update company settings
    if (auth.user.role !== 'ADMIN' && auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const updatedSettings = await companySettingsService.updateSettings({
      ...body,
      updatedBy: auth.user.id
    })

    return NextResponse.json(updatedSettings)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update company settings' },
      { status: 500 }
    )
  }
}