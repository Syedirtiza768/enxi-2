# Sales Charts Component

A comprehensive sales analytics dashboard component that provides visual insights into sales performance with interactive charts, drill-down capabilities, and export functionality.

## Features

### 📊 Chart Types
- **Revenue Trends**: Line chart showing sales revenue over time
- **Sales by Product/Category**: Bar and pie charts for product performance
- **Sales by Customer**: Customer revenue analysis with segmentation
- **Monthly/Quarterly Comparison**: Area charts for period comparisons
- **Sales Pipeline Funnel**: Visual representation of sales conversion stages
- **Regional Sales Performance**: Geographic distribution of sales

### 🔍 Interactive Features
- **Drill-down Capabilities**: Click on chart elements for detailed views
- **Date Range Filtering**: Daily, weekly, monthly, and yearly views
- **Customer and Product Filtering**: Filter data by specific criteria
- **Real-time Updates**: Automatic data refresh functionality
- **Responsive Design**: Optimized for all screen sizes

### 📤 Export Functionality
- **PNG Export**: High-quality image export for presentations
- **PDF Export**: Professional PDF reports
- **CSV Export**: Raw data export for further analysis
- **Multi-format Support**: Various export options for different use cases

### 📈 Key Metrics Dashboard
- Total Revenue with growth indicators
- Total Orders and trends
- Average Order Value (AOV)
- Conversion Rates
- New vs. Returning Customers
- Target Achievement tracking

## Installation

```bash
# Install required dependencies
npm install recharts html2canvas jspdf papaparse date-fns

# Install type definitions
npm install --save-dev @types/papaparse
```

## Usage

### Basic Implementation

```tsx
import { SalesChartsComponent } from '@/components/sales'

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto">
      <SalesChartsComponent />
    </div>
  )
}
```

### With Custom Props

```tsx
import { SalesChartsComponent } from '@/components/sales'

export default function CustomAnalyticsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Sales Performance</h1>
      <SalesChartsComponent />
    </div>
  )
}
```

## API Integration

The component automatically fetches data from the following API endpoints:

- `/api/reporting/sales-analytics` - Main analytics data
- `/api/sales-orders` - Sales order information
- `/api/customers` - Customer data
- `/api/quotations` - Quotation and conversion data

### Expected API Response Format

```typescript
interface SalesAnalyticsResponse {
  data: {
    metrics: {
      totalRevenue: number
      totalOrders: number
      averageOrderValue: number
      conversionRate: number
      newCustomers: number
      repeatCustomers: number
      salesGrowth: number
      targetAchievement: number
    }
    performance: {
      dailySales: Array<{
        date: string
        revenue: number
        orders: number
        averageOrderValue: number
      }>
      monthlySales: Array<{
        month: string
        revenue: number
        orders: number
        growth: number
      }>
      quarterlySales: Array<{
        quarter: string
        revenue: number
        orders: number
        growth: number
      }>
    }
    customers: {
      topCustomers: Array<{
        customerName: string
        totalRevenue: number
        orderCount: number
        loyalty: 'new' | 'regular' | 'vip'
      }>
    }
    products: {
      topSellingProducts: Array<{
        itemName: string
        quantitySold: number
        revenue: number
        categoryName: string
      }>
    }
    conversion: {
      leadToQuotation: {
        leadsGenerated: number
        quotationsCreated: number
        conversionRate: number
      }
      quotationToOrder: {
        quotationsSent: number
        ordersReceived: number
        conversionRate: number
      }
      orderToInvoice: {
        ordersApproved: number
        invoicesGenerated: number
        conversionRate: number
      }
      invoiceToPaid: {
        invoicesSent: number
        invoicesPaid: number
        conversionRate: number
        averageCollectionDays: number
      }
    }
  }
}
```

## Component Structure

```
components/sales/
├── charts.tsx          # Main charts component
├── index.ts            # Export file
└── README.md          # This documentation

lib/utils/
└── chart-utils.ts     # Chart utility functions
```

## Key Components

