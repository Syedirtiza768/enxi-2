'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExcelExporter } from './excel-exporter';
import useExcelExport from '@/lib/hooks/use-excel-export';
import { 
  FileSpreadsheet, 
  Download,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  BarChart3,
  PieChart,
  LineChart,
  Target
} from 'lucide-react';

// Example data generators
const generateSalesData = (count: number = 100): void => {
  const customers = ['ABC Corp', 'XYZ Ltd', 'Tech Solutions', 'Global Industries', 'Smart Systems'];
  const products = ['Product A', 'Product B', 'Product C', 'Product D', 'Product E'];
  const statuses = ['completed', 'pending', 'cancelled'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `SO-${String(i + 1).padStart(4, '0')}`,
    orderNumber: `ORD-${String(i + 1).padStart(6, '0')}`,
    date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    customerName: customers[Math.floor(Math.random() * customers.length)],
    product: products[Math.floor(Math.random() * products.length)],
    quantity: Math.floor(Math.random() * 100) + 1,
    unitPrice: Math.random() * 1000 + 50,
    totalAmount: 0, // Will be calculated
    status: statuses[Math.floor(Math.random() * statuses.length)],
    salesperson: `Sales Rep ${Math.floor(Math.random() * 10) + 1}`,
    region: ['North', 'South', 'East', 'West'][Math.floor(Math.random() * 4)],
    discount: Math.random() * 0.2,
    taxAmount: 0, // Will be calculated
    commission: 0 // Will be calculated
  })).map(order => {
    order.totalAmount = Number(order.quantity || 0) * Number(order.unitPrice || 0) * (1 - Number(order.discount || 0));
    order.taxAmount = order.totalAmount * 0.05; // 5% tax
    order.commission = order.totalAmount * 0.03; // 3% commission
    return order;
  });
};

const generateInventoryData = (count: number = 200): void => {
  const categories = ['Electronics', 'Automotive', 'Industrial', 'Office Supplies', 'Tools'];
  const suppliers = ['Supplier A', 'Supplier B', 'Supplier C', 'Supplier D', 'Supplier E'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `ITM-${String(i + 1).padStart(5, '0')}`,
    itemCode: `SKU-${String(i + 1).padStart(6, '0')}`,
    name: `Item ${i + 1}`,
    description: `Description for item ${i + 1}`,
    category: categories[Math.floor(Math.random() * categories.length)],
    supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
    unitPrice: Math.random() * 500 + 10,
    costPrice: Math.random() * 300 + 5,
    stockQuantity: Math.floor(Math.random() * 1000),
    reorderLevel: Math.floor(Math.random() * 50) + 10,
    maxStock: Math.floor(Math.random() * 2000) + 100,
    location: `${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}-${Math.floor(Math.random() * 20) + 1}-${Math.floor(Math.random() * 10) + 1}`,
    lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
  })).map(item => ({
    ...item,
    totalValue: item.stockQuantity * item.costPrice,
    margin: ((item.unitPrice - item.costPrice) / item.unitPrice) * 100,
    status: item.stockQuantity <= item.reorderLevel ? 'Low Stock' : item.stockQuantity === 0 ? 'Out of Stock' : 'In Stock',
    turnoverRatio: Math.random() * 12 + 1
  }));
};

