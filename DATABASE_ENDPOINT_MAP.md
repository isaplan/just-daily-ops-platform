# Database & Endpoint Map

## P&L (Profit & Loss) Databases

### Raw Data Tables

#### `powerbi_pnl_data`
- **Purpose**: Raw line-item P&L data from PowerBI imports
- **Structure**: 
  - `category` (TEXT) - Main category name (e.g., "Lonen en salarissen")
  - `subcategory` (TEXT) - Subcategory name (optional)
  - `gl_account` (TEXT) - GL account code/name
  - `amount` (DECIMAL) - Amount (positive for revenue, negative for costs)
  - `year`, `month`, `location_id`, `import_id`
- **Usage**: Source data for aggregation; not recommended for direct queries in UI
- **Endpoint**: `/api/finance/pnl-data?year=2025&location=all`

### Aggregated Tables

#### `powerbi_pnl_aggregated`
- **Purpose**: Pre-calculated monthly aggregated P&L data with main COGS categories
- **Calculation Formula**: `Resultaat = Revenue - Cost of Sales - Labor Cost - Other Costs`
- **Structure**:
  - **Summary COGS** (high-level):
    - `revenue_food`, `revenue_beverage`, `revenue_total`
    - `cost_of_sales_food`, `cost_of_sales_beverage`, `cost_of_sales_total`
    - `labor_contract`, `labor_flex`, `labor_total`
    - `other_costs_total`, `opbrengst_vorderingen`, `resultaat`
  - **Detailed COGS** (granular):
    - Revenue: `netto_omzet_uit_levering_geproduceerd`, `netto_omzet_verkoop_handelsgoederen`
    - Costs: `inkoopwaarde_handelsgoederen`, `lonen_en_salarissen`, `huisvestingskosten`, `exploitatie_kosten`, `verkoop_kosten`, `autokosten`, `kantoorkosten`, `assurantiekosten`, `accountantskosten`, `administratieve_lasten`, `andere_kosten`, `afschrijvingen`, `financiele_baten_lasten`
  - Metadata: `location_id`, `year`, `month`, `import_id`, `created_at`, `updated_at`, `aggregated_at`
- **Unique Constraint**: `(location_id, year, month)`
- **Endpoint**: `/api/finance/pnl-aggregated-data?year=2025&location=all&month=1`
- **Usage**: **PRIMARY SOURCE** for P&L Balance page - no calculations needed!

#### `powerbi_pnl_aggregated_subcategories`
- **Purpose**: Detailed subcategory breakdowns linked to aggregated records
- **Structure**:
  - `aggregated_id` (UUID) - References `powerbi_pnl_aggregated(id)`
  - `main_category` (TEXT) - Main COGS category (e.g., "Revenue Food", "Cost of Sales Beverage")
  - `subcategory` (TEXT) - Subcategory name (e.g., "Omzet snacks (btw laag)")
  - `gl_account` (TEXT) - GL account name
  - `amount` (NUMERIC) - Amount for this subcategory
- **Unique Constraint**: `(aggregated_id, subcategory)`
- **Endpoint**: `/api/finance/pnl-aggregated-subcategories?aggregated_id=...`
- **Usage**: For detailed breakdowns when main category is expanded

#### `powerbi_pnl_aggregated_data`
- **Purpose**: Alternative aggregated table (may be deprecated in favor of `powerbi_pnl_aggregated`)
- **Structure**: Similar to `powerbi_pnl_aggregated` but with different column names
- **Note**: Check which table is actively used in production

#### `pnl_line_items`
- **Purpose**: Processed line items with category hierarchy
- **Structure**: `category_level_1`, `category_level_2`, `category_level_3`, `gl_account`, `amount`
- **Usage**: For hierarchical category analysis

#### `pnl_monthly_summary`
- **Purpose**: Monthly summary totals
- **Structure**: `total_revenue`, `total_costs`, `gross_profit`, `operating_expenses`, `net_profit`
- **Usage**: Quick monthly overviews

## COGS Calculation Structure

### Formula: `Resultaat = Revenue - COST_OF_SALES - LABOR_COST - OTHER_UNDEFINED_COGS`

### REVENUE CALCULATIONS (all incomes, positive values)
- **Netto Omzet** = 
  - **Netto Omzet Uit Levering Geproduceerd** (= Omzet Snacks + Omzet Lunch + Omzet Diner + Omzet Menu + Omzet Keuken)
  - **+ Netto Omzet Verkoop Handelsgoederen** (= Omzet wijnen + Gedestilleerd + Cocktails + Cider + Speciaal fles + Speciaal bier tap + tap pilsner + koffie + frisdranken + alcohol vrij + laag overig)
- **Note**: All revenue items have VAT (high or low) - need to track VAT type

