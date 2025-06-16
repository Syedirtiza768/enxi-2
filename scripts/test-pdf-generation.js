const { PrismaClient } = require('../lib/generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function testPDFGeneration() {
  try {
    console.log('=== Testing PDF Generation ===\n');

    // Get the test quotation
    const quotation = await prisma.quotation.findFirst({
      where: { quotationNumber: 'QUOT-2025-0088' },
      include: {
        salesCase: {
          include: { customer: true }
        },
        items: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (!quotation) {
      console.error('Test quotation not found. Please run create-test-quotation.js first.');
      return;
    }

    console.log('Found quotation:', quotation.quotationNumber);
    console.log('Customer:', quotation.salesCase.customer.name);
    console.log('Total Amount: $', quotation.totalAmount.toFixed(2));

    // Test the PDF generation by calling the route handler directly
    console.log('\n1. Testing PDF route handler...');
    
    // Import the PDF route handler
    try {
      // Import the PDF template
      const { generateQuotationPDF } = require('../lib/pdf/quotation-template.tsx');
      
      console.log('   ✓ PDF template module loaded');
      
      // Prepare the quotation data for PDF
      const pdfData = {
        quotation: {
          ...quotation,
          customer: quotation.salesCase.customer,
          formattedDate: new Date(quotation.createdAt).toLocaleDateString(),
          formattedValidUntil: new Date(quotation.validUntil).toLocaleDateString()
        },
        companyInfo: {
          name: 'EnXi ERP',
          address: '123 Business Ave, Suite 100',
          phone: '+1 (555) 123-4567',
          email: 'info@enxi-erp.com',
          website: 'www.enxi-erp.com'
        },
        showLogo: true,
        showTaxBreakdown: true
      };
      
      // Generate PDF
      console.log('\n2. Generating PDF...');
      const pdfBuffer = await generateQuotationPDF(pdfData);
      
      if (pdfBuffer) {
        // Save PDF to file
        const outputPath = path.join('downloads', `${quotation.quotationNumber}.pdf`);
        
        // Create downloads directory if it doesn't exist
        if (!fs.existsSync('downloads')) {
          fs.mkdirSync('downloads');
        }
        
        fs.writeFileSync(outputPath, pdfBuffer);
        console.log(`   ✓ PDF generated successfully!`);
        console.log(`   ✓ Saved to: ${outputPath}`);
        console.log(`   ✓ File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
      } else {
        console.log('   ! PDF generation returned empty buffer');
      }
      
    } catch (error) {
      console.error('   ! Error generating PDF:', error.message);
      
      // Try alternative approach - test via HTTP
      console.log('\n3. Testing PDF generation via HTTP...');
      
      const fetch = require('node-fetch');
      const response = await fetch(`http://localhost:3000/api/quotations/${quotation.id}/pdf`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
          // Add a mock authorization header if needed
          'Authorization': 'Bearer test-token'
        }
      });
      
      console.log('   Response status:', response.status);
      console.log('   Content-Type:', response.headers.get('content-type'));
      
      if (response.ok) {
        const buffer = await response.buffer();
        const outputPath = path.join('downloads', `${quotation.quotationNumber}-http.pdf`);
        fs.writeFileSync(outputPath, buffer);
        console.log(`   ✓ PDF downloaded via HTTP`);
        console.log(`   ✓ Saved to: ${outputPath}`);
      } else {
        const text = await response.text();
        console.log('   ! HTTP Error:', text);
      }
    }

    // Display quotation structure for PDF template reference
    console.log('\n4. Quotation structure for PDF template:');
    console.log(JSON.stringify({
      quotationNumber: quotation.quotationNumber,
      customer: quotation.salesCase.customer.name,
      date: quotation.createdAt,
      validUntil: quotation.validUntil,
      items: quotation.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: item.totalAmount
      })),
      subtotal: quotation.subtotal,
      discount: quotation.discountAmount,
      tax: quotation.taxAmount,
      total: quotation.totalAmount
    }, null, 2));

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPDFGeneration().catch(console.error);