### 1. Metric Cards
- Display key performance indicators
- Show trend indicators (up/down/stable)
- Include target achievement progress bars
- Real-time value formatting

### 2. Interactive Charts
- **Line Charts**: Revenue trends over time
- **Bar Charts**: Product and customer performance
- **Pie Charts**: Category and segment distribution
- **Area Charts**: Stacked performance metrics
- **Funnel Visualization**: Sales pipeline conversion

### 3. Filter Panel
- Date range selection (daily/weekly/monthly/yearly)
- Custom date picker
- Customer and product filters
- Reset functionality

### 4. Export Controls
- PNG image export
- PDF report generation
- CSV data export
- Print-friendly layouts

## Customization

### Theme Support
```tsx
// Light/Dark theme toggle
const [theme, setTheme] = useState<'light' | 'dark'>('light')

// Custom color palettes
const COLORS = CHART_COLORS.primary // or secondary, gradient, monochrome
```

### Chart Configuration
```tsx
// Custom chart dimensions
const chartConfig = {
  width: '100%',
  height: 400,
  margin: { top: 20, right: 30, left: 20, bottom: 5 }
}

// Animation settings
const animationConfig = {
  duration: 1000,
  easing: 'ease-out'
}
```

### Data Formatting
```tsx
// Currency formatting
formatNumber(value, 'currency') // AED 1,234

// Percentage formatting
formatNumber(value, 'percentage') // 12.5%

// Number formatting
formatNumber(value, 'number') // 1,234
```

## Performance Considerations

### Data Loading
- Implements loading states and skeletons
- Batch API calls for efficiency
- Caching with automatic refresh intervals
- Error handling and retry logic

### Chart Rendering
- Uses ResponsiveContainer for optimal sizing
- Implements virtualization for large datasets
- Debounced filter updates
- Optimized re-rendering with useMemo and useCallback

### Memory Management
- Proper cleanup of event listeners
- Canvas cleanup after export operations
- Efficient data transformations
- Minimal re-renders

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

```json
{
  "recharts": "^2.x.x",
  "html2canvas": "^1.x.x",
  "jspdf": "^3.x.x",
  "papaparse": "^5.x.x",
  "date-fns": "^4.x.x",
  "lucide-react": "^0.x.x"
}
```

## Examples

### 1. Revenue Trend Analysis
```tsx
// The line chart automatically shows:
// - Revenue over time
// - Trend indicators
// - Interactive tooltips
// - Zoom and pan capabilities
```

### 2. Product Performance
```tsx
// Bar chart displays:
// - Top-selling products
// - Revenue by category
// - Growth indicators
// - Comparative analysis
```

### 3. Customer Segmentation
```tsx
// Pie chart shows:
// - Customer distribution by segment
// - Revenue per segment
// - Customer lifetime value
// - Retention rates
```

### 4. Sales Funnel
```tsx
// Funnel visualization includes:
// - Lead to quotation conversion
// - Quotation to order conversion
// - Order to invoice conversion
// - Invoice to payment conversion
```

## Troubleshooting

### Common Issues

1. **Charts not rendering**
   - Check if data is being fetched correctly
   - Verify API endpoint responses
   - Ensure all dependencies are installed

2. **Export not working**
   - Check browser permissions for downloads
   - Verify html2canvas and jsPDF are properly imported
   - Ensure adequate memory for large exports

3. **Performance issues**
   - Implement data pagination for large datasets
   - Use date range filters to limit data
   - Consider server-side aggregation

### Debug Mode
```tsx
// Enable debug mode for detailed logging
const DEBUG = process.env.NODE_ENV === 'development'

if (DEBUG) {
  console.log('Sales data:', salesData)
  console.log('Chart config:', chartConfig)
}
```

## Contributing

1. Follow the existing code structure
2. Add TypeScript types for new features
3. Include unit tests for new functionality
4. Update documentation for changes
5. Test across different screen sizes

## License

This component is part of the Enxi ERP system and follows the project's licensing terms.