### COST OF SALES COGS (all costs, negative values)
- **Totaal Cost of Sales** = **Inkoopwaarde Handelsgoederen**
  - (= Bier fles + sterke dranken + wijnen + bar overig hoog + bar overig laag + speciaal bier fles + speciaal bier tap + pilsner tap + koffie + frisdrank + bieren + alcohol vrije + keuken hoog + keuken laag)
- **Note**: All cost items have VAT (high or low) - need to track VAT type

### LABOR COST COGS (all costs, negative values)
- **Arbeidskosten** (Total Labor Costs) =
  - **Contract Arbeid** (Contract Labor) =
    - **Contract Keuken** = Bruto Salaris Keuken + Doorberekende Loonkosten Keuken + Mutatie Reservering Vakantie Toeslag Keuken + Mutatie Reservering Vakantie Dagen Keuken + Onkostenvergoeding Keuken + Werkgeversdeel Keuken
    - **+ Contract Bediening** = Bruto Salaris Bediening + Doorberekende Loonkosten Bediening + Mutatie Reservering Vakantie Toeslag Bediening + Mutatie Reservering Vakantie Dagen Bediening + Onkostenvergoeding Bediening + Werkgeversdeel Bediening
  - **+ Contract Flex** =
    - Inhuur Keuken = Inhuur Keuken
    - **+ Inhuur Bediening** = Inhuur Stewarding + Inhuur F&B
  - **+ Kosten Overhead** = Inhuur Overhead + Loonkosten Overhead
  - **+ Overige Kosten** = Alle overige Lonen & Salaris gerelateerd kosten

### OTHER_UNDEFINED COGS (all costs, negative values)
- = (Sum of all Remaining COGS that are Not related to Revenue or Cost Of Sales or Labor Cost)
- **+ Undefined COGS** (All Cogs you see but can't added to Category But do Have A Value)

## API Endpoints

### P&L Data Endpoints

#### `GET /api/finance/pnl-data`
- **Purpose**: Fetch raw P&L data from `powerbi_pnl_data`
- **Params**: `year`, `location` (default: 'all')
- **Returns**: Raw line items with category, subcategory, gl_account, amount
- **Note**: **NOT RECOMMENDED** for UI - use aggregated instead

#### `GET /api/finance/pnl-aggregated-data`
- **Purpose**: Fetch pre-calculated aggregated P&L data
- **Params**: `year`, `location` (default: 'all'), `month` (optional)
- **Returns**: Aggregated records from `powerbi_pnl_aggregated`
- **Usage**: **PRIMARY ENDPOINT** for P&L Balance page

#### `GET /api/finance/pnl-aggregated-subcategories`
- **Purpose**: Fetch subcategory details for a specific aggregated record
- **Params**: `aggregated_id`
- **Returns**: Subcategory breakdowns from `powerbi_pnl_aggregated_subcategories`
- **Usage**: When user expands a main category to see details

#### `POST /api/finance/pnl-aggregate`
- **Purpose**: Trigger aggregation of raw data into aggregated tables
- **Body**: `{ locationId, year, month, aggregateAll? }`
- **Returns**: Aggregation results
- **Usage**: Admin/import process only

#### `GET /api/finance/pnl-revenue`
- **Purpose**: Get revenue-specific data
- **Returns**: Revenue breakdowns

### Other Data Endpoints

#### `GET /api/raw-data?table=<table_name>`
- **Purpose**: Generic endpoint to fetch raw data from any table
- **Params**: `table` (table name), `limit`, filters
- **Usage**: For debugging or custom queries

#### `GET /api/locations`
- **Purpose**: Fetch all locations
- **Returns**: Location list with IDs

## Labor Data (Eitje)

### Tables
- `eitje_labor_hours` - Raw labor hour records
- `eitje_labor_hours_aggregated` - Aggregated labor data
- `eitje_productivity_data` - Productivity metrics

### Endpoints
- `/api/eitje/aggregate` - Aggregate labor hours
- `/api/eitje/data` - Fetch labor data
- `/api/eitje/raw-data` - Fetch raw labor records

## Sales Data (Bork)

### Tables
- `bork_sales_data` - Raw sales transactions
- Sales aggregated tables (check migrations)

### Endpoints
- `/api/bork/sync` - Sync Bork API data
- `/api/bork/master-sync` - Master data sync
- `/api/sales/aggregated` - Get aggregated sales data

## Best Practices

1. **ALWAYS use aggregated tables** for UI display - never calculate on the fly
2. **Use `powerbi_pnl_aggregated`** as the primary source for P&L Balance page
3. **Use `powerbi_pnl_aggregated_subcategories`** for detailed breakdowns
4. **Only query `powerbi_pnl_data`** for aggregation processes, not UI
5. **Check VAT types** (high/low) when displaying revenue and cost items
6. **Follow the COGS hierarchy** as defined in the calculation structure above

