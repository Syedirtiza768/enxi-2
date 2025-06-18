// Test script to verify quotation API fix
const testData = {
  salesCaseId: "test-sales-case-id",
  validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  paymentTerms: "Net 30 days",
  deliveryTerms: "Standard delivery",
  notes: "Test quotation",
  internalNotes: "Internal test notes",
  items: [
    {
      lineNumber: 1,
      lineDescription: "Test line",
      isLineHeader: true,
      itemType: "PRODUCT",
      itemCode: "TEST-001",
      description: "Test product",
      quantity: 2,
      unitPrice: 100.00,
      discount: 5,
      taxRate: 10
    },
    {
      lineNumber: 1,
      lineDescription: "",
      isLineHeader: false,
      itemType: "SERVICE",
      itemCode: "SRV-001", 
      description: "Test service",
      quantity: 1,
      unitPrice: 50.00,
      discount: 0,
      taxRate: 10
    }
  ]
};

async function testQuotationAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/quotations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Quotation created successfully:', result);
    } else {
      console.log('❌ Error creating quotation:', result);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Run the test
testQuotationAPI();