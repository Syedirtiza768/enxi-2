import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { ItemService } from '@/lib/services/inventory/item.service'
import { CSVParser, CSVFieldMapper, CSVValidators, CSVTransformers, FieldMapping } from '@/lib/utils/csv-parser'
import { BulkImportItemInput } from '@/lib/services/inventory/item.service'

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
      { csvField: 'code', dbField: 'code', required: true, transform: CSVTransformers.trim },
      { csvField: 'name', dbField: 'name', required: true, transform: CSVTransformers.trim },
      { csvField: 'description', dbField: 'description', required: false, transform: CSVTransformers.trim },
      { csvField: 'categoryCode', dbField: 'categoryCode', required: true, transform: CSVTransformers.toUpperCase },
      { csvField: 'type', dbField: 'type', required: false, transform: CSVTransformers.toUpperCase, validate: CSVValidators.inList(['PRODUCT', 'SERVICE']) },
      { csvField: 'unitOfMeasureCode', dbField: 'unitOfMeasureCode', required: false, transform: CSVTransformers.toUpperCase },
      { csvField: 'listPrice', dbField: 'listPrice', required: false, transform: CSVTransformers.toNumber, validate: CSVValidators.isPositiveNumber },
      { csvField: 'standardCost', dbField: 'standardCost', required: false, transform: CSVTransformers.toNumber, validate: CSVValidators.isPositiveNumber },
      { csvField: 'reorderPoint', dbField: 'reorderPoint', required: false, transform: CSVTransformers.toNumber, validate: CSVValidators.isPositiveNumber },
      { csvField: 'minStockLevel', dbField: 'minStockLevel', required: false, transform: CSVTransformers.toNumber, validate: CSVValidators.isPositiveNumber },
      { csvField: 'maxStockLevel', dbField: 'maxStockLevel', required: false, transform: CSVTransformers.toNumber, validate: CSVValidators.isPositiveNumber },
      { csvField: 'isSaleable', dbField: 'isSaleable', required: false, transform: CSVTransformers.toBoolean },
      { csvField: 'isPurchaseable', dbField: 'isPurchaseable', required: false, transform: CSVTransformers.toBoolean },
      { csvField: 'trackInventory', dbField: 'trackInventory', required: false, transform: CSVTransformers.toBoolean }
    ]

    // Map and validate fields
    const { mappedData, errors } = CSVFieldMapper.mapFields<BulkImportItemInput>(
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
    const itemService = new ItemService()
    const result = await itemService.bulkImportItems(mappedData, user.id)

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
  const templateContent = `code,name,description,categoryCode,type,unitOfMeasureCode,listPrice,standardCost,reorderPoint,minStockLevel,maxStockLevel,isSaleable,isPurchaseable,trackInventory
"PROD-001","Widget A","Standard widget for general use","PROD","PRODUCT","EACH",25.99,15.50,100,50,500,"true","true","true"
"PROD-002","Widget B","Premium widget with extra features","PROD","PRODUCT","EACH",45.99,28.00,75,25,300,"true","true","true"
"SERV-001","Maintenance Service","Annual maintenance service","SERV","SERVICE","HOUR",150.00,0,0,0,0,"true","false","false"`

  return new NextResponse(templateContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="items-import-template.csv"'
    }
  })
}