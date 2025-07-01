import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { CustomerService } from '@/lib/services/customer.service'
import { CSVParser, CSVFieldMapper, CSVValidators, CSVTransformers, FieldMapping } from '@/lib/utils/csv-parser'
import { BulkImportCustomerInput } from '@/lib/services/customer.service'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to text first for server-side parsing
    const text = await file.text()
    const parseResult = CSVParser.parseString<any>(text)
    
    if (parseResult.errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'CSV parsing failed',
        details: parseResult.errors
      }, { status: 400 })
    }

    // Define field mappings
    const fieldMappings: FieldMapping[] = [
      { csvField: 'name', dbField: 'name', required: true, transform: CSVTransformers.trim },
      { csvField: 'email', dbField: 'email', required: true, transform: CSVTransformers.toLowerCase, validate: CSVValidators.isEmail },
      { csvField: 'phone', dbField: 'phone', required: false, transform: CSVTransformers.trim },
      { csvField: 'industry', dbField: 'industry', required: false, transform: CSVTransformers.trim },
      { csvField: 'website', dbField: 'website', required: false, transform: CSVTransformers.trim },
      { csvField: 'address', dbField: 'address', required: false, transform: CSVTransformers.trim },
      { csvField: 'taxId', dbField: 'taxId', required: false, transform: CSVTransformers.trim },
      { csvField: 'currency', dbField: 'currency', required: false, transform: CSVTransformers.toUpperCase },
      { csvField: 'creditLimit', dbField: 'creditLimit', required: false, transform: CSVTransformers.toNumber, validate: CSVValidators.isPositiveNumber },
      { csvField: 'paymentTerms', dbField: 'paymentTerms', required: false, transform: CSVTransformers.toNumber, validate: CSVValidators.isPositiveNumber }
    ]

    // Map and validate fields
    const { mappedData, errors } = CSVFieldMapper.mapFields<BulkImportCustomerInput>(
      parseResult.data,
      fieldMappings
    )

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        validationErrors: errors
      }, { status: 400 })
    }

    // Perform bulk import
    const customerService = new CustomerService()
    const result = await customerService.bulkImportCustomers(mappedData, user.id)

    return NextResponse.json({
      success: true,
      result: {
        totalRecords: result.totalRecords,
        successCount: result.successCount,
        failureCount: result.failureCount,
        errors: result.errors
      }
    })
  } catch (error) {
    console.error('Bulk import error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Bulk import failed'
    }, { status: 500 })
  }
}

export async function GET() {
  // Return CSV template
  const templateContent = `name,email,phone,industry,website,address,taxId,currency,creditLimit,paymentTerms
"ABC Company Ltd","abc@example.com","+1234567890","Manufacturing","www.abc.com","123 Main St, City","TAX123456","USD",50000,30
"XYZ Corporation","xyz@example.com","+0987654321","Retail","www.xyz.com","456 Oak Ave, Town","TAX654321","USD",75000,45`

  return new NextResponse(templateContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="customers-import-template.csv"'
    }
  })
}