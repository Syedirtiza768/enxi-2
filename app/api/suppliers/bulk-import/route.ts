import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { SupplierService } from '@/lib/services/purchase/supplier.service'
import { CSVParser, CSVFieldMapper, CSVValidators, CSVTransformers, FieldMapping } from '@/lib/utils/csv-parser'
import { BulkImportSupplierInput } from '@/lib/services/purchase/supplier.service'

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
      { csvField: 'email', dbField: 'email', required: false, transform: CSVTransformers.toLowerCase, validate: CSVValidators.isEmail },
      { csvField: 'phone', dbField: 'phone', required: false, transform: CSVTransformers.trim },
      { csvField: 'website', dbField: 'website', required: false, transform: CSVTransformers.trim },
      { csvField: 'address', dbField: 'address', required: false, transform: CSVTransformers.trim },
      { csvField: 'taxId', dbField: 'taxId', required: false, transform: CSVTransformers.trim },
      { csvField: 'currency', dbField: 'currency', required: false, transform: CSVTransformers.toUpperCase },
      { csvField: 'paymentTerms', dbField: 'paymentTerms', required: false, transform: CSVTransformers.toNumber, validate: CSVValidators.isPositiveNumber },
      { csvField: 'creditLimit', dbField: 'creditLimit', required: false, transform: CSVTransformers.toNumber, validate: CSVValidators.isPositiveNumber },
      { csvField: 'discount', dbField: 'discount', required: false, transform: CSVTransformers.toNumber, validate: CSVValidators.isPositiveNumber },
      { csvField: 'bankName', dbField: 'bankName', required: false, transform: CSVTransformers.trim },
      { csvField: 'bankAccount', dbField: 'bankAccount', required: false, transform: CSVTransformers.trim },
      { csvField: 'routingNumber', dbField: 'routingNumber', required: false, transform: CSVTransformers.trim },
      { csvField: 'contactPerson', dbField: 'contactPerson', required: false, transform: CSVTransformers.trim },
      { csvField: 'contactEmail', dbField: 'contactEmail', required: false, transform: CSVTransformers.toLowerCase, validate: CSVValidators.isEmail },
      { csvField: 'contactPhone', dbField: 'contactPhone', required: false, transform: CSVTransformers.trim },
      { csvField: 'isPreferred', dbField: 'isPreferred', required: false, transform: CSVTransformers.toBoolean }
    ]

    // Map and validate fields
    const { mappedData, errors } = CSVFieldMapper.mapFields<BulkImportSupplierInput>(
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
    const supplierService = new SupplierService()
    const result = await supplierService.bulkImportSuppliers(mappedData, user.id)

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
  const templateContent = `name,email,phone,website,address,taxId,currency,paymentTerms,creditLimit,discount,bankName,bankAccount,routingNumber,contactPerson,contactEmail,contactPhone,isPreferred
"Supplier One Inc","supplier1@example.com","+1234567890","www.supplier1.com","789 Supply St","SUP123456","USD",30,100000,5,"Bank of Commerce","1234567890","987654321","John Doe","john@supplier1.com","+1234567890","true"
"Supplier Two Ltd","supplier2@example.com","+0987654321","www.supplier2.com","321 Vendor Ave","SUP654321","USD",45,150000,7.5,"National Bank","0987654321","123456789","Jane Smith","jane@supplier2.com","+0987654321","false"`

  return new NextResponse(templateContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="suppliers-import-template.csv"'
    }
  })
}