const generateCustomerData = (count: number = 50): void => {
  const countries = ['UAE', 'Saudi Arabia', 'Kuwait', 'Qatar', 'Oman'];
  const types = ['Corporate', 'Individual', 'Government', 'SME'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `CUST-${String(i + 1).padStart(4, '0')}`,
    name: `Customer ${i + 1}`,
    email: `customer${i + 1}@example.com`,
    phone: `+971-50-${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
    type: types[Math.floor(Math.random() * types.length)],
    creditLimit: Math.floor(Math.random() * 100000) + 10000,
    currentBalance: Math.floor(Math.random() * 50000),
    country: countries[Math.floor(Math.random() * countries.length)],
    city: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'][Math.floor(Math.random() * 4)],
    registrationDate: new Date(Date.now() - Math.random() * 1095 * 24 * 60 * 60 * 1000), // Last 3 years
    lastOrderDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Last 3 months
    totalOrders: Math.floor(Math.random() * 50) + 1,
    totalSpent: Math.floor(Math.random() * 200000) + 5000,
    status: ['Active', 'Inactive', 'Suspended'][Math.floor(Math.random() * 3)]
  }));
};

export function ExcelExportExamples(): React.JSX.Element {
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const { exportToExcel, isExporting, stats } = useExcelExport({
    onComplete: (result): void => {
      console.log('Export completed:', result);
    },
    onError: (error): void => {
      console.error('Export failed:', error);
    }
  });

  const examples = [
    {
      id: 'sales-report',
      title: 'Sales Performance Report',
      description: 'Comprehensive sales analysis with charts and KPIs',
      icon: TrendingUp,
      color: 'bg-blue-500',
      dataGenerator: (): void => generateSalesData(500),
      columns: [
        { key: 'orderNumber', label: 'Order Number', type: 'string' as const, width: 15 },
        { key: 'date', label: 'Order Date', type: 'date' as const, width: 12 },
        { key: 'customerName', label: 'Customer', type: 'string' as const, width: 20 },
        { key: 'product', label: 'Product', type: 'string' as const, width: 15 },
        { key: 'quantity', label: 'Quantity', type: 'number' as const, width: 10 },
        { key: 'unitPrice', label: 'Unit Price', type: 'currency' as const, width: 12 },
        { key: 'discount', label: 'Discount %', type: 'percentage' as const, width: 10 },
        { key: 'totalAmount', label: 'Total Amount', type: 'currency' as const, width: 15 },
        { key: 'taxAmount', label: 'Tax Amount', type: 'currency' as const, width: 12 },
        { key: 'status', label: 'Status', type: 'string' as const, width: 12 },
        { key: 'salesperson', label: 'Salesperson', type: 'string' as const, width: 15 },
        { key: 'region', label: 'Region', type: 'string' as const, width: 10 }
      ],
      sheets: [
        {
          name: 'Sales Data',
          data: [],
          columns: [],
          autoFilter: true,
          freezePanes: { row: 1 },
          charts: [
            {
              type: 'column' as const,
              title: 'Sales by Region',
              dataRange: 'K1:L100',
              position: { col: 14, row: 2 },
              size: { width: 400, height: 300 }
            },
            {
              type: 'pie' as const,
              title: 'Sales by Status',
              dataRange: 'J1:J100',
              position: { col: 14, row: 20 },
              size: { width: 400, height: 300 }
            }
          ]
        },
        {
          name: 'Summary',
          data: [],
          columns: [
            { key: 'metric', label: 'Metric', type: 'string' as const, width: 25 },
            { key: 'value', label: 'Value', type: 'currency' as const, width: 15 },
            { key: 'percentage', label: 'Change %', type: 'percentage' as const, width: 12 }
          ]
        }
      ]
    },
    {
      id: 'inventory-analysis',
      title: 'Inventory Analysis Report',
      description: 'Stock levels, valuation, and movement analysis',
      icon: Package,
      color: 'bg-green-500',
      dataGenerator: (): void => generateInventoryData(1000),
      columns: [
        { key: 'itemCode', label: 'Item Code', type: 'string' as const, width: 15 },
        { key: 'name', label: 'Item Name', type: 'string' as const, width: 25 },
        { key: 'category', label: 'Category', type: 'string' as const, width: 15 },
        { key: 'supplier', label: 'Supplier', type: 'string' as const, width: 15 },
        { key: 'stockQuantity', label: 'Stock Qty', type: 'number' as const, width: 12 },
        { key: 'reorderLevel', label: 'Reorder Level', type: 'number' as const, width: 12 },
        { key: 'unitPrice', label: 'Unit Price', type: 'currency' as const, width: 12 },
        { key: 'costPrice', label: 'Cost Price', type: 'currency' as const, width: 12 },
        { key: 'totalValue', label: 'Total Value', type: 'currency' as const, width: 15 },
        { key: 'margin', label: 'Margin %', type: 'percentage' as const, width: 10 },
        { key: 'status', label: 'Status', type: 'string' as const, width: 12 },
        { key: 'location', label: 'Location', type: 'string' as const, width: 12 },
        { key: 'turnoverRatio', label: 'Turnover Ratio', type: 'number' as const, width: 15 }
      ],
      sheets: [
        {
          name: 'Inventory Details',
          data: [],
          columns: [],
          autoFilter: true,
          freezePanes: { row: 1 }
        },
        {
          name: 'Low Stock Alert',
          data: [],
          columns: [],
          autoFilter: true
        },
        {
          name: 'Valuation Summary',
          data: [],
          columns: [
            { key: 'category', label: 'Category', type: 'string' as const, width: 20 },
            { key: 'totalItems', label: 'Total Items', type: 'number' as const, width: 12 },
            { key: 'totalValue', label: 'Total Value', type: 'currency' as const, width: 15 },
            { key: 'avgMargin', label: 'Avg Margin %', type: 'percentage' as const, width: 12 }
          ],
          charts: [
            {
              type: 'bar' as const,
              title: 'Inventory Value by Category',
              dataRange: 'A1:C10',
              position: { col: 6, row: 2 },
              size: { width: 500, height: 300 }
            }
          ]
        }
      ]
    },
    {
      id: 'customer-analysis',
      title: 'Customer Analysis Report',
      description: 'Customer demographics, spending patterns, and segmentation',
      icon: Users,
      color: 'bg-purple-500',
      dataGenerator: (): void => generateCustomerData(200),
      columns: [
        { key: 'name', label: 'Customer Name', type: 'string' as const, width: 25 },
        { key: 'email', label: 'Email', type: 'string' as const, width: 25 },
        { key: 'phone', label: 'Phone', type: 'string' as const, width: 15 },
        { key: 'type', label: 'Customer Type', type: 'string' as const, width: 12 },
        { key: 'country', label: 'Country', type: 'string' as const, width: 12 },
        { key: 'city', label: 'City', type: 'string' as const, width: 12 },
        { key: 'creditLimit', label: 'Credit Limit', type: 'currency' as const, width: 15 },
        { key: 'currentBalance', label: 'Current Balance', type: 'currency' as const, width: 15 },
        { key: 'totalOrders', label: 'Total Orders', type: 'number' as const, width: 12 },
        { key: 'totalSpent', label: 'Total Spent', type: 'currency' as const, width: 15 },
        { key: 'registrationDate', label: 'Registration Date', type: 'date' as const, width: 15 },
        { key: 'lastOrderDate', label: 'Last Order Date', type: 'date' as const, width: 15 },
        { key: 'status', label: 'Status', type: 'string' as const, width: 12 }
      ],
      sheets: [
        {
          name: 'Customer List',
          data: [],
          columns: [],
          autoFilter: true,
          freezePanes: { row: 1 }
        },
        {
          name: 'Customer Segmentation',
          data: [],
          columns: [
            { key: 'segment', label: 'Segment', type: 'string' as const, width: 20 },
            { key: 'customerCount', label: 'Customer Count', type: 'number' as const, width: 15 },
            { key: 'avgSpent', label: 'Avg Spent', type: 'currency' as const, width: 15 },
            { key: 'totalRevenue', label: 'Total Revenue', type: 'currency' as const, width: 15 }
          ],
          charts: [
            {
              type: 'pie' as const,
              title: 'Customer Distribution by Type',
              dataRange: 'A1:B10',
              position: { col: 6, row: 2 },
              size: { width: 400, height: 300 }
            }
          ]
        }
      ]
    },
    {
      id: 'financial-dashboard',
      title: 'Financial Dashboard',
      description: 'P&L, balance sheet summary, and financial KPIs',
      icon: DollarSign,
      color: 'bg-yellow-500',
      dataGenerator: (): void => [
        { period: 'Q1 2024', revenue: 1250000, expenses: 980000, profit: 270000 },
        { period: 'Q2 2024', revenue: 1380000, expenses: 1050000, profit: 330000 },
        { period: 'Q3 2024', revenue: 1420000, expenses: 1100000, profit: 320000 },
        { period: 'Q4 2024', revenue: 1580000, expenses: 1200000, profit: 380000 }
      ],
      columns: [
        { key: 'period', label: 'Period', type: 'string' as const, width: 15 },
        { key: 'revenue', label: 'Revenue', type: 'currency' as const, width: 15 },
        { key: 'expenses', label: 'Expenses', type: 'currency' as const, width: 15 },
        { key: 'profit', label: 'Net Profit', type: 'currency' as const, width: 15, formula: '=B{row}-C{row}' },
        { key: 'margin', label: 'Profit Margin', type: 'percentage' as const, width: 15, formula: '=D{row}/B{row}' }
      ],
      sheets: [
        {
          name: 'Financial Summary',
          data: [],
          columns: [],
          charts: [
            {
              type: 'column' as const,
              title: 'Quarterly Revenue vs Expenses',
              dataRange: 'A1:C5',
              position: { col: 7, row: 2 },
              size: { width: 500, height: 300 }
            },
            {
              type: 'line' as const,
              title: 'Profit Margin Trend',
              dataRange: 'A1:A5,E1:E5',
              position: { col: 7, row: 20 },
              size: { width: 500, height: 300 }
            }
          ]
        }
      ]
    }
  ];

  const handleExportExample = async (example: typeof examples[0]): void => {
    setSelectedExample(example.id);
    
    try {
      const data = example.dataGenerator();
      
      // Prepare sheets with data
      const sheetsWithData = example.sheets.map(sheet => ({
        ...sheet,
        data: data,
        columns: sheet.columns.length > 0 ? sheet.columns : example.columns
      }));

      await exportToExcel(
        data,
        sheetsWithData,
        `${example.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`,
        {
          compression: true,
          backgroundProcessing: true
        }
      );
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setSelectedExample(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Excel Export Examples</h2>
        <p className="text-gray-600 mb-6">
          Explore different types of Excel exports with advanced formatting, charts, and business intelligence
        </p>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalExports}</div>
              <div className="text-sm text-gray-500">Total Exports</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.successfulExports}</div>
              <div className="text-sm text-gray-500">Successful</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failedExports}</div>
              <div className="text-sm text-gray-500">Failed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.activeExports}</div>
              <div className="text-sm text-gray-500">Active</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {examples.map((example) => {
          const IconComponent = example.icon;
          const isExportingThis = selectedExample === example.id;
          
          return (
            <Card key={example.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${example.color} text-white`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  {example.title}
                </CardTitle>
                <CardDescription>{example.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Features */}
                <div className="flex flex-wrap gap-2">
                  {example.sheets.length > 1 && (
                    <Badge variant="secondary">Multiple Sheets</Badge>
                  )}
                  {example.sheets.some(sheet => sheet.charts && sheet.charts.length > 0) && (
                    <Badge variant="secondary">Charts</Badge>
                  )}
                  {example.columns.some(col => col.type === 'formula') && (
                    <Badge variant="secondary">Formulas</Badge>
                  )}
                  {example.sheets.some(sheet => sheet.autoFilter) && (
                    <Badge variant="secondary">Auto Filter</Badge>
                  )}
                  <Badge variant="outline">
                    {example.dataGenerator().length.toLocaleString()} rows
                  </Badge>
                </div>

                {/* Chart Types */}
                {example.sheets.some(sheet => sheet.charts && sheet.charts.length > 0) && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Charts:</span>
                    {example.sheets.flatMap(sheet => sheet.charts || []).map((chart, index) => {
                      const chartIcons = {
                        column: BarChart3,
                        bar: BarChart3,
                        line: LineChart,
                        pie: PieChart,
                        area: TrendingUp,
                        scatter: Target
                      };
                      const ChartIcon = chartIcons[chart.type] || BarChart3;
                      return (
                        <div key={index} className="flex items-center gap-1">
                          <ChartIcon className="w-3 h-3" />
                          <span className="capitalize">{chart.type}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Export Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={(): void => handleExportExample(example)}
                    disabled={isExporting || isExportingThis}
                    className="flex-1"
                  >
                    {isExportingThis ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export Example
                      </>
                    )}
                  </Button>
                  
                  <ExcelExporter
                    dataSource={(): void => Promise.resolve(example.dataGenerator())}
                    defaultColumns={example.columns}
                    trigger={
                      <Button variant="outline">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Customize
                      </Button>
                    }
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* General Excel Exporter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Custom Excel Export
          </CardTitle>
          <CardDescription>
            Create a custom Excel export with your own data and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExcelExporter
            dataSource="/api/exports/sample-data"
            allowTemplateSelection={true}
            allowCustomColumns={true}
            allowCharts={true}
            maxRows={50000}
            trigger={
              <Button className="w-full">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Open Advanced Excel Exporter
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default ExcelExportExamples;