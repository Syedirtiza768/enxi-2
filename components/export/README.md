# Advanced Excel Exporter

A comprehensive Excel export system for React applications with advanced features including multiple sheets, charts, formulas, conditional formatting, and business intelligence templates.

## Features

### Core Functionality
- ✅ Export data to Excel format (.xlsx)
- ✅ Multiple sheet support
- ✅ Custom formatting and styling
- ✅ Cell formatting (numbers, dates, currency)
- ✅ Column width auto-sizing
- ✅ Auto-filter and freeze panes

### Advanced Features
- ✅ Charts and graphs in Excel (Column, Bar, Line, Pie, Area, Scatter)
- ✅ Formulas and calculations
- ✅ Conditional formatting
- ✅ Data validation
- ✅ Headers and footers
- ✅ Company logo/branding support
- ✅ Password protection
- ✅ Page setup and print settings

### Data Processing
- ✅ Handle large datasets efficiently (up to 100k+ rows)
- ✅ Data transformation and filtering
- ✅ Custom column mapping
- ✅ Aggregation and grouping
- ✅ Progress tracking for large exports
- ✅ Background processing

### UI Components
- ✅ Export configuration dialog
- ✅ Template selection
- ✅ Progress indicators
- ✅ Download management
- ✅ Error handling and retry
- ✅ Export history

### Business Templates
- ✅ Financial reports template
- ✅ Inventory reports template
- ✅ Sales reports template
- ✅ Customer/supplier lists template
- ✅ Custom report builder

### Integration
- ✅ Connect with various data sources
- ✅ Background processing for large files
- 🔄 Email delivery options (planned)
- 🔄 Cloud storage integration (planned)

## Installation

The Excel exporter is already integrated into the Enxi ERP system. All required dependencies are included in the project.

## Quick Start

### Basic Usage

```tsx
import { ExcelExporter } from '@/components/export';

function MyComponent() {
  return (
    <ExcelExporter
      dataSource="/api/my-data"
      defaultColumns={[
        { key: 'id', label: 'ID', type: 'string', width: 10 },
        { key: 'name', label: 'Name', type: 'string', width: 25 },
        { key: 'amount', label: 'Amount', type: 'currency', width: 15 }
      ]}
      onExportComplete={(result) => {
        console.log('Export completed:', result.downloadUrl);
      }}
    />
  );
}
```

### Using the Hook

```tsx
import { useExcelExport } from '@/components/export';

function MyComponent() {
  const { exportToExcel, isExporting } = useExcelExport({
    onComplete: (result) => {
      console.log('Export completed:', result);
    }
  });

  const handleExport = async () => {
    const data = [
      { id: 1, name: 'John Doe', amount: 1000 },
      { id: 2, name: 'Jane Smith', amount: 1500 }
    ];

    const sheets = [{
      name: 'Data',
      data: data,
      columns: [
        { key: 'id', label: 'ID', type: 'string', width: 10 },
        { key: 'name', label: 'Name', type: 'string', width: 25 },
        { key: 'amount', label: 'Amount', type: 'currency', width: 15 }
      ],
      autoFilter: true,
      freezePanes: { row: 1 }
    }];

    await exportToExcel(data, sheets, 'my-export.xlsx');
  };

  return (
    <button onClick={handleExport} disabled={isExporting}>
      {isExporting ? 'Exporting...' : 'Export to Excel'}
    </button>
  );
}
```

## API Reference

