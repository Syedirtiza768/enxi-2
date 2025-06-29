import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { CompanySettingsService } from '@/lib/services/company-settings.service'

const companySettingsService = new CompanySettingsService()

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Company settings GET request received')
    let user
    try {
      user = await getUserFromRequest(request)
      console.log('Authenticated user:', user)
    } catch (authError) {
      console.error('Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await companySettingsService.getSettings()
    const supportedCurrencies = companySettingsService.getSupportedCurrencies()

    return NextResponse.json({
      settings,
      supportedCurrencies
    })
  } catch (error: any) {
    console.error('Company settings GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch company settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Company settings PUT request received')
    
    let user
    try {
      user = await getUserFromRequest(request)
      console.log('Authenticated user:', user)
    } catch (authError) {
      console.error('Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update company settings
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      console.error(`User role ${user.role} is not authorized to update company settings`)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    console.log('Update company settings request body:', body)
    
    const updatedSettings = await companySettingsService.updateSettings({
      ...body,
      updatedBy: user.id
    })

    console.log('Company settings updated successfully')
    return NextResponse.json(updatedSettings)
  } catch (error: any) {
    console.error('Company settings PUT error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update company settings' },
      { status: 500 }
    )
  }
}