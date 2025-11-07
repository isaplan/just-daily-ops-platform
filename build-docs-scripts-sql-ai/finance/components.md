# Finance Components

Complete list of Finance-specific React components.

## 📦 Component Categories

### Data Display Components

#### `RevenueKpiCard`
**File**: `src/components/finance/RevenueKpiCard.tsx`  
**Purpose**: Display revenue KPI metrics  
**Props**:
- `revenue`: Revenue amount
- `change`: Percentage change
- `period`: Period label

**Usage**: Finance dashboard

---

#### `RevenueTrendChart`
**File**: `src/components/finance/RevenueTrendChart.tsx`  
**Purpose**: Line chart showing revenue trends over time  
**Props**:
- `data`: Chart data points
- `period`: Time period

**Usage**: Finance dashboard, P&L pages

---

#### `CategoryBreakdown`
**File**: `src/components/finance/CategoryBreakdown.tsx`  
**Purpose**: Breakdown of categories with percentages  
**Usage**: P&L analysis page

---

#### `COGSBreakdown`
**File**: `src/components/finance/COGSBreakdown.tsx`  
**Purpose**: Cost of Goods Sold breakdown visualization  
**Usage**: P&L analysis

---

### Filter & Selection Components

#### `PeriodSelector`
**File**: `src/components/finance/PeriodSelector.tsx`  
**Purpose**: Select time period (week, month, quarter, year)  
**Props**:
- `value`: Current period
- `onChange`: Change handler
- `periods`: Available periods

**Usage**: Finance dashboard, P&L pages

---

#### `CategoryFilterSheet`
**File**: `src/components/finance/CategoryFilterSheet.tsx`  
**Purpose**: Side sheet for filtering categories  
**Features**:
- Hierarchical category selection
- Multi-select with checkboxes
- Category groups (Revenue, COGS, Labor, etc.)

**Usage**: P&L analysis page

---

#### `LocationMultiSelect`
**File**: `src/components/finance/LocationMultiSelect.tsx`  
**Purpose**: Multi-select dropdown for locations  
**Usage**: Filter components

---

#### `SmartPeriodSelector`
**File**: `src/components/finance/SmartPeriodSelector.tsx`  
**Purpose**: Advanced period selector with date range  
**Usage**: Analytics pages

---

#### `AdvancedPeriodSelector`
**File**: `src/components/finance/AdvancedPeriodSelector.tsx`  
**Purpose**: Enhanced period selector with custom ranges  
**Usage**: Advanced filtering

---

### Import & Data Management Components

#### `PowerBIImport`
**File**: `src/app/(dashboard)/finance/imports/powerbi-import.tsx`  
**Purpose**: PowerBI Excel file import interface  
**Features**:
- Drag & drop upload
- Location detection
- File validation
- Bulk import

**Usage**: `/finance/imports/powerbi-import` page

---

#### `UniversalFileUpload`
**File**: `src/components/finance/UniversalFileUpload.tsx`  
**Purpose**: Universal file upload component  
**Usage**: Various import pages

---

#### `SimpleDataImport`
**File**: `src/components/finance/SimpleDataImport.tsx`  
**Purpose**: Simplified data import interface  
**Usage**: Quick import pages

---

#### `ImportHistory`
**File**: `src/components/finance/ImportHistory.tsx`  
**Purpose**: Display import history and status  
**Usage**: Import management pages

---

### Data Table & Display Components

#### `DataTable`
**File**: `src/components/finance/DataTable.tsx`  
**Purpose**: Generic data table component  
**Usage**: Data viewing pages

---

#### `PaginatedDataDisplay`
**File**: `src/components/finance/PaginatedDataDisplay.tsx`  
**Purpose**: Paginated table with sorting/filtering  
**Usage**: Large dataset displays

---

#### `PreviewTable`
**File**: `src/components/finance/PreviewTable.tsx`  
**Purpose**: Preview table for import validation  
**Usage**: Import wizards

---

### Chart Components

#### `FlexibleMetricChart`
**File**: `src/components/finance/FlexibleMetricChart.tsx`  
**Purpose**: Flexible chart for various metrics  
**Usage**: Dashboard, analytics pages

---

#### `RevenueChart`
**File**: `src/components/finance/RevenueChart.tsx`  
**Purpose**: Revenue-specific chart  
**Usage**: Revenue analysis

---

#### `InteractiveMetricChart`
**File**: `src/components/finance/InteractiveMetricChart.tsx`  
**Purpose**: Interactive chart with tooltips  
**Usage**: Analytics pages

---

#### `FinanceRevenueTrendChart`
**File**: `src/components/finance/FinanceRevenueTrendChart.tsx`  
**Purpose**: Finance-specific revenue trend chart  
**Usage**: Finance dashboard

---

#### `FinanceLocationComparisonChart`
**File**: `src/components/finance/FinanceLocationComparisonChart.tsx`  
**Purpose**: Compare revenue across locations  
**Usage**: Comparison analysis

