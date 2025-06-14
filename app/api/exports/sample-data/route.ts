import { NextRequest, NextResponse } from 'next/server';

// Sample data generator for testing Excel exports
function generateSampleData(type: string = 'sales', count: number = 100) {
  switch (type) {
    case 'sales':
      return generateSalesData(count);
    case 'inventory':
      return generateInventoryData(count);
    case 'customers':
      return generateCustomerData(count);
    case 'financial':
      return generateFinancialData(count);
    default:
      return generateSalesData(count);
  }
}

function generateSalesData(count: number) {
  const customers = ['ABC Corp', 'XYZ Ltd', 'Tech Solutions', 'Global Industries', 'Smart Systems', 'Innovation Hub', 'Digital Dynamics', 'Future Tech', 'Elite Solutions', 'Prime Industries'];
  const products = ['Marine Engine A1', 'Hydraulic Pump B2', 'Navigation System C3', 'Propeller Set D4', 'Control Panel E5', 'Safety Equipment F6', 'Communication Device G7', 'Power Generator H8'];
  const statuses = ['completed', 'pending', 'shipped', 'cancelled', 'processing'];
  const regions = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Northern Emirates', 'Saudi Arabia', 'Kuwait', 'Qatar', 'Oman'];
  
  return Array.from({ length: count }, (_, i) => {
    const baseDate = new Date();
    const orderDate = new Date(baseDate.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000);
    const quantity = Math.floor(Math.random() * 20) + 1;
    const unitPrice = Math.floor(Math.random() * 5000) + 500;
    const discount = Math.random() * 0.15; // 0-15% discount
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * discount;
    const netAmount = subtotal - discountAmount;
    const taxRate = 0.05; // 5% VAT
    const taxAmount = netAmount * taxRate;
    const totalAmount = netAmount + taxAmount;
    
    return {
      id: `SO-${String(i + 1).padStart(6, '0')}`,
      orderNumber: `ORD-${String(i + 1).padStart(8, '0')}`,
      invoiceNumber: `INV-${String(i + 1).padStart(8, '0')}`,
      orderDate: orderDate.toISOString().split('T')[0],
      deliveryDate: new Date(orderDate.getTime() + (Math.random() * 30 + 5) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customerName: customers[Math.floor(Math.random() * customers.length)],
      customerCode: `CUST-${String(Math.floor(Math.random() * 1000) + 1).padStart(4, '0')}`,
      product: products[Math.floor(Math.random() * products.length)],
      productCode: `PROD-${String(Math.floor(Math.random() * 1000) + 1).padStart(5, '0')}`,
      category: ['Marine Engines', 'Hydraulic Systems', 'Navigation', 'Propulsion', 'Safety'][Math.floor(Math.random() * 5)],
      quantity: quantity,
      unitPrice: unitPrice,
      subtotal: subtotal,
      discountPercent: discount,
      discountAmount: discountAmount,
      netAmount: netAmount,
      taxRate: taxRate,
      taxAmount: taxAmount,
      totalAmount: totalAmount,
      currency: 'AED',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      priority: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
      salesperson: `Sales Rep ${Math.floor(Math.random() * 10) + 1}`,
      salesPersonCode: `EMP-${String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')}`,
      region: regions[Math.floor(Math.random() * regions.length)],
      paymentTerms: ['Net 30', 'Net 60', 'COD', 'Advance Payment'][Math.floor(Math.random() * 4)],
      shippingMethod: ['Sea Freight', 'Air Freight', 'Land Transport', 'Express Delivery'][Math.floor(Math.random() * 4)],
      warehouse: `WH-${Math.floor(Math.random() * 5) + 1}`,
      notes: Math.random() > 0.7 ? `Special handling required for order ${i + 1}` : '',
      createdAt: orderDate.toISOString(),
      updatedAt: new Date(orderDate.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString()
    };
  });
}

function generateInventoryData(count: number) {
  const categories = ['Marine Engines', 'Hydraulic Systems', 'Navigation Equipment', 'Safety Equipment', 'Propulsion Systems', 'Communication Devices', 'Power Systems', 'Maintenance Tools'];
  const suppliers = ['Marine Tech LLC', 'Gulf Equipment Co', 'Emirates Marine', 'Al Futtaim Marine', 'Dubai Marine Services', 'Sharjah Marine Industries'];
  const locations = ['A', 'B', 'C', 'D', 'E'].map(zone => 
    Array.from({ length: 10 }, (_, row) => 
      Array.from({ length: 5 }, (_, shelf) => `${zone}-${row + 1}-${shelf + 1}`)
    ).flat()
  ).flat();
  
  return Array.from({ length: count }, (_, i) => {
    const costPrice = Math.floor(Math.random() * 2000) + 100;
    const markup = 1.2 + Math.random() * 0.8; // 20-100% markup
    const unitPrice = Math.floor(costPrice * markup);
    const stockQty = Math.floor(Math.random() * 500);
    const reorderLevel = Math.floor(Math.random() * 50) + 10;
    const maxStock = reorderLevel * 5 + Math.floor(Math.random() * 200);
    const lastReceived = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000);
    const lastSold = Math.random() > 0.2 ? new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) : null;
    
    return {
      id: `ITEM-${String(i + 1).padStart(6, '0')}`,
      itemCode: `SKU-${String(i + 1).padStart(8, '0')}`,
      barcode: `${Math.floor(Math.random() * 9000000000000) + 1000000000000}`,
      name: `Marine Item ${i + 1}`,
      description: `High-quality marine equipment item ${i + 1} for commercial and recreational vessels`,
      category: categories[Math.floor(Math.random() * categories.length)],
      subcategory: `Sub Cat ${Math.floor(Math.random() * 5) + 1}`,
      brand: ['Caterpillar', 'Cummins', 'Volvo Penta', 'MAN', 'MTU', 'Yanmar'][Math.floor(Math.random() * 6)],
      model: `Model-${String(Math.floor(Math.random() * 1000) + 1).padStart(4, '0')}`,
      supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
      supplierCode: `SUP-${String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')}`,
      unitOfMeasure: ['Each', 'Set', 'Meter', 'Kilogram', 'Liter'][Math.floor(Math.random() * 5)],
      costPrice: costPrice,
      unitPrice: unitPrice,
      currencyCode: 'AED',
      stockQuantity: stockQty,
      availableQuantity: Math.max(0, stockQty - Math.floor(Math.random() * 10)),
      reservedQuantity: Math.floor(Math.random() * 20),
      reorderLevel: reorderLevel,
      maxStockLevel: maxStock,
      location: locations[Math.floor(Math.random() * locations.length)],
      binLocation: `BIN-${String(Math.floor(Math.random() * 1000) + 1).padStart(4, '0')}`,
      weight: Math.floor(Math.random() * 100) + 1,
      dimensions: `${Math.floor(Math.random() * 100) + 10}x${Math.floor(Math.random() * 100) + 10}x${Math.floor(Math.random() * 100) + 10}`,
      lastReceivedDate: lastReceived.toISOString().split('T')[0],
      lastSoldDate: lastSold ? lastSold.toISOString().split('T')[0] : null,
      leadTime: Math.floor(Math.random() * 30) + 5, // 5-35 days
      safetyStock: Math.floor(Math.random() * 20) + 5,
      abcClassification: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
      status: stockQty === 0 ? 'Out of Stock' : stockQty <= reorderLevel ? 'Low Stock' : 'In Stock',
      isActive: Math.random() > 0.1, // 90% active
      isHazardous: Math.random() > 0.8, // 20% hazardous
      expiryDate: Math.random() > 0.7 ? new Date(Date.now() + Math.random() * 365 * 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
      warrantyPeriod: Math.floor(Math.random() * 36) + 12, // 12-48 months
      totalValue: stockQty * costPrice,
      marginPercent: ((unitPrice - costPrice) / unitPrice) * 100,
      turnoverRatio: Math.random() * 12 + 1,
      createdAt: new Date(Date.now() - Math.random() * 730 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  });
}

function generateCustomerData(count: number) {
  const companies = [
    'Emirates Marine Services LLC', 'Gulf Navigation Holdings', 'National Marine Dredging Company',
    'Abu Dhabi Ports', 'DP World UAE', 'Sharjah Port Authority', 'RAK Ports',
    'Dubai Maritime Academy', 'Emirates Maritime Arbitration Centre', 'Middle East Marine',
    'Arabian Gulf Marine', 'Red Sea Marine Services', 'Oceanic Marine Solutions'
  ];
  
  const cities = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'];
  const countries = ['UAE', 'Saudi Arabia', 'Kuwait', 'Qatar', 'Oman', 'Bahrain'];
  const types = ['Corporate', 'Government', 'SME', 'Individual', 'International'];
  const industries = ['Shipping', 'Oil & Gas', 'Fishing', 'Tourism', 'Port Operations', 'Marine Services', 'Defense'];
  
  return Array.from({ length: count }, (_, i) => {
    const registrationDate = new Date(Date.now() - Math.random() * 1095 * 24 * 60 * 60 * 1000); // Last 3 years
    const creditLimit = [50000, 100000, 250000, 500000, 1000000][Math.floor(Math.random() * 5)];
    const currentBalance = Math.floor(Math.random() * creditLimit * 0.8);
    const totalOrders = Math.floor(Math.random() * 100) + 1;
    const avgOrderValue = Math.floor(Math.random() * 50000) + 5000;
    const totalSpent = totalOrders * avgOrderValue;
    const lastOrderDate = Math.random() > 0.1 ? new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000) : null;
    
    return {
      id: `CUST-${String(i + 1).padStart(6, '0')}`,
      customerCode: `C${String(i + 1).padStart(8, '0')}`,
      name: i < companies.length ? companies[i] : `${companies[Math.floor(Math.random() * companies.length)]} ${i + 1}`,
      displayName: `Customer ${i + 1}`,
      type: types[Math.floor(Math.random() * types.length)],
      industry: industries[Math.floor(Math.random() * industries.length)],
      registrationNumber: `REG-${String(Math.floor(Math.random() * 1000000) + 100000)}`,
      taxNumber: `TRN-${String(Math.floor(Math.random() * 1000000000000) + 100000000000)}`,
      email: `contact${i + 1}@${companies[Math.floor(Math.random() * companies.length)].toLowerCase().replace(/[^a-z]/g, '')}.com`,
      phone: `+971-${Math.floor(Math.random() * 9) + 1}-${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
      mobile: `+971-50-${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
      fax: `+971-${Math.floor(Math.random() * 9) + 1}-${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
      website: `www.${companies[Math.floor(Math.random() * companies.length)].toLowerCase().replace(/[^a-z]/g, '')}.com`,
      country: countries[Math.floor(Math.random() * countries.length)],
      city: cities[Math.floor(Math.random() * cities.length)],
      address: `${Math.floor(Math.random() * 9999) + 1} ${['Marina', 'Port', 'Industrial', 'Business'][Math.floor(Math.random() * 4)]} Street`,
      postalCode: String(Math.floor(Math.random() * 90000) + 10000),
      coordinates: `${(25.0 + Math.random() * 2).toFixed(6)}, ${(55.0 + Math.random() * 2).toFixed(6)}`,
      contactPerson: `Contact Person ${i + 1}`,
      contactTitle: ['Manager', 'Director', 'Procurement Officer', 'CEO', 'Operations Manager'][Math.floor(Math.random() * 5)],
      contactEmail: `contact${i + 1}@customer${i + 1}.com`,
      contactPhone: `+971-50-${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
      creditLimit: creditLimit,
      currentBalance: currentBalance,
      availableCredit: creditLimit - currentBalance,
      creditTerms: ['Net 30', 'Net 60', 'Net 90', 'COD'][Math.floor(Math.random() * 4)],
      paymentMethod: ['Bank Transfer', 'Check', 'Credit Card', 'Cash'][Math.floor(Math.random() * 4)],
      currency: 'AED',
      discountPercent: Math.floor(Math.random() * 15), // 0-15%
      taxExempt: Math.random() > 0.8, // 20% tax exempt
      priceGroup: ['Standard', 'Premium', 'VIP', 'Wholesale'][Math.floor(Math.random() * 4)],
      salesTerritory: cities[Math.floor(Math.random() * cities.length)],
      salesRep: `Sales Rep ${Math.floor(Math.random() * 20) + 1}`,
      accountManager: `Account Manager ${Math.floor(Math.random() * 10) + 1}`,
      registrationDate: registrationDate.toISOString().split('T')[0],
      lastOrderDate: lastOrderDate ? lastOrderDate.toISOString().split('T')[0] : null,
      lastPaymentDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalOrders: totalOrders,
      totalSpent: totalSpent,
      avgOrderValue: avgOrderValue,
      lifetimeValue: totalSpent + Math.floor(Math.random() * 100000),
      frequency: Math.floor(Math.random() * 12) + 1, // orders per year
      recency: Math.floor(Math.random() * 365), // days since last order
      rfmScore: Math.floor(Math.random() * 555) + 111, // RFM scoring
      customerSince: Math.floor((Date.now() - registrationDate.getTime()) / (365 * 24 * 60 * 60 * 1000)),
      status: ['Active', 'Inactive', 'Prospect', 'Blocked'][Math.floor(Math.random() * 4)],
      priority: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
      segment: ['Enterprise', 'SMB', 'Government', 'Startup'][Math.floor(Math.random() * 4)],
      source: ['Website', 'Referral', 'Trade Show', 'Cold Call', 'Partner', 'Advertisement'][Math.floor(Math.random() * 6)],
      rating: Math.floor(Math.random() * 5) + 1, // 1-5 stars
      notes: Math.random() > 0.7 ? `Special customer with specific requirements for marine equipment` : '',
      tags: ['VIP', 'Bulk Orders', 'Quick Pay', 'Long Term'][Math.floor(Math.random() * 4)],
      isActive: Math.random() > 0.1, // 90% active
      createdAt: registrationDate.toISOString(),
      updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  });
}

function generateFinancialData(count: number) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentYear = new Date().getFullYear();
  
  return Array.from({ length: count }, (_, i) => {
    const month = months[i % 12];
    const year = currentYear - Math.floor(i / 12);
    const revenue = Math.floor(Math.random() * 500000) + 100000;
    const cogs = Math.floor(revenue * (0.4 + Math.random() * 0.2)); // 40-60% of revenue
    const grossProfit = revenue - cogs;
    const operatingExpenses = Math.floor(grossProfit * (0.3 + Math.random() * 0.3)); // 30-60% of gross profit
    const operatingIncome = grossProfit - operatingExpenses;
    const taxRate = 0.05; // 5% corporate tax in UAE
    const taxes = Math.max(0, operatingIncome * taxRate);
    const netIncome = operatingIncome - taxes;
    
    return {
      id: `FIN-${String(i + 1).padStart(4, '0')}`,
      period: `${month} ${year}`,
      year: year,
      month: month,
      quarter: `Q${Math.floor((i % 12) / 3) + 1}`,
      revenue: revenue,
      costOfGoodsSold: cogs,
      grossProfit: grossProfit,
      grossMargin: (grossProfit / revenue) * 100,
      operatingExpenses: operatingExpenses,
      operatingIncome: operatingIncome,
      operatingMargin: (operatingIncome / revenue) * 100,
      interestExpense: Math.floor(Math.random() * 5000),
      taxExpense: taxes,
      netIncome: netIncome,
      netMargin: (netIncome / revenue) * 100,
      ebitda: operatingIncome + Math.floor(Math.random() * 20000), // Adding depreciation
      assets: Math.floor(Math.random() * 2000000) + 500000,
      liabilities: Math.floor(Math.random() * 1000000) + 200000,
      equity: 0, // Will be calculated
      cashFlow: Math.floor(Math.random() * 200000) - 50000, // Can be negative
      workingCapital: Math.floor(Math.random() * 500000) + 100000,
      inventory: Math.floor(Math.random() * 300000) + 50000,
      accountsReceivable: Math.floor(Math.random() * 200000) + 30000,
      accountsPayable: Math.floor(Math.random() * 150000) + 20000,
      currentRatio: (Math.random() * 2) + 0.5, // 0.5 - 2.5
      quickRatio: (Math.random() * 1.5) + 0.3, // 0.3 - 1.8
      debtToEquity: (Math.random() * 2) + 0.1, // 0.1 - 2.1
      returnOnAssets: (Math.random() * 20) + 1, // 1% - 21%
      returnOnEquity: (Math.random() * 30) + 2, // 2% - 32%
      inventoryTurnover: (Math.random() * 8) + 2, // 2 - 10 times per year
      currency: 'AED',
      exchangeRate: 3.67 + (Math.random() * 0.1) - 0.05, // USD to AED rate variation
      budgetedRevenue: revenue * (0.9 + Math.random() * 0.2), // ±10% variance
      revenueVariance: 0, // Will be calculated
      notes: Math.random() > 0.8 ? `Exceptional performance in ${month} ${year}` : '',
      isAudited: Math.random() > 0.25, // 75% audited
      createdAt: new Date(year, i % 12, 1).toISOString(),
      updatedAt: new Date(year, i % 12, Math.floor(Math.random() * 28) + 1).toISOString()
    };
  }).map(record => {
    record.equity = record.assets - record.liabilities;
    record.revenueVariance = ((record.revenue - record.budgetedRevenue) / record.budgetedRevenue) * 100;
    return record;
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sales';
    const count = parseInt(searchParams.get('count') || '100');
    const format = searchParams.get('format') || 'json';

    // Validate parameters
    if (count > 10000) {
      return NextResponse.json(
        { error: 'Count cannot exceed 10,000 records' },
        { status: 400 }
      );
    }

    const validTypes = ['sales', 'inventory', 'customers', 'financial'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate sample data
    const data = generateSampleData(type, count);

    // Return data with metadata
    const response = {
      data,
      metadata: {
        type,
        count: data.length,
        generatedAt: new Date().toISOString(),
        columns: Object.keys(data[0] || {}),
        estimatedSize: JSON.stringify(data).length
      }
    };

    // Set appropriate headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Error generating sample data:', error);
    return NextResponse.json(
      { error: 'Failed to generate sample data' },
      { status: 500 }
    );
  }
}

// POST method for custom data requests
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { type = 'sales', count = 100, filters = {}, customFields = [] } = body;

    // Validate request
    if (count > 10000) {
      return NextResponse.json(
        { error: 'Count cannot exceed 10,000 records' },
        { status: 400 }
      );
    }

    // Generate base data
    let data = generateSampleData(type, count);

    // Apply filters if provided
    if (Object.keys(filters).length > 0) {
      data = data.filter(record => {
        return Object.entries(filters).every(([key, value]) => {
          if (value === null || value === undefined) return true;
          
          const recordValue = record[key];
          if (typeof value === 'string') {
            return recordValue?.toString().toLowerCase().includes(value.toLowerCase());
          }
          return recordValue === value;
        });
      });
    }

    // Add custom fields if provided
    if (customFields.length > 0) {
      data = data.map(record => {
        const customData = {};
        customFields.forEach(field => {
          if (field.type === 'random') {
            customData[field.name] = Math.random() * 1000;
          } else if (field.type === 'calculated') {
            // Simple calculation example
            customData[field.name] = record.totalAmount ? record.totalAmount * 0.1 : 0;
          } else {
            customData[field.name] = field.defaultValue || '';
          }
        });
        return { ...record, ...customData };
      });
    }

    return NextResponse.json({
      data,
      metadata: {
        type,
        requestedCount: count,
        actualCount: data.length,
        filtersApplied: Object.keys(filters).length > 0,
        customFieldsAdded: customFields.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error processing custom data request:', error);
    return NextResponse.json(
      { error: 'Failed to process custom data request' },
      { status: 500 }
    );
  }
}