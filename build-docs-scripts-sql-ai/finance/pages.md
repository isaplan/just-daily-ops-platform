# Finance Pages

Complete list of all Finance pages, their purpose, and implementation details.

## Main Pages

### Finance Dashboard
**Path**: `/finance`  
**File**: `src/app/(dashboard)/finance/page.tsx`  
**Purpose**: Main finance dashboard with KPIs, revenue trends, and analytics  
**Components Used**:
- `PeriodSelector`
- `RevenueKpiCard`
- `RevenueTrendChart`
- `SalesIntelligenceCard`

**Data Sources**:
- Revenue data via `useRevenueData` hook
- Sales intelligence via `useSalesIntelligence` hook

---

### Profit & Loss (Main)
**Path**: `/finance/pnl`  
**File**: `src/app/(dashboard)/finance/pnl/page.tsx`  
**Purpose**: P&L analysis page with category filters and trend analysis  
**Features**:
- Category filtering
- Date range selection
- Location filtering
- Trend charts

**Data Sources**:
- Uses `usePnLByCategory` hook
- Queries aggregated P&L data

---

### P&L Balance
**Path**: `/finance/pnl/balance`  
**File**: `src/app/(dashboard)/finance/pnl/balance/page.tsx`  
**Purpose**: Monthly P&L balance table with expandable COGS categories  
**Key Features**:
- Monthly breakdown (Jan-Dec)
- Expandable/collapsible categories
- Year and location filters
- Internationalization (EN/NL)

**Data Flow**:
1. Fetches from `/api/finance/pnl-aggregated-data`
2. Maps `powerbi_pnl_aggregated` table columns to display format
3. No calculations - data is pre-aggregated

**Components**:
- `LanguageSwitcher` for i18n
- Custom table with expand/collapse

**Categories Displayed**:
- Netto-omzet groepen (Revenue Groups)
- Kostprijs van de omzet (Cost of Sales)
- Arbeidskosten (Labor Costs)
- Overige bedrijfskosten (Other Costs)
- Afschrijvingen (Depreciation)
- Financiële baten en lasten (Financial)
- Resultaat (Result)

---

### PowerBI Import
**Path**: `/finance/imports/powerbi-import`  
**File**: `src/app/(dashboard)/finance/imports/powerbi-import.tsx`  
**Purpose**: Import PowerBI Excel files containing P&L data  
**Features**:
- Drag & drop file upload
- Automatic location detection
- File validation
- Bulk import

**Data Flow**:
1. User uploads Excel file
2. File is parsed using XLSX library
3. Location detected from filename or manually selected
4. Data uploaded to `powerbi_pnl_data` table
5. Aggregation can be triggered separately

---

### Daily Operations
**Path**: `/finance/daily-ops`  
**File**: `src/app/(dashboard)/finance/daily-ops/page.tsx`  
**Purpose**: Daily operations insights and KPIs  
**Sub-pages**:
- `/finance/daily-ops/kpis` - KPI dashboard
- `/finance/daily-ops/trends` - Trend analysis
- `/finance/daily-ops/productivity` - Productivity metrics
- `/finance/daily-ops/insights` - AI-powered insights

---

### Labor Analytics
**Path**: `/finance/labor`  
**File**: `src/app/(dashboard)/finance/labor/page.tsx`  
**Purpose**: Labor cost analysis and efficiency metrics  

---

### Sales Analytics
**Path**: `/finance/sales`  
**File**: `src/app/(dashboard)/finance/sales/page.tsx`  
**Purpose**: Sales analysis and trends  

---

### Eitje API Integration
**Path**: `/finance/eitje-api`  
**File**: `src/app/(dashboard)/finance/eitje-api/page.tsx`  
**Purpose**: Eitje API connection and data sync  

---

### Bork API Integration
**Path**: `/finance/bork-api`  
**File**: `src/app/(dashboard)/finance/bork-api/page.tsx`  
**Purpose**: Bork API connection and master data sync  

---

### Data Imports
**Path**: `/finance/imports`  
**File**: `src/app/(dashboard)/finance/imports/page.tsx`  
**Purpose**: General data import interface  

---

### Simple Import
**Path**: `/finance/simple-import`  
**File**: `src/app/(dashboard)/finance/simple-import/page.tsx`  
**Purpose**: Simplified import interface  

---

### Real Sync
**Path**: `/finance/real-sync`  
**File**: `src/app/(dashboard)/finance/real-sync/page.tsx`  
**Purpose**: Real-time data synchronization  

## Page Relationships

```
Finance Dashboard (/finance)
├── Profit & Loss (/finance/pnl)
│   └── P&L Balance (/finance/pnl/balance) ⭐ PRIMARY P&L VIEW
├── Daily Operations (/finance/daily-ops)
├── Labor (/finance/labor)
├── Sales (/finance/sales)
└── Imports
    └── PowerBI Import (/finance/imports/powerbi-import) ⭐ DATA SOURCE
```

## Navigation Structure

All finance pages are accessible from:
- **Sidebar**: Finance section menu
- **Dashboard**: Quick links and cards
- **Breadcrumbs**: Hierarchical navigation

## Internationalization

All finance pages support:
- **English (EN)**: Default language
- **Dutch (NL)**: Primary language for Dutch horeca company

Language switcher available on pages with i18n support.

