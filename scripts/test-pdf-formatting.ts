import { QuotationService } from '@/lib/services/quotation.service';
import { renderToBuffer } from '@react-pdf/renderer';
import { QuotationPDF } from '@/lib/pdf/quotation-template';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/db/prisma';

async function testPDFFormatting() {
  try {
    console.log('Testing PDF formatting with company logo...');
    
    const quotationService = new QuotationService();
    
    // Get the first quotation for testing directly from database
    const quotation = await prisma.quotation.findFirst({
      where: { status: 'DRAFT' },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!quotation) {
      console.error('No quotations found for testing');
      return;
    }
    
    const quotationId = quotation.id;
    console.log(`Testing with quotation: ${quotationId}`);
    
    // Test both client and internal views
    for (const viewType of ['client', 'internal'] as const) {
      console.log(`\nGenerating ${viewType} view PDF...`);
      
      const pdfData = await quotationService.getQuotationPDFData(quotationId, viewType);
      
      console.log('PDF Data:', {
        viewType,
        hasQuotation: !!pdfData.quotation,
        companyInfo: {
          name: pdfData.companyInfo?.name,
          logoUrl: pdfData.companyInfo?.logoUrl,
          hasLogo: !!pdfData.companyInfo?.logoUrl
        },
        showLogo: pdfData.showLogo,
        showTaxBreakdown: pdfData.showTaxBreakdown
      });
      
      // Generate PDF
      const pdfBuffer = await renderToBuffer(
        QuotationPDF({
          quotation: pdfData.quotation,
          companyInfo: pdfData.companyInfo,
          showLogo: pdfData.showLogo,
          showTaxBreakdown: pdfData.showTaxBreakdown,
          viewType
        })
      );
      
      // Save to file for manual inspection
      const filename = `test-quotation-${viewType}-${Date.now()}.pdf`;
      const filepath = join(process.cwd(), 'public', 'uploads', filename);
      await writeFile(filepath, pdfBuffer);
      
      console.log(`✅ PDF generated successfully: public/uploads/${filename}`);
      console.log(`   Size: ${(pdfBuffer.byteLength / 1024).toFixed(2)} KB`);
    }
    
    console.log('\n✅ PDF formatting test completed successfully!');
    console.log('Check the generated PDFs in public/uploads/ to verify:');
    console.log('- Company logo is displayed');
    console.log('- Text is properly spaced without overlapping');
    console.log('- Internal view shows detailed item information');
    
  } catch (error) {
    console.error('Error testing PDF formatting:', error);
  } finally {
    process.exit(0);
  }
}

testPDFFormatting();