### ExcelExporter Component

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dataSource` | `string \| (() => Promise<any[]>)` | - | Data source URL or function |
| `defaultColumns` | `ExcelColumnConfig[]` | `[]` | Default column configuration |
| `onExportComplete` | `(result: { downloadUrl: string; fileSize: number }) => void` | - | Callback when export completes |
| `onExportError` | `(error: string) => void` | - | Callback when export fails |
| `className` | `string` | - | CSS class name |
| `trigger` | `React.ReactNode` | - | Custom trigger element |
| `allowTemplateSelection` | `boolean` | `true` | Allow template selection |
| `allowCustomColumns` | `boolean` | `true` | Allow custom column configuration |
| `allowCharts` | `boolean` | `true` | Allow chart creation |
| `maxRows` | `number` | `100000` | Maximum rows to export |

### Column Configuration

```tsx
interface ExcelColumnConfig {
  key: string;                    // Data property key
  label: string;                  // Column header label
  type: 'string' | 'number' | 'date' | 'currency' | 'percentage' | 'formula';
  width?: number;                 // Column width
  style?: ExcelCellStyle;         // Cell styling
  format?: string;                // Number format
  formula?: string;               // Excel formula
  conditionalFormatting?: ExcelConditionalFormat[];
  dataValidation?: ExcelDataValidation;
  hidden?: boolean;               // Hide column
  frozen?: boolean;               // Freeze column
}
```

### Sheet Configuration

```tsx
interface ExcelSheet {
  name: string;                   // Sheet name
  data: any[];                    // Sheet data
  columns: ExcelColumnConfig[];   // Column configuration
  style?: {                       // Sheet styling
    headerStyle?: ExcelCellStyle;
    alternateRowStyle?: ExcelCellStyle;
    defaultStyle?: ExcelCellStyle;
  };
  charts?: ExcelChart[];          // Charts to include
  images?: ExcelImageDefinition[]; // Images to include
  pageSetup?: {                   // Page setup
    orientation?: 'portrait' | 'landscape';
    paperSize?: string;
    margins?: { left: number; right: number; top: number; bottom: number };
    header?: string;
    footer?: string;
  };
  protection?: {                  // Sheet protection
    sheet?: boolean;
    password?: string;
    allowedActions?: string[];
  };
  autoFilter?: boolean;           // Enable auto-filter
  freezePanes?: {                 // Freeze panes
    row?: number;
    col?: number;
  };
}
```

### Chart Configuration

```tsx
interface ExcelChart {
  type: 'column' | 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'combo';
  title: string;                  // Chart title
  dataRange: string;              // Data range (e.g., "A1:C10")
  position: {                     // Chart position
    col: number;
    row: number;
    colOffset?: number;
    rowOffset?: number;
  };
  size?: {                        // Chart size
    width: number;
    height: number;
  };
  series?: Array<{                // Data series
    name: string;
    values: string;
    categories?: string;
  }>;
  options?: {                     // Chart options
    showLegend?: boolean;
    showDataLabels?: boolean;
    gridlines?: boolean;
    theme?: string;
  };
}
```

## Templates

### Pre-built Templates

1. **Financial Report**
   - Revenue, expenses, and profit analysis
   - Multiple sheets with summaries
   - Charts for trend analysis

2. **Inventory Analysis**
   - Stock levels and valuation
   - Low stock alerts
   - Category-wise analysis

3. **Sales Performance**
   - Customer and product breakdowns
   - Sales trends and patterns
   - Regional analysis

4. **Customer Analysis**
   - Demographics and segmentation
   - Spending patterns
   - Lifetime value analysis

### Custom Templates

You can create custom templates by defining the sheet structure:

```tsx
const customTemplate: ExcelTemplate = {
  id: 'custom-report',
  name: 'Custom Report',
  description: 'My custom report template',
  category: 'custom',
  sheets: [
    {
      name: 'Data',
      data: [],
      columns: [
        { key: 'date', label: 'Date', type: 'date', width: 12 },
        { key: 'amount', label: 'Amount', type: 'currency', width: 15 },
        { key: 'cumulative', label: 'Cumulative', type: 'currency', width: 15, formula: '=SUM(B$2:B{row})' }
      ],
      charts: [
        {
          type: 'line',
          title: 'Trend Analysis',
          dataRange: 'A1:B100',
          position: { col: 5, row: 2 }
        }
      ]
    }
  ]
};
```

## Advanced Features

### Conditional Formatting

```tsx
const conditionalFormatting: ExcelConditionalFormat[] = [
  {
    type: 'cellValue',
    operator: 'greaterThan',
    value1: 1000,
    format: {
      fill: { type: 'pattern', pattern: 'solid', fgColor: 'GREEN' }
    }
  },
  {
    type: 'colorScale',
    colorScale: {
      minColor: 'RED',
      midColor: 'YELLOW',
      maxColor: 'GREEN'
    }
  }
];
```

### Data Validation

```tsx
const dataValidation: ExcelDataValidation = {
  type: 'list',
  formula1: '"Option1,Option2,Option3"',
  showDropdown: true,
  errorTitle: 'Invalid Selection',
  errorMessage: 'Please select from the dropdown list'
};
```

### Formulas

```tsx
const columns: ExcelColumnConfig[] = [
  { key: 'quantity', label: 'Quantity', type: 'number' },
  { key: 'price', label: 'Price', type: 'currency' },
  { 
    key: 'total', 
    label: 'Total', 
    type: 'formula',
    formula: '=A{row}*B{row}' // {row} will be replaced with actual row number
  }
];
```

## Performance Considerations

### Large Datasets

- The exporter can handle up to 100,000+ rows efficiently
- Background processing is enabled by default for large exports
- Progress tracking keeps users informed during long operations
- Memory usage is optimized through streaming processing

### Optimization Tips

1. **Limit Columns**: Only include necessary columns to reduce file size
2. **Use Compression**: Enable compression for smaller file sizes
3. **Batch Processing**: For very large datasets, consider splitting into multiple exports
4. **Background Processing**: Enable for exports with >1000 rows

## Error Handling

The exporter includes comprehensive error handling:

- Network errors for data fetching
- Memory limitations for large datasets
- Invalid data format errors
- Excel generation errors
- Download failures

All errors are captured and reported through the `onExportError` callback.

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Examples

See the `ExcelExportExamples` component for comprehensive examples of all features.

## Troubleshooting

### Common Issues

1. **Large file export fails**
   - Reduce the number of rows or columns
   - Enable background processing
   - Check browser memory limits

2. **Charts not appearing**
   - Ensure chart data range is valid
   - Check chart position doesn't overlap with data
   - Verify chart type is supported

3. **Formulas not calculating**
   - Check formula syntax
   - Ensure cell references are correct
   - Use `{row}` placeholder for dynamic row references

4. **Styling not applied**
   - Verify style object structure
   - Check color codes are valid
   - Ensure style is applied to correct cells

## Contributing

To extend the Excel exporter:

1. Add new chart types in `ExcelChartDefinition`
2. Extend column types in `ExcelColumnConfig`
3. Add new templates in the templates array
4. Enhance styling options in `ExcelCellStyle`

## License

This component is part of the Enxi ERP system and follows the project's licensing terms.