---

#### `sales-by-category-chart`
**File**: `src/components/finance/sales-by-category-chart.tsx`  
**Purpose**: Sales breakdown by category  
**Usage**: Sales analysis

---

#### `profit-loss-chart`
**File**: `src/components/finance/profit-loss-chart.tsx`  
**Purpose**: Profit & Loss visualization  
**Usage**: P&L pages

---

### API Integration Components

#### `BorkApiConfiguration`
**File**: `src/components/finance/BorkApiConfiguration.tsx`  
**Purpose**: Configure Bork API connection  
**Usage**: Bork API setup page

---

#### `BorkApiConnectionTest`
**File**: `src/components/finance/BorkApiConnectionTest.tsx`  
**Purpose**: Test Bork API connection  
**Usage**: API testing pages

---

#### `BorkMasterSync`
**File**: `src/components/finance/BorkMasterSync.tsx`  
**Purpose**: Sync master data from Bork API  
**Usage**: Bork sync pages

---

#### `EitjeApiConfiguration`
**File**: `src/components/finance/EitjeApiConfiguration.tsx`  
**Purpose**: Configure Eitje API connection  
**Usage**: Eitje setup pages

---

#### `ApiCleanSlateTabs`
**File**: `src/components/finance/ApiCleanSlateTabs.tsx`  
**Purpose**: Tabbed interface for API management  
**Usage**: API management pages

---

### Data Processing Components

#### `DataMapping`
**File**: `src/components/finance/DataMapping.tsx`  
**Purpose**: Map imported columns to database fields  
**Usage**: Import wizards

---

#### `ColumnMapper`
**File**: `src/components/finance/ColumnMapper.tsx`  
**Purpose**: Visual column mapping interface  
**Usage**: Import setup

---

#### `UniversalMappingDialog`
**File**: `src/components/finance/UniversalMappingDialog.tsx`  
**Purpose**: Dialog for universal field mapping  
**Usage**: Import flows

---

#### `SchemaResolverDialog`
**File**: `src/components/finance/SchemaResolverDialog.tsx`  
**Purpose**: Resolve schema conflicts  
**Usage**: Schema matching

---

#### `DataValidation`
**File**: `src/components/finance/DataValidation.tsx`  
**Purpose**: Validate imported data  
**Usage**: Import validation

---

#### `CalculationSheet`
**File**: `src/components/finance/CalculationSheet.tsx`  
**Purpose**: Display calculation breakdown  
**Usage**: Calculation views

---

### Utility Components

#### `DataFilters`
**File**: `src/components/finance/DataFilters.tsx`  
**Purpose**: Generic data filtering interface  
**Usage**: Filter panels

---

#### `DataAccessTest`
**File**: `src/components/finance/DataAccessTest.tsx`  
**Purpose**: Test database access  
**Usage**: Debugging pages

---

#### `RawResponseViewer`
**File**: `src/components/finance/RawResponseViewer.tsx`  
**Purpose**: View raw API responses  
**Usage**: API testing, debugging

---

#### `DatabaseStorage`
**File**: `src/components/finance/DatabaseStorage.tsx`  
**Purpose**: Manage database storage  
**Usage**: Storage management

---

#### `RawDataStorage`
**File**: `src/components/finance/RawDataStorage.tsx`  
**Purpose**: Manage raw data storage  
**Usage**: Data management

---

### AI & Intelligence Components

#### `FinanceAIChatbot`
**File**: `src/components/finance/FinanceAIChatbot.tsx`  
**Purpose**: AI chatbot for finance queries  
**Usage**: AI assistant pages

---

#### `FinancialChatSidepanel`
**File**: `src/components/finance/FinancialChatSidepanel.tsx`  
**Purpose**: Side panel AI chat  
**Usage**: Embedded AI assistant

---

#### `SalesIntelligenceCard`
**File**: `src/components/finance/SalesIntelligenceCard.tsx`  
**Purpose**: AI-powered sales insights  
**Usage**: Finance dashboard

---

## 🔗 Component Relationships

### Import Flow Components
```
UniversalFileUpload
    ↓
DataMapping / ColumnMapper
    ↓
DataValidation
    ↓
PreviewTable
    ↓
ImportHistory
```

### Display Flow Components
```
PeriodSelector + LocationMultiSelect
    ↓
[API Data Fetch]
    ↓
RevenueChart / CategoryBreakdown
    ↓
PaginatedDataDisplay
```

## 📝 Component Best Practices

1. **Reusability**: Components are designed to be reusable across pages
2. **Type Safety**: All components use TypeScript interfaces
3. **Props Validation**: Required props are clearly documented
4. **Error Handling**: Components handle errors gracefully
5. **Loading States**: All async components show loading indicators

## 🎨 Styling

Components use:
- **Tailwind CSS**: Utility-first styling
- **Shadcn UI**: Base component library
- **Lucide Icons**: Icon library

