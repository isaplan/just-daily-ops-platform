# Finance API Endpoints

Complete reference for all Finance-related API endpoints.

## 📡 Base URL

All endpoints are prefixed with `/api/finance/`

## 🔍 P&L Data Endpoints

### `GET /api/finance/pnl-data`
**Purpose**: Fetch raw P&L data from `powerbi_pnl_data` table

**Query Parameters**:
- `year` (required): Year (2020-2030)
- `location` (optional): Location UUID or 'all' (default: 'all')

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "category": "Lonen en salarissen",
      "subcategory": null,
      "gl_account": "GL001",
      "amount": -15000.00,
      "month": 1,
      "location_id": "uuid",
      "year": 2025,
      "import_id": "uuid"
    }
  ],
  "meta": {
    "year": 2025,
    "location": "all",
    "recordCount": 384,
    "isLiveData": true
  }
}
```

**Note**: ⚠️ **NOT RECOMMENDED** for UI - use aggregated endpoint instead

**File**: `src/app/api/finance/pnl-data/route.ts`

---

### `GET /api/finance/pnl-aggregated-data` ⭐ **PRIMARY ENDPOINT**
**Purpose**: Fetch pre-calculated aggregated P&L data

**Query Parameters**:
- `year` (required): Year (2020-2030)
- `location` (optional): Location UUID or 'all' (default: 'all')
- `month` (optional): Specific month (1-12)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "location_id": "uuid",
      "year": 2025,
      "month": 1,
      "revenue_total": 479208.00,
      "netto_omzet_uit_levering_geproduceerd": 135038.00,
      "netto_omzet_verkoop_handelsgoederen": 344170.00,
      "inkoopwaarde_handelsgoederen": -122947.00,
      "labor_total": -45000.00,
      "labor_contract": -35000.00,
      "labor_flex": -10000.00,
      "other_costs_total": -47633.00,
      "afschrijvingen": -25323.00,
      "financiele_baten_lasten": -494.00,
      "resultaat": 234811.00
    }
  ],
  "summary": {
    "totalRecords": 12,
    "locations": ["uuid1", "uuid2"],
    "months": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "totalRevenue": 5361717.00,
    "totalCosts": -2821087.00,
    "totalResultaat": 2540630.00
  }
}
```

**Usage**: ✅ **PRIMARY ENDPOINT** for P&L Balance page

**File**: `src/app/api/finance/pnl-aggregated-data/route.ts`

---

### `GET /api/finance/pnl-aggregated-subcategories`
**Purpose**: Fetch subcategory details for a specific aggregated record

**Query Parameters**:
- `aggregatedId` (required): UUID of aggregated record
- `mainCategory` (optional): Filter by main category (e.g., "Revenue Food")

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "aggregated_id": "uuid",
      "main_category": "Revenue Food",
      "subcategory": "Omzet snacks (btw laag)",
      "gl_account": "GL001",
      "amount": 15000.00
    }
  ],
  "grouped": {
    "Revenue Food": [...],
    "Cost of Sales Beverage": [...]
  },
  "summary": {
    "totalRecords": 25,
    "mainCategories": ["Revenue Food", "Cost of Sales Beverage"],
    "totalAmount": 479208.00
  }
}
```

**Usage**: When user expands a main category to see details

**File**: `src/app/api/finance/pnl-aggregated-subcategories/route.ts`

---

### `POST /api/finance/pnl-aggregate`
**Purpose**: Trigger aggregation of raw data into aggregated tables

**Body**:
```json
{
  "locationId": "uuid",
  "year": 2025,
  "month": 1,
  "aggregateAll": false  // If true, aggregates all months for year
}
```

**Response**:
```json
{
  "success": true,
  "message": "Data aggregated successfully",
  "data": {
    "id": "uuid",
    "location_id": "uuid",
    "year": 2025,
    "month": 1,
    "resultaat": 234811.00
  }
}
```

**Usage**: Admin/import process only

**File**: `src/app/api/finance/pnl-aggregate/route.ts`

---

### `GET /api/finance/pnl-aggregate`
**Purpose**: Get aggregated data (alternative to pnl-aggregated-data)

**Query Parameters**:
- `locationId` (required): Location UUID
- `year` (required): Year
- `month` (optional): Specific month

**Usage**: Alternative endpoint for aggregated data

**File**: `src/app/api/finance/pnl-aggregate/route.ts`

---

### `GET /api/finance/pnl-revenue`
**Purpose**: Get revenue-specific data

**Response**: Revenue breakdowns by category

**File**: `src/app/api/finance/pnl-revenue/route.ts`

---

### `GET /api/finance/pnl-test-aggregation`
**Purpose**: Test aggregation process

**Usage**: Testing/debugging only

**File**: `src/app/api/finance/pnl-test-aggregation/route.ts`

---

## 🔄 Generic Data Endpoints

### `GET /api/raw-data`
**Purpose**: Generic endpoint to fetch raw data from any table

**Query Parameters**:
- `table` (required): Table name (e.g., "powerbi_pnl_data")
- `limit` (optional): Result limit
- Additional filters as query params

**Response**:
```json
{
  "success": true,
  "data": [...],
  "count": 1000
}
```

**Usage**: For debugging or custom queries

**File**: `src/app/api/raw-data/route.ts`

---

### `GET /api/locations`
**Purpose**: Fetch all locations

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Van Kinsbergen",
      "code": "VK"
    }
  ]
}
```

**Usage**: Location selection components

**File**: `src/app/api/locations/route.ts`

---

## 📊 API Usage Patterns

### P&L Balance Page Pattern
```typescript
// ✅ CORRECT - Use aggregated endpoint
const response = await fetch(
  `/api/finance/pnl-aggregated-data?year=2025&location=all`
);
const { data } = await response.json();
// Data is pre-calculated, just map to display

// ❌ WRONG - Don't use raw data endpoint
const response = await fetch(`/api/finance/pnl-data?year=2025&location=all`);
// Would require complex calculation logic
```

### Subcategory Expansion Pattern
```typescript
// Fetch subcategories when user expands category
const response = await fetch(
  `/api/finance/pnl-aggregated-subcategories?aggregatedId=${recordId}`
);
const { data } = await response.json();
// Display subcategory breakdown
```

## 🔐 Authentication & Authorization

All endpoints:
- Require authentication (user must be logged in)
- Use Row Level Security (RLS) for data access
- Filter by user's authorized locations

## ⚡ Performance Considerations

### Caching
- Aggregated data is pre-calculated (no real-time computation)
- React Query caches API responses client-side
- Database indexes on `location_id`, `year`, `month`

### Pagination
- Large datasets use pagination (1000 records per page)
- Use `limit` parameter for controlled result sizes

### Error Handling
All endpoints return:
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details"
}
```

## 🧪 Testing Endpoints

Test aggregation:
```bash
curl -X POST http://localhost:3000/api/finance/pnl-aggregate \
  -H "Content-Type: application/json" \
  -d '{"locationId": "uuid", "year": 2025, "month": 1}'
```

Test aggregated data:
```bash
curl "http://localhost:3000/api/finance/pnl-aggregated-data?year=2025&location=all"
```

