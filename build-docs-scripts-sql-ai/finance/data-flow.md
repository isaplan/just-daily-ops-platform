# Finance Data Flow

Complete data flow documentation for the Finance domain.

## 🔄 Overview Flow

```
PowerBI Excel File
    ↓
[PowerBI Import Page]
    ↓
powerbi_pnl_data (Raw Data)
    ↓
[Aggregation Service]
    ↓
powerbi_pnl_aggregated (Pre-calculated)
    ↓
[API Endpoints]
    ↓
[Pages/Components]
    ↓
User Display
```

## 📥 Import Flow

### Step 1: File Upload
**Component**: `src/app/(dashboard)/finance/imports/powerbi-import.tsx`

1. User uploads Excel file via drag & drop or file input
2. File is parsed using `XLSX` library
3. Location is detected from filename or manually selected
4. File metadata is extracted (record count, type)

### Step 2: Data Processing
**Service**: `src/lib/finance/powerbi/` orchestrators and extractors

1. Excel sheets are analyzed for structure
2. Columns are mapped to database fields
3. Data is validated and normalized
4. Location matching occurs (filename or manual)

### Step 3: Database Insertion
**Table**: `powerbi_pnl_data`

Raw data is inserted with:
- `category` - Main category (e.g., "Lonen en salarissen")
- `subcategory` - Subcategory (optional)
- `gl_account` - GL account code/name
- `amount` - Amount (positive for revenue, negative for costs)
- `year`, `month`, `location_id`, `import_id`

## 🔄 Aggregation Flow

### Trigger
Aggregation can be triggered:
- **Manually**: Via `/api/finance/pnl-aggregate` POST endpoint
- **Automatically**: During import process (if configured)

### Process
**Service**: `src/lib/finance/powerbi/aggregation-service.ts`

1. **Read Raw Data**: Query `powerbi_pnl_data` filtered by location, year, month
2. **Categorize**: Map GL accounts to COGS categories
3. **Calculate**:
   - Revenue totals (food, beverage, total)
   - Cost of Sales totals
   - Labor costs (contract, flex, total)
   - Other costs
   - Resultaat = Revenue - Costs
4. **Store**: Insert/update `powerbi_pnl_aggregated`

### Output Table
**Table**: `powerbi_pnl_aggregated`

Pre-calculated columns:
- `revenue_total`, `revenue_food`, `revenue_beverage`
- `cost_of_sales_total`
- `labor_total`, `labor_contract`, `labor_flex`
- `other_costs_total`
- `resultaat`

**Subcategory Details**: Stored in `powerbi_pnl_aggregated_subcategories`

## 📤 Display Flow

### P&L Balance Page
**Page**: `src/app/(dashboard)/finance/pnl/balance/page.tsx`

1. **API Call**: `GET /api/finance/pnl-aggregated-data?year=2025&location=all`
2. **Data Mapping**: `mapAggregatedToDisplay()` function
   - Maps aggregated columns to display categories
   - Groups by month
   - Sums across locations if `location='all'`
3. **Render**: Table with expandable/collapsible rows

### Other Pages
- **P&L Analysis**: Uses aggregated data with filters
- **Dashboard**: Uses aggregated data for KPIs

## 🔍 Data Transformation Details

### Revenue Calculation
```
Netto Omzet = 
  Netto Omzet Uit Levering Geproduceerd +
  Netto Omzet Verkoop Handelsgoederen
```

**Source Columns**:
- `netto_omzet_uit_levering_geproduceerd`
- `netto_omzet_verkoop_handelsgoederen`

### Labor Cost Calculation
```
Arbeidskosten = Contract Arbeid + Flex Arbeid + Overige Arbeid
```

**Source Columns**:
- `labor_contract` → Contract Arbeid
- `labor_flex` → Flex Arbeid
- `labor_total` → Arbeidskosten (total)

### Result Calculation
```
Resultaat = Revenue - Cost of Sales - Labor Cost - Other Costs
```

**Already calculated** in `powerbi_pnl_aggregated.resultaat` column.

## 📊 Subcategory Details Flow

When user expands a category:

1. **Fetch Subcategories**: `GET /api/finance/pnl-aggregated-subcategories?aggregated_id=...`
2. **Query Table**: `powerbi_pnl_aggregated_subcategories`
3. **Filter**: By `aggregated_id` and optionally `main_category`
4. **Display**: List of subcategories with amounts

## 🔐 Data Access Flow

### Authentication
- All API endpoints require authentication
- Row Level Security (RLS) enabled on tables
- Users can only access their authorized locations

### Caching
- Aggregated data is cached in database (no real-time calculation)
- Pages use React Query for client-side caching
- Data refreshed on filter changes

## 🚨 Error Handling

### Import Errors
- Invalid file format → User notification
- Location not found → Manual selection required
- Database errors → Error logged, user notified

### Aggregation Errors
- Missing data → Logged, partial aggregation possible
- Calculation errors → Validation errors returned

### Display Errors
- API failures → Error message shown to user
- Missing data → Empty state displayed
- Validation errors → Warning badges shown

## 🔄 Sync Process

### Manual Sync
1. User uploads new PowerBI file
2. Data imported to `powerbi_pnl_data`
3. User triggers aggregation manually
4. Aggregated data updated

### Automated Sync (Future)
- Scheduled aggregation jobs
- Real-time updates on import
- Background processing queue

## 📈 Performance Considerations

### Optimization
- **Aggregation**: Done once, stored permanently
- **Pagination**: Used for large datasets
- **Indexing**: Tables indexed on `location_id`, `year`, `month`
- **Caching**: React Query caches API responses

### Scalability
- Aggregation can run in background
- Multiple months can be aggregated in parallel
- Subcategory details loaded on-demand

