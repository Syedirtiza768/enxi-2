# Inventory Charts Component

A comprehensive inventory analytics dashboard component that provides visual insights into inventory management.

## Location
- **Component**: `/components/inventory/charts.tsx`
- **Page**: `/app/(auth)/inventory/analytics/page.tsx`
- **Mock Data**: `/lib/utils/mock-inventory-data.ts`

## Features

### Chart Types
1. **Stock Levels Overview** - Bar chart showing current vs min/max stock levels
2. **Low Stock Alerts** - Pie chart categorizing items by stock status (critical/warning/ok)
3. **Inventory Value Distribution** - Donut chart showing value breakdown by category
4. **Stock Movement Trends** - Line chart tracking inbound vs outbound movements
5. **Category-wise Inventory** - Horizontal bar chart showing inventory by category
6. **ABC Analysis** - Scatter plot for value vs volume analysis

### Interactive Features
- **Date Range Filtering** - Custom date picker with quick select options
- **Category Filtering** - Multi-select category filter
- **Chart Visibility Toggle** - Show/hide individual charts
- **Export Functionality** - Download chart data as CSV
- **Real-time Refresh** - Manual data refresh capability
- **Responsive Design** - Works on all screen sizes

### Business Metrics Dashboard
- Total Inventory Value
- Items Below Reorder Point
- Stock Turnover Rate
- Active vs Total Items

## API Integration

### Required Endpoints
- `GET /api/inventory/reports/stock-summary` - Stock levels and summaries
- `GET /api/inventory/low-stock` - Low stock alerts
- `GET /api/inventory/valuation` - Inventory valuation by category
- `GET /api/inventory/stock-movements` - Stock movement history with aggregation
- `GET /api/inventory/reports/stock-value` - Individual item stock values

### Fallback Mechanism
When API endpoints are unavailable or return errors, the component automatically falls back to realistic mock data to ensure the dashboard remains functional for demonstration purposes.

## Usage

### Basic Implementation
```tsx
import InventoryCharts from '@/components/inventory/charts'

export default function AnalyticsPage() {
  return (
    <div>
      <InventoryCharts className="w-full" />
    </div>
  )
}
```

### Navigation
The analytics page is accessible via:
- URL: `/inventory/analytics`
- Navigation: Inventory → Analytics tab

## Technologies Used
- **Charts**: Recharts library for all visualizations
- **Date Handling**: date-fns for date manipulation
- **UI Components**: Custom UI components from the design system
- **Currency**: Integrated with the app's currency context
- **TypeScript**: Fully typed for better development experience

## Error Handling
- Individual API call failures don't break the entire dashboard
- Graceful fallback to mock data
- Loading states for better user experience
- Proper error boundaries

## Performance Optimizations
- Memoized calculations for filtered data
- Optimized re-renders with useCallback hooks
- Efficient data transformations
- Responsive chart containers

## Customization
The component can be easily customized by:
- Modifying color schemes in the COLORS constant
- Adding new chart types
- Adjusting filter options
- Extending export functionality

## Dependencies
- recharts: Chart visualization library
- date-fns: Date utility functions
- lucide-react: Icon components

This component provides a production-ready inventory analytics solution with comprehensive features and robust error handling.