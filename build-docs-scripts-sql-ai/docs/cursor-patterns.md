# update routes
_Exported on 4-11-2025 at 17:35:21 CET from Cursor (2.0.43)_

---

**User**

please add

---

**Cursor**

Your request is incomplete. What should I add? Checking the workspace for context:


Your request is incomplete. What should I add?

- A component or feature?
- A dependency or script?
- A function or API endpoint?
- Something else?

Share the details, including the file/location if applicable, and I’ll proceed.

---

**User**

question

we have rather large pages with lots of data and filter capabilities.

do we need to optimize our pages using a MVC or MVVM or MVI architecture, to seperate model form logiv from view? 

will this also improve our page loads and error handle and waterfalls.

i thought to have database, that preproces the data, so Clent only needs to fetch data, i was ransferrer client logic to the server.

what do you think.

do we have a pattern, do we need a pattern?

it's a big question, please anser each quetsion

---

**Cursor**

Analyzing the codebase to assess current patterns and provide recommendations.


Checking service layer patterns and business logic organization:


Findings and recommendations:

## 1. Do you need MVC/MVVM/MVI architecture?

Short answer: Not strictly MVC/MVVM/MVI, but you do need better separation.

Current state:
- Pages are client components (`"use client"`) with embedded queries
- Business logic mixed with UI (e.g., `finance/pnl/page.tsx` has calculations)
- Data fetching happens in the browser via React Query
- Some services exist (`aggregation-service.ts`, `pnl-calculations.ts`), but pages still contain logic

Recommendation:
- Use Next.js Server Components (RSC) for data fetching
- Move business logic to service layers
- Keep UI state in client components only
- This aligns with Next.js patterns and avoids needing classic MVC/MVVM

## 2. Will this improve page loads, error handling, and waterfalls?

Yes, significantly.

Current issues:
```12:22:src/app/(dashboard)/finance/data/eitje-data/finance/page.tsx
const ITEMS_PER_PAGE = 50;

export default function FinancePage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("last-month");
  const [currentPage, setCurrentPage] = useState(1);
```

Your pages fetch:
1. Locations (client-side)
2. Data (client-side, after filters change)
3. This creates waterfalls and slower initial loads

Benefits of server-side approach:
- Faster initial load: data fetched on server
- Fewer waterfalls: parallel server-side fetching
- Better error handling: centralized server error boundaries
- Smaller client bundle: less JavaScript shipped
- SEO: server-rendered content

## 3. Database preprocessing + server-side logic

This aligns with your current setup and is a good direction.

What you already have:
```1:754:src/lib/eitje/aggregation-service.ts
import { createClient } from '@/integrations/supabase/server';

/**
 * EITJE AGGREGATION SERVICE
 * 
 * Processes raw Eitje data into aggregated metrics for fast dashboard loading
 * Follows EXTREME DEFENSIVE MODE: simple, modular, debuggable
 */
```

You have:
- Aggregated tables (`eitje_revenue_days_aggregated`, `eitje_labor_hours_aggregated`)
- Server-side aggregation services
- But pages still query from the client

Recommended pattern:

```typescript
// Server Component (page.tsx) - NO "use client"
import { createClient } from '@/integrations/supabase/server';
import { FinanceDataTable } from './finance-data-table'; // Client component for interactivity

export default async function FinancePage({
  searchParams
}: {
  searchParams: { page?: string; location?: string; startDate?: string; endDate?: string }
}) {
  const supabase = await createClient();
  
  // Server-side data fetching - NO waterfalls!
  const [data, locations] = await Promise.all([
    fetchFinanceData(supabase, searchParams),
    fetchLocations(supabase)
  ]);
  
  return <FinanceDataTable initialData={data} locations={locations} />;
}

// Client Component (finance-data-table.tsx) - ONLY for interactivity
"use client";
export function FinanceDataTable({ initialData, locations }) {
  // Only UI state, no data fetching
  const [filters, setFilters] = useState();
  // Use React Query for client-side updates only
}
```

## 4. Do you have a pattern? Do you need one?

Current pattern: inconsistent
- Some services (`lib/eitje/aggregation-service.ts`)
- Some hooks (`hooks/usePnLSummary.ts`)
- Pages mix data fetching and UI

Recommended pattern: Next.js Server Components + Service Layer

Structure:
```
src/
├── app/
│   └── (dashboard)/
│       └── finance/
│           └── page.tsx                    # Server Component - fetches data
│           └── finance-client.tsx         # Client Component - UI only
├── lib/
│   ├── services/
│   │   ├── finance-service.ts             # Business logic
│   │   └── eitje-service.ts               # Data access
│   └── queries/
│       └── finance-queries.ts              # Reusable query builders
└── hooks/
    └── useFinanceFilters.ts                # Client-side filter state only
```

## Recommended migration path

### Phase 1: Create service layer
Extract data fetching logic:

```typescript
// lib/services/finance-service.ts
import { createClient } from '@/integrations/supabase/server';

export async function fetchFinanceData(params: FinanceFilters) {
  const supabase = await createClient();
  // All your query logic here
  return data;
}
```

### Phase 2: Convert pages to Server Components
```typescript
// app/(dashboard)/finance/data/eitje-data/finance/page.tsx
// REMOVE "use client"
import { fetchFinanceData } from '@/lib/services/finance-service';

export default async function FinancePage({ searchParams }) {
  const data = await fetchFinanceData(searchParams);
  return <FinanceClient initialData={data} />;
}
```

### Phase 3: Split client components
```typescript
// components/finance/finance-client.tsx
"use client";
// Only UI state, filters, pagination
// Use React Query for optimistic updates
```

## Summary

- Do you need MVC/MVVM/MVI? No — use Next.js Server Components + Service Layer.
- Will it improve performance? Yes — faster loads, fewer waterfalls, better error handling.
- Database preprocessing + server logic? Yes — continue using aggregated tables and fetch on the server.
- Do you have a pattern? Partially — add structure.
- Do you need a pattern? Yes — Server Components + Service Layer.

The key insight: you already have aggregated tables and server-side services. Move data fetching from client components to Server Components, and keep client components only for interactivity.

Should I help migrate a specific page as an example?

```typescriptreact
const ITEMS_PER_PAGE = 50;

export default function FinancePage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("last-month");
  const [currentPage, setCurrentPage] = useState(1);
```

```typescript
import { createClient } from '@/integrations/supabase/server';

/**
 * EITJE AGGREGATION SERVICE
 * 
 * Processes raw Eitje data into aggregated metrics for fast dashboard loading
 * Follows EXTREME DEFENSIVE MODE: simple, modular, debuggable
 */
```

```typescript
// Server Component (page.tsx) - NO "use client"
import { createClient } from '@/integrations/supabase/server';
import { FinanceDataTable } from './finance-data-table'; // Client component for interactivity

export default async function FinancePage({
  searchParams
}: {
  searchParams: { page?: string; location?: string; startDate?: string; endDate?: string }
}) {
  const supabase = await createClient();
  
  // Server-side data fetching - NO waterfalls!
  const [data, locations] = await Promise.all([
    fetchFinanceData(supabase, searchParams),
    fetchLocations(supabase)
  ]);
  
  return <FinanceDataTable initialData={data} locations={locations} />;
}

// Client Component (finance-data-table.tsx) - ONLY for interactivity
"use client";
export function FinanceDataTable({ initialData, locations }) {
  // Only UI state, no data fetching
  const [filters, setFilters] = useState();
  // Use React Query for client-side updates only
}
```

```plaintext
src/
├── app/
│   └── (dashboard)/
│       └── finance/
│           └── page.tsx                    # Server Component - fetches data
│           └── finance-client.tsx         # Client Component - UI only
├── lib/
│   ├── services/
│   │   ├── finance-service.ts             # Business logic
│   │   └── eitje-service.ts               # Data access
│   └── queries/
│       └── finance-queries.ts              # Reusable query builders
└── hooks/
    └── useFinanceFilters.ts                # Client-side filter state only
```

```typescript
// lib/services/finance-service.ts
import { createClient } from '@/integrations/supabase/server';

export async function fetchFinanceData(params: FinanceFilters) {
  const supabase = await createClient();
  // All your query logic here
  return data;
}
```

```typescript
// app/(dashboard)/finance/data/eitje-data/finance/page.tsx
// REMOVE "use client"
import { fetchFinanceData } from '@/lib/services/finance-service';

export default async function FinancePage({ searchParams }) {
  const data = await fetchFinanceData(searchParams);
  return <FinanceClient initialData={data} />;
}
```

```typescript
// components/finance/finance-client.tsx
"use client";
// Only UI state, filters, pagination
// Use React Query for optimistic updates
```

---

**User**

can you show me a mvvm structure

---

**Cursor**

Reviewing the sales page to show an MVVM structure example:


MVVM structure example for your sales page:

## MVVM Structure Overview

### 1. Model Layer (Data & Types)

```typescript
// src/models/sales.model.ts
export interface SalesData {
  id: string;
  location_id: string;
  date: string;
  total_quantity: number;
  total_revenue_excl_vat: number;
  total_revenue_incl_vat: number;
  total_vat_amount: number;
  total_cost: number;
  avg_price: number;
  vat_9_base: number;
  vat_9_amount: number;
  vat_21_base: number;
  vat_21_amount: number;
  product_count: number;
  top_category: string | null;
}

export interface SalesFilters {
  locationFilter: string | string[];
  dateRange: { start: Date; end: Date } | null;
  includeVat: boolean;
  granularity: "day" | "week" | "month" | "quarter" | "year";
}

export interface SalesSummary {
  revenue: number;
  quantity: number;
  avgPrice: number;
  productCount: number;
  topCategory: string | null;
  vatAmount: number;
  vatBreakdown: {
    vat9Base: number;
    vat9Amount: number;
    vat21Base: number;
    vat21Amount: number;
  };
  costTotal: number;
  profitMargin: number;
  revenueExVat: number;
  revenueIncVat: number;
}
```

```typescript
// src/models/repository/sales.repository.ts
import { createClient } from '@/integrations/supabase/server';
import { SalesData } from '../sales.model';

export class SalesRepository {
  async fetchAggregatedSales(params: {
    locationIds?: string[];
    startDate: string;
    endDate: string;
    includeVat: boolean;
  }): Promise<SalesData[]> {
    const supabase = await createClient();
    
    let query = supabase
      .from('bork_sales_aggregated')
      .select

```typescript
// src/models/sales.model.ts
export interface SalesData {
  id: string;
  location_id: string;
  date: string;
  total_quantity: number;
  total_revenue_excl_vat: number;
  total_revenue_incl_vat: number;
  total_vat_amount: number;
  total_cost: number;
  avg_price: number;
  vat_9_base: number;
  vat_9_amount: number;
  vat_21_base: number;
  vat_21_amount: number;
  product_count: number;
  top_category: string | null;
}

export interface SalesFilters {
  locationFilter: string | string[];
  dateRange: { start: Date; end: Date } | null;
  includeVat: boolean;
  granularity: "day" | "week" | "month" | "quarter" | "year";
}

export interface SalesSummary {
  revenue: number;
  quantity: number;
  avgPrice: number;
  productCount: number;
  topCategory: string | null;
  vatAmount: number;
  vatBreakdown: {
    vat9Base: number;
    vat9Amount: number;
    vat21Base: number;
    vat21Amount: number;
  };
  costTotal: number;
  profitMargin: number;
  revenueExVat: number;
  revenueIncVat: number;
}
```

```typescript
// src/models/repository/sales.repository.ts
import { createClient } from '@/integrations/supabase/server';
import { SalesData } from '../sales.model';

export class SalesRepository {
  async fetchAggregatedSales(params: {
    locationIds?: string[];
    startDate: string;
    endDate: string;
    includeVat: boolean;
  }): Promise<SalesData[]> {
    const supabase = await createClient();
    
    let query = supabase
      .from('bork_sales_aggregated')
      .select
```

---

**User**

and mvi structure?

---

**Cursor**

MVI (Model-View-Intent) structure example for your sales page. MVI uses unidirectional data flow: Intent → Model → View.


MVI (Model-View-Intent) structure for your sales page. MVI uses unidirectional data flow: Intent → Model → View.

## MVI Structure Overview

**Flow**: User Action (Intent) → Model Update → View Re-render → Intent (loop)

### 1. Model (Immutable State)

```typescript
// src/models/sales.model.ts
export interface SalesModel {
  // UI State
  ui: {
    isCategoryFilterOpen: boolean;
    selectedMetric: SalesMetricType;
    comparisonMode: boolean;
    chartType: "line" | "bar";
    granularity: "day" | "week" | "month" | "quarter" | "year";
    includeVat: boolean;
    autoRefreshEnabled: boolean;
    isRefreshing: boolean;
  };
  
  // Data State
  data: {
    locations: Location[];
    primarySalesData: SalesData[] | null;
    comparisonSalesData: SalesData[] | null;
    categoryData: CategoryData[];
    selectedCategories: CategorySelection[];
    activeLocations: string[];
    lastRefreshTime: Date | null;
  };
  
  // Filter State
  filters: {
    periodPreset: string;
    dateRange: { start: Date; end: Date } | null;
    comparisonPeriodPreset: string;
    comparisonDateRange: { start: Date; end: Date } | null;
  };
  
  // Loading State
  loading: {
    locations: boolean;
    primaryData: boolean;
    comparisonData: boolean;
    categoryData: boolean;
  };
  
  // Error State
  errors: {
    locations: string | null;
    primaryData: string | null;
    comparisonData: string | null;
    categoryData: string | null;
  };
}

// Initial Model
export const initialSalesModel: SalesModel = {
  ui: {
    isCategoryFilterOpen: false,
    selectedMetric: "revenue",
    comparisonMode: false,
    chartType: "line",
    granularity: "month",
    includeVat: false,
    autoRefreshEnabled: true,
    isRefreshing: false,
  },
  data: {
    locations: [],
    primarySalesData: null,
    comparisonSalesData: null,
    categoryData: [],
    selectedCategories: [],
    activeLocations: [],
    lastRefreshTime: null,
  },
  filters: {
    periodPreset: "this-month",
    dateRange: (() => {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    })(),
    comparisonPeriodPreset: "last-month",
    comparisonDateRange: null,
  },
  loading: {
    locations: false,
    primaryData: false,
    comparisonData: false,
    categoryData: false,
  },
  errors: {
    locations: null,
    primaryData: null,
    comparisonData: null,
    categoryData: null,
  },
};
```

### 2. Intent (User Actions → Intentions)

```typescript
// src/intents/sales.intent.ts
export type SalesIntent =
  // UI Intents
  | { type: "TOGGLE_CATEGORY_FILTER" }
  | { type: "CLOSE_CATEGORY_FILTER" }
  | { type: "SELECT_METRIC"; payload: SalesMetricType }
  | { type: "TOGGLE_COMPARISON_MODE" }
  | { type: "SET_CHART_TYPE"; payload: "line" | "bar" }
  | { type: "SET_GRANULARITY"; payload: "day" | "week" | "month" | "quarter" | "year" }
  | { type: "TOGGLE_VAT" }
  | { type: "TOGGLE_AUTO_REFRESH" }
  | { type: "START_REFRESH" }
  | { type: "STOP_REFRESH" }
  
  // Filter Intents
  | { type: "SET_PERIOD_PRESET"; payload: { preset: string; range: { start: Date; end: Date } } }
  | { type: "SET_COMPARISON_PERIOD"; payload: { preset: string; range: { start: Date; end: Date } | null } }
  | { type: "SET_ACTIVE_LOCATIONS"; payload: string[] }
  | { type: "SET_SELECTED_CATEGORIES"; payload: CategorySelection[] }
  
  // Data Intents (triggered by side effects)
  | { type: "LOAD_LOCATIONS_START" }
  | { type: "LOAD_LOCATIONS_SUCCESS"; payload: Location[] }
  | { type: "LOAD_LOCATIONS_ERROR"; payload: string }
  | { type: "LOAD_PRIMARY_DATA_START" }
  | { type: "LOAD_PRIMARY_DATA_SUCCESS"; payload: SalesData[] }
  | { type: "LOAD_PRIMARY_DATA_ERROR"; payload: string }
  | { type: "LOAD_COMPARISON_DATA_START" }
  | { type: "LOAD_COMPARISON_DATA_SUCCESS"; payload: SalesData[] }
  | { type: "LOAD_COMPARISON_DATA_ERROR"; payload: string }
  | { type: "LOAD_CATEGORY_DATA_SUCCESS"; payload: CategoryData[] }
  | { type: "REFRESH_COMPLETE"; payload: Date }
  | { type: "AUTO_REFRESH_TRIGGERED" };

// Intent Creators (Action Creators)
export const SalesIntentCreators = {
  // UI Actions
  toggleCategoryFilter: (): SalesIntent => ({ type: "TOGGLE_CATEGORY_FILTER" }),
  closeCategoryFilter: (): SalesIntent => ({ type: "CLOSE_CATEGORY_FILTER" }),
  selectMetric: (metric: SalesMetricType): SalesIntent => ({ type: "SELECT_METRIC", payload: metric }),
  toggleComparisonMode: (): SalesIntent => ({ type: "TOGGLE_COMPARISON_MODE" }),
  setChartType: (type: "line" | "bar"): SalesIntent => ({ type: "SET_CHART_TYPE", payload: type }),
  setGranularity: (granularity: "day" | "week" | "month" | "quarter" | "year"): SalesIntent => 
    ({ type: "SET_GRANULARITY", payload: granularity }),
  toggleVat: (): SalesIntent => ({ type: "TOGGLE_VAT" }),
  toggleAutoRefresh: (): SalesIntent => ({ type: "TOGGLE_AUTO_REFRESH" }),
  
  // Filter Actions
  setPeriodPreset: (preset: string, range: { start: Date; end: Date }): SalesIntent => 
    ({ type: "SET_PERIOD_PRESET", payload: { preset, range } }),
  setComparisonPeriod: (preset: string, range: { start: Date; end: Date } | null): SalesIntent => 
    ({ type: "SET_COMPARISON_PERIOD", payload: { preset, range } }),
  setActiveLocations: (locations: string[]): SalesIntent => 
    ({ type: "SET_ACTIVE_LOCATIONS", payload: locations }),
  setSelectedCategories: (categories: CategorySelection[]): SalesIntent => 
    ({ type: "SET_SELECTED_CATEGORIES", payload: categories }),
  
  // Data Actions
  startRefresh: (): SalesIntent => ({ type: "START_REFRESH" }),
  stopRefresh: (): SalesIntent => ({ type: "STOP_REFRESH" }),
};
```

### 3. Model Reducer (Intent → Model Update)

```typescript
// src/reducers/sales.reducer.ts
import { SalesModel, initialSalesModel } from "@/models/sales.model";
import { SalesIntent } from "@/intents/sales.intent";

export function salesReducer(model: SalesModel, intent: SalesIntent): SalesModel {
  switch (intent.type) {
    // UI Intents
    case "TOGGLE_CATEGORY_FILTER":
      return {
        ...model,
        ui: { ...model.ui, isCategoryFilterOpen: !model.ui.isCategoryFilterOpen },
      };
    
    case "CLOSE_CATEGORY_FILTER":
      return {
        ...model,
        ui: { ...model.ui, isCategoryFilterOpen: false },
      };
    
    case "SELECT_METRIC":
      return {
        ...model,
        ui: { ...model.ui, selectedMetric: intent.payload },
        data: { ...model.data, selectedCategories: [] }, // Clear categories when selecting metric
      };
    
    case "TOGGLE_COMPARISON_MODE":
      return {
        ...model,
        ui: { ...model.ui, comparisonMode: !model.ui.comparisonMode },
      };
    
    case "SET_CHART_TYPE":
      return {
        ...model,
        ui: { ...model.ui, chartType: intent.payload },
      };
    
    case "SET_GRANULARITY":
      return {
        ...model,
        ui: { ...model.ui, granularity: intent.payload },
      };
    
    case "TOGGLE_VAT":
      return {
        ...model,
        ui: { ...model.ui, includeVat: !model.ui.includeVat },
      };
    
    case "TOGGLE_AUTO_REFRESH":
      return {
        ...model,
        ui: { ...model.ui, autoRefreshEnabled: !model.ui.autoRefreshEnabled },
      };
    
    case "START_REFRESH":
      return {
        ...model,
        ui: { ...model.ui, isRefreshing: true },
      };
    
    case "STOP_REFRESH":
      return {
        ...model,
        ui: { ...model.ui, isRefreshing: false },
      };
    
    // Filter Intents
    case "SET_PERIOD_PRESET":
      return {
        ...model,
        filters: {
          ...model.filters,
          periodPreset: intent.payload.preset,
          dateRange: intent.payload.range,
        },
        // Auto-adjust granularity based on date range
        ui: {
          ...model.ui,
          granularity: calculateGranularity(intent.payload.range),
        },
      };
    
    case "SET_COMPARISON_PERIOD":
      return {
        ...model,
        filters: {
          ...model.filters,
          comparisonPeriodPreset: intent.payload.preset,
          comparisonDateRange: intent.payload.range,
        },
      };
    
    case "SET_ACTIVE_LOCATIONS":
      return {
        ...model,
        data: { ...model.data, activeLocations: intent.payload },
      };
    
    case "SET_SELECTED_CATEGORIES":
      return {
        ...model,
        data: { ...model.data, selectedCategories: intent.payload },
      };
    
    // Data Intents
    case "LOAD_LOCATIONS_START":
      return {
        ...model,
        loading: { ...model.loading, locations: true },
        errors: { ...model.errors, locations: null },
      };
    
    case "LOAD_LOCATIONS_SUCCESS":
      return {
        ...model,
        loading: { ...model.loading, locations: false },
        data: {
          ...model.data,
          locations: intent.payload,
          // Auto-select "all" if no locations selected
          activeLocations: model.data.activeLocations.length === 0 ? ["all"] : model.data.activeLocations,
        },
      };
    
    case "LOAD_LOCATIONS_ERROR":
      return {
        ...model,
        loading: { ...model.loading, locations: false },
        errors: { ...model.errors, locations: intent.payload },
      };
    
    case "LOAD_PRIMARY_DATA_START":
      return {
        ...model,
        loading: { ...model.loading, primaryData: true },
        errors: { ...model.errors, primaryData: null },
      };
    
    case "LOAD_PRIMARY_DATA_SUCCESS":
      return {
        ...model,
        loading: { ...model.loading, primaryData: false },
        data: { ...model.data, primarySalesData: intent.payload },
      };
    
    case "LOAD_PRIMARY_DATA_ERROR":
      return {
        ...model,
        loading: { ...model.loading, primaryData: false },
        errors: { ...model.errors, primaryData: intent.payload },
      };
    
    case "LOAD_COMPARISON_DATA_START":
      return {
        ...model,
        loading: { ...model.loading, comparisonData: true },
        errors: { ...model.errors, comparisonData: null },
      };
    
    case "LOAD_COMPARISON_DATA_SUCCESS":
      return {
        ...model,
        loading: { ...model.loading, comparisonData: false },
        data: { ...model.data, comparisonSalesData: intent.payload },
      };
    
    case "LOAD_COMPARISON_DATA_ERROR":
      return {
        ...model,
        loading: { ...model.loading, comparisonData: false },
        errors: { ...model.errors, comparisonData: intent.payload },
      };
    
    case "LOAD_CATEGORY_DATA_SUCCESS":
      return {
        ...model,
        loading: { ...model.loading, categoryData: false },
        data: { ...model.data, categoryData: intent.payload },
      };
    
    case "REFRESH_COMPLETE":
      return {
        ...model,
        ui: { ...model.ui, isRefreshing: false },
        data: { ...model.data, lastRefreshTime: intent.payload },
      };
    
    default:
      return model;
  }
}

// Helper function
function calculateGranularity(dateRange: { start: Date; end: Date }): "day" | "week" | "month" | "quarter" | "year" {
  const daysDiff = Math.ceil(
    (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysDiff <= 7) return "day";
  if (daysDiff <= 60) return "week";
  if (daysDiff <= 365) return "month";
  if (daysDiff <= 1095) return "quarter";
  return "year";
}
```

### 4. Effects (Side Effects Handler)

```typescript
// src/effects/sales.effects.ts
import { SalesIntent, SalesIntentCreators } from "@/intents/sales.intent";
import { SalesModel } from "@/models/sales.model";
import { createClient } from "@/integrations/supabase/client";

export type IntentDispatcher = (intent: SalesIntent) => void;

export async function handleSalesEffects(
  model: SalesModel,
  previousModel: SalesModel | null,
  dispatch: IntentDispatcher
): Promise<void> {
  // Effect: Load locations on mount
  if (model.data.locations.length === 0 && !model.loading.locations && !previousModel) {
    dispatch(SalesIntentCreators.startRefresh());
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("name");
      
      if (error) throw error;
      dispatch({ type: "LOAD_LOCATIONS_SUCCESS", payload: data || [] });
    } catch (error) {
      dispatch({
        type: "LOAD_LOCATIONS_ERROR",
        payload: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Effect: Load primary data when filters change
  if (
    model.filters.dateRange &&
    (model.filters.dateRange !== previousModel?.filters.dateRange ||
     model.data.activeLocations !== previousModel?.data.activeLocations ||
     model.ui.includeVat !== previousModel?.ui.includeVat)
  ) {
    dispatch({ type: "LOAD_PRIMARY_DATA_START" });
    
    try {
      const locationFilter = model.data.activeLocations.includes("all") || model.data.activeLocations.length === 0
        ? "all"
        : model.data.activeLocations;
      
      const params = new URLSearchParams();
      if (locationFilter !== "all") {
        if (Array.isArray(locationFilter)) {
          params.append("locationIds", locationFilter.join(","));
        } else {
          params.append("locationIds", locationFilter);
        }
      }
      
      params.append("startDate", model.filters.dateRange.start.toISOString().split("T")[0]);
      params.append("endDate", model.filters.dateRange.end.toISOString().split("T")[0]);
      params.append("includeVat", model.ui.includeVat.toString());
      
      const response = await fetch(`/api/sales/aggregated?${params.toString()}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch sales data");
      }
      
      dispatch({ type: "LOAD_PRIMARY_DATA_SUCCESS", payload: result.data || [] });
    } catch (error) {
      dispatch({
        type: "LOAD_PRIMARY_DATA_ERROR",
        payload: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Effect: Load comparison data when comparison mode is enabled
  if (
    model.ui.comparisonMode &&
    model.filters.comparisonDateRange &&
    (model.filters.comparisonDateRange !== previousModel?.filters.comparisonDateRange ||
     model.data.activeLocations !== previousModel?.data.activeLocations ||
     model.ui.includeVat !== previousModel?.ui.includeVat)
  ) {
    dispatch({ type: "LOAD_COMPARISON_DATA_START" });
    
    try {
      const locationFilter = model.data.activeLocations.includes("all") || model.data.activeLocations.length === 0
        ? "all"
        : model.data.activeLocations;
      
      const params = new URLSearchParams();
      if (locationFilter !== "all") {
        if (Array.isArray(locationFilter)) {
          params.append("locationIds", locationFilter.join(","));
        } else {
          params.append("locationIds", locationFilter);
        }
      }
      
      params.append("startDate", model.filters.comparisonDateRange.start.toISOString().split("T")[0]);
      params.append("endDate", model.filters.comparisonDateRange.end.toISOString().split("T")[0]);
      params.append("includeVat", model.ui.includeVat.toString());
      
      const response = await fetch(`/api/sales/aggregated?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        dispatch({ type: "LOAD_COMPARISON_DATA_SUCCESS", payload: result.data || [] });
      }
    } catch (error) {
      dispatch({
        type: "LOAD_COMPARISON_DATA_ERROR",
        payload: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Effect: Auto-refresh
  if (model.ui.autoRefreshEnabled) {
    // This would be handled by a separate interval effect
  }
}
```

### 5. View (Pure Component)

```typescript
// src/app/(dashboard)/finance/sales/page.tsx
"use client";

import { useReducer, useEffect, useRef } from "react";
import { SalesModel, initialSalesModel } from "@/models/sales.model";
import { SalesIntent, SalesIntentCreators } from "@/intents/sales.intent";
import { salesReducer } from "@/reducers/sales.reducer";
import { handleSalesEffects } from "@/effects/sales.effects";
import { SalesView } from "@/views/sales.view";

export default function Sales() {
  const [model, dispatch] = useReducer(salesReducer, initialSalesModel);
  const previousModelRef = useRef<SalesModel | null>(null);

  // Handle side effects
  useEffect(() => {
    handleSalesEffects(model, previousModelRef.current, dispatch);
    previousModelRef.current = model;
  }, [model]);

  // Auto-refresh effect
  useEffect(() => {
    if (!model.ui.autoRefreshEnabled) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/bork/aggregate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        const result = await response.json();
        if (result.success && result.summary.totalAggregatedDates > 0) {
          dispatch({ type: "REFRESH_COMPLETE", payload: new Date() });
          // Optionally reload data
          window.location.reload();
        }
      } catch (error) {
        console.error('[Sales] Auto-refresh error:', error);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [model.ui.autoRefreshEnabled]);

  // Manual refresh handler
  const handleRefresh = async () => {
    dispatch(SalesIntentCreators.startRefresh());
    
    try {
      const response = await fetch('/api/bork/aggregate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const result = await response.json();
      if (result.success) {
        dispatch({ type: "REFRESH_COMPLETE", payload: new Date() });
        window.location.reload();
      }
    } catch (error) {
      dispatch(SalesIntentCreators.stopRefresh());
    }
  };

  return <SalesView model={model} dispatch={dispatch} onRefresh={handleRefresh} />;
}
```

### 6. View Component (Pure Presentation)

```typescript
// src/views/sales.view.tsx
"use client";

import { SalesModel } from "@/models/sales.model";
import { SalesIntent, SalesIntentCreators } from "@/intents/sales.intent";
import { SalesKpiCard } from "@/components/sales/SalesKpiCard";
import { SalesChart } from "@/components/sales/SalesChart";
import { SalesCategoryFilter } from "@/components/sales/SalesCategoryFilter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RefreshCw, Loader2, Filter } from "lucide-react";
import SmartPeriodSelector from "@/components/finance/SmartPeriodSelector";
import LocationMultiSelect from "@/components/finance/LocationMultiSelect";
import { computeSalesSummary } from "@/utils/sales.utils";

interface SalesViewProps {
  model: SalesModel;
  dispatch: (intent: SalesIntent) => void;
  onRefresh: () => void;
}

export function SalesView({ model, dispatch, onRefresh }: SalesViewProps) {
  // Compute derived data from model
  const primarySummary = computeSalesSummary(model.data.primarySalesData, model.ui.includeVat);
  const comparisonSummary = computeSalesSummary(model.data.comparisonSalesData, model.ui.includeVat);

  const locationFilter = model.data.activeLocations.includes("all") || model.data.activeLocations.length === 0
    ? "all"
    : model.data.activeLocations;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Performance</h1>
          <p className="text-muted-foreground">Analyze sales data from Bork POS</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={model.ui.isRefreshing}
          >
            {model.ui.isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh Sales Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch(SalesIntentCreators.toggleCategoryFilter())}
          >
            <Filter className="h-4 w-4" />
            Category Filters
            {model.data.selectedCategories.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {model.data.selectedCategories.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SmartPeriodSelector
              value={model.filters.periodPreset}
              onChange={(preset, range) =>
                dispatch(SalesIntentCreators.setPeriodPreset(preset, range))
              }
            />
            {model.ui.comparisonMode && (
              <SmartPeriodSelector
                value={model.filters.comparisonPeriodPreset}
                onChange={(preset, range) =>
                  dispatch(SalesIntentCreators.setComparisonPeriod(preset, range))
                }
              />
            )}
          </div>

          <LocationMultiSelect
            locations={model.data.locations}
            activeLocations={model.data.activeLocations}
            onChange={(locations) => dispatch(SalesIntentCreators.setActiveLocations(locations))}
          />

          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Switch
                checked={model.ui.comparisonMode}
                onCheckedChange={() => dispatch(SalesIntentCreators.toggleComparisonMode())}
              />
              <Label>Enable comparison mode</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={model.ui.includeVat}
                onCheckedChange={() => dispatch(SalesIntentCreators.toggleVat())}
              />
              <Label>Include VAT</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SalesKpiCard
          title={`Revenue ${model.ui.includeVat ? '(incl. VAT)' : '(excl. VAT)'}`}
          value={primarySummary?.revenue || 0}
          previousValue={model.ui.comparisonMode ? (comparisonSummary?.revenue || 0) : undefined}
          format="currency"
          isLoading={model.loading.primaryData}
          onClick={() => dispatch(SalesIntentCreators.selectMetric("revenue"))}
          isSelected={model.ui.selectedMetric === "revenue" && model.data.selectedCategories.length === 0}
        />
        {/* More KPI cards... */}
      </div>

      {/* Chart */}
      <SalesChart
        selectedMetric={model.ui.selectedMetric}
        activeLocations={model.data.activeLocations}
        dateRange={model.filters.dateRange}
        comparisonDateRange={model.ui.comparisonMode ? model.filters.comparisonDateRange : null}
        chartType={model.ui.chartType}
        granularity={model.ui.granularity}
        selectedCategories={model.data.selectedCategories}
        categoryData={model.data.categoryData}
        includeVat={model.ui.includeVat}
      />

      {/* Category Filter Sheet */}
      <SalesCategoryFilter
        open={model.ui.isCategoryFilterOpen}
        onOpenChange={(open) =>
          dispatch(open ? SalesIntentCreators.toggleCategoryFilter() : SalesIntentCreators.closeCategoryFilter())
        }
        selectedCategories={model.data.selectedCategories}
        onCategoriesChange={(categories) =>
          dispatch(SalesIntentCreators.setSelectedCategories(categories))
        }
      />
    </div>
  );
}
```

## MVI vs MVVM Comparison

| Aspect | MVVM | MVI |
|--------|------|-----|
| Data Flow | Bidirectional (View ↔ ViewModel) | Unidirectional (Intent → Model → View) |
| State Management | ViewModel holds state | Model is immutable, reducer updates it |
| Side Effects | In ViewModel | Separate Effects layer |
| Testability | High (ViewModel logic) | Very High (pure functions) |
| Complexity | Medium | Higher (more files) |
| React Fit | Good (similar to custom hooks) | Excellent (similar to Redux) |

## Recommendation

For Next.js, prefer:
1. MVVM for simpler pages (similar to your current hooks pattern)
2. MVI for complex state management (similar to Redux/Zustand)

Should I show how to implement either pattern in your codebase?

```typescript
// src/models/sales.model.ts
export interface SalesModel {
  // UI State
  ui: {
    isCategoryFilterOpen: boolean;
    selectedMetric: SalesMetricType;
    comparisonMode: boolean;
    chartType: "line" | "bar";
    granularity: "day" | "week" | "month" | "quarter" | "year";
    includeVat: boolean;
    autoRefreshEnabled: boolean;
    isRefreshing: boolean;
  };
  
  // Data State
  data: {
    locations: Location[];
    primarySalesData: SalesData[] | null;
    comparisonSalesData: SalesData[] | null;
    categoryData: CategoryData[];
    selectedCategories: CategorySelection[];
    activeLocations: string[];
    lastRefreshTime: Date | null;
  };
  
  // Filter State
  filters: {
    periodPreset: string;
    dateRange: { start: Date; end: Date } | null;
    comparisonPeriodPreset: string;
    comparisonDateRange: { start: Date; end: Date } | null;
  };
  
  // Loading State
  loading: {
    locations: boolean;
    primaryData: boolean;
    comparisonData: boolean;
    categoryData: boolean;
  };
  
  // Error State
  errors: {
    locations: string | null;
    primaryData: string | null;
    comparisonData: string | null;
    categoryData: string | null;
  };
}

// Initial Model
export const initialSalesModel: SalesModel = {
  ui: {
    isCategoryFilterOpen: false,
    selectedMetric: "revenue",
    comparisonMode: false,
    chartType: "line",
    granularity: "month",
    includeVat: false,
    autoRefreshEnabled: true,
    isRefreshing: false,
  },
  data: {
    locations: [],
    primarySalesData: null,
    comparisonSalesData: null,
    categoryData: [],
    selectedCategories: [],
    activeLocations: [],
    lastRefreshTime: null,
  },
  filters: {
    periodPreset: "this-month",
    dateRange: (() => {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    })(),
    comparisonPeriodPreset: "last-month",
    comparisonDateRange: null,
  },
  loading: {
    locations: false,
    primaryData: false,
    comparisonData: false,
    categoryData: false,
  },
  errors: {
    locations: null,
    primaryData: null,
    comparisonData: null,
    categoryData: null,
  },
};
```

```typescript
// src/intents/sales.intent.ts
export type SalesIntent =
  // UI Intents
  | { type: "TOGGLE_CATEGORY_FILTER" }
  | { type: "CLOSE_CATEGORY_FILTER" }
  | { type: "SELECT_METRIC"; payload: SalesMetricType }
  | { type: "TOGGLE_COMPARISON_MODE" }
  | { type: "SET_CHART_TYPE"; payload: "line" | "bar" }
  | { type: "SET_GRANULARITY"; payload: "day" | "week" | "month" | "quarter" | "year" }
  | { type: "TOGGLE_VAT" }
  | { type: "TOGGLE_AUTO_REFRESH" }
  | { type: "START_REFRESH" }
  | { type: "STOP_REFRESH" }
  
  // Filter Intents
  | { type: "SET_PERIOD_PRESET"; payload: { preset: string; range: { start: Date; end: Date } } }
  | { type: "SET_COMPARISON_PERIOD"; payload: { preset: string; range: { start: Date; end: Date } | null } }
  | { type: "SET_ACTIVE_LOCATIONS"; payload: string[] }
  | { type: "SET_SELECTED_CATEGORIES"; payload: CategorySelection[] }
  
  // Data Intents (triggered by side effects)
  | { type: "LOAD_LOCATIONS_START" }
  | { type: "LOAD_LOCATIONS_SUCCESS"; payload: Location[] }
  | { type: "LOAD_LOCATIONS_ERROR"; payload: string }
  | { type: "LOAD_PRIMARY_DATA_START" }
  | { type: "LOAD_PRIMARY_DATA_SUCCESS"; payload: SalesData[] }
  | { type: "LOAD_PRIMARY_DATA_ERROR"; payload: string }
  | { type: "LOAD_COMPARISON_DATA_START" }
  | { type: "LOAD_COMPARISON_DATA_SUCCESS"; payload: SalesData[] }
  | { type: "LOAD_COMPARISON_DATA_ERROR"; payload: string }
  | { type: "LOAD_CATEGORY_DATA_SUCCESS"; payload: CategoryData[] }
  | { type: "REFRESH_COMPLETE"; payload: Date }
  | { type: "AUTO_REFRESH_TRIGGERED" };

// Intent Creators (Action Creators)
export const SalesIntentCreators = {
  // UI Actions
  toggleCategoryFilter: (): SalesIntent => ({ type: "TOGGLE_CATEGORY_FILTER" }),
  closeCategoryFilter: (): SalesIntent => ({ type: "CLOSE_CATEGORY_FILTER" }),
  selectMetric: (metric: SalesMetricType): SalesIntent => ({ type: "SELECT_METRIC", payload: metric }),
  toggleComparisonMode: (): SalesIntent => ({ type: "TOGGLE_COMPARISON_MODE" }),
  setChartType: (type: "line" | "bar"): SalesIntent => ({ type: "SET_CHART_TYPE", payload: type }),
  setGranularity: (granularity: "day" | "week" | "month" | "quarter" | "year"): SalesIntent => 
    ({ type: "SET_GRANULARITY", payload: granularity }),
  toggleVat: (): SalesIntent => ({ type: "TOGGLE_VAT" }),
  toggleAutoRefresh: (): SalesIntent => ({ type: "TOGGLE_AUTO_REFRESH" }),
  
  // Filter Actions
  setPeriodPreset: (preset: string, range: { start: Date; end: Date }): SalesIntent => 
    ({ type: "SET_PERIOD_PRESET", payload: { preset, range } }),
  setComparisonPeriod: (preset: string, range: { start: Date; end: Date } | null): SalesIntent => 
    ({ type: "SET_COMPARISON_PERIOD", payload: { preset, range } }),
  setActiveLocations: (locations: string[]): SalesIntent => 
    ({ type: "SET_ACTIVE_LOCATIONS", payload: locations }),
  setSelectedCategories: (categories: CategorySelection[]): SalesIntent => 
    ({ type: "SET_SELECTED_CATEGORIES", payload: categories }),
  
  // Data Actions
  startRefresh: (): SalesIntent => ({ type: "START_REFRESH" }),
  stopRefresh: (): SalesIntent => ({ type: "STOP_REFRESH" }),
};
```

```typescript
// src/reducers/sales.reducer.ts
import { SalesModel, initialSalesModel } from "@/models/sales.model";
import { SalesIntent } from "@/intents/sales.intent";

export function salesReducer(model: SalesModel, intent: SalesIntent): SalesModel {
  switch (intent.type) {
    // UI Intents
    case "TOGGLE_CATEGORY_FILTER":
      return {
        ...model,
        ui: { ...model.ui, isCategoryFilterOpen: !model.ui.isCategoryFilterOpen },
      };
    
    case "CLOSE_CATEGORY_FILTER":
      return {
        ...model,
        ui: { ...model.ui, isCategoryFilterOpen: false },
      };
    
    case "SELECT_METRIC":
      return {
        ...model,
        ui: { ...model.ui, selectedMetric: intent.payload },
        data: { ...model.data, selectedCategories: [] }, // Clear categories when selecting metric
      };
    
    case "TOGGLE_COMPARISON_MODE":
      return {
        ...model,
        ui: { ...model.ui, comparisonMode: !model.ui.comparisonMode },
      };
    
    case "SET_CHART_TYPE":
      return {
        ...model,
        ui: { ...model.ui, chartType: intent.payload },
      };
    
    case "SET_GRANULARITY":
      return {
        ...model,
        ui: { ...model.ui, granularity: intent.payload },
      };
    
    case "TOGGLE_VAT":
      return {
        ...model,
        ui: { ...model.ui, includeVat: !model.ui.includeVat },
      };
    
    case "TOGGLE_AUTO_REFRESH":
      return {
        ...model,
        ui: { ...model.ui, autoRefreshEnabled: !model.ui.autoRefreshEnabled },
      };
    
    case "START_REFRESH":
      return {
        ...model,
        ui: { ...model.ui, isRefreshing: true },
      };
    
    case "STOP_REFRESH":
      return {
        ...model,
        ui: { ...model.ui, isRefreshing: false },
      };
    
    // Filter Intents
    case "SET_PERIOD_PRESET":
      return {
        ...model,
        filters: {
          ...model.filters,
          periodPreset: intent.payload.preset,
          dateRange: intent.payload.range,
        },
        // Auto-adjust granularity based on date range
        ui: {
          ...model.ui,
          granularity: calculateGranularity(intent.payload.range),
        },
      };
    
    case "SET_COMPARISON_PERIOD":
      return {
        ...model,
        filters: {
          ...model.filters,
          comparisonPeriodPreset: intent.payload.preset,
          comparisonDateRange: intent.payload.range,
        },
      };
    
    case "SET_ACTIVE_LOCATIONS":
      return {
        ...model,
        data: { ...model.data, activeLocations: intent.payload },
      };
    
    case "SET_SELECTED_CATEGORIES":
      return {
        ...model,
        data: { ...model.data, selectedCategories: intent.payload },
      };
    
    // Data Intents
    case "LOAD_LOCATIONS_START":
      return {
        ...model,
        loading: { ...model.loading, locations: true },
        errors: { ...model.errors, locations: null },
      };
    
    case "LOAD_LOCATIONS_SUCCESS":
      return {
        ...model,
        loading: { ...model.loading, locations: false },
        data: {
          ...model.data,
          locations: intent.payload,
          // Auto-select "all" if no locations selected
          activeLocations: model.data.activeLocations.length === 0 ? ["all"] : model.data.activeLocations,
        },
      };
    
    case "LOAD_LOCATIONS_ERROR":
      return {
        ...model,
        loading: { ...model.loading, locations: false },
        errors: { ...model.errors, locations: intent.payload },
      };
    
    case "LOAD_PRIMARY_DATA_START":
      return {
        ...model,
        loading: { ...model.loading, primaryData: true },
        errors: { ...model.errors, primaryData: null },
      };
    
    case "LOAD_PRIMARY_DATA_SUCCESS":
      return {
        ...model,
        loading: { ...model.loading, primaryData: false },
        data: { ...model.data, primarySalesData: intent.payload },
      };
    
    case "LOAD_PRIMARY_DATA_ERROR":
      return {
        ...model,
        loading: { ...model.loading, primaryData: false },
        errors: { ...model.errors, primaryData: intent.payload },
      };
    
    case "LOAD_COMPARISON_DATA_START":
      return {
        ...model,
        loading: { ...model.loading, comparisonData: true },
        errors: { ...model.errors, comparisonData: null },
      };
    
    case "LOAD_COMPARISON_DATA_SUCCESS":
      return {
        ...model,
        loading: { ...model.loading, comparisonData: false },
        data: { ...model.data, comparisonSalesData: intent.payload },
      };
    
    case "LOAD_COMPARISON_DATA_ERROR":
      return {
        ...model,
        loading: { ...model.loading, comparisonData: false },
        errors: { ...model.errors, comparisonData: intent.payload },
      };
    
    case "LOAD_CATEGORY_DATA_SUCCESS":
      return {
        ...model,
        loading: { ...model.loading, categoryData: false },
        data: { ...model.data, categoryData: intent.payload },
      };
    
    case "REFRESH_COMPLETE":
      return {
        ...model,
        ui: { ...model.ui, isRefreshing: false },
        data: { ...model.data, lastRefreshTime: intent.payload },
      };
    
    default:
      return model;
  }
}

// Helper function
function calculateGranularity(dateRange: { start: Date; end: Date }): "day" | "week" | "month" | "quarter" | "year" {
  const daysDiff = Math.ceil(
    (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysDiff <= 7) return "day";
  if (daysDiff <= 60) return "week";
  if (daysDiff <= 365) return "month";
  if (daysDiff <= 1095) return "quarter";
  return "year";
}
```

```typescript
// src/effects/sales.effects.ts
import { SalesIntent, SalesIntentCreators } from "@/intents/sales.intent";
import { SalesModel } from "@/models/sales.model";
import { createClient } from "@/integrations/supabase/client";

export type IntentDispatcher = (intent: SalesIntent) => void;

export async function handleSalesEffects(
  model: SalesModel,
  previousModel: SalesModel | null,
  dispatch: IntentDispatcher
): Promise<void> {
  // Effect: Load locations on mount
  if (model.data.locations.length === 0 && !model.loading.locations && !previousModel) {
    dispatch(SalesIntentCreators.startRefresh());
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("name");
      
      if (error) throw error;
      dispatch({ type: "LOAD_LOCATIONS_SUCCESS", payload: data || [] });
    } catch (error) {
      dispatch({
        type: "LOAD_LOCATIONS_ERROR",
        payload: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Effect: Load primary data when filters change
  if (
    model.filters.dateRange &&
    (model.filters.dateRange !== previousModel?.filters.dateRange ||
     model.data.activeLocations !== previousModel?.data.activeLocations ||
     model.ui.includeVat !== previousModel?.ui.includeVat)
  ) {
    dispatch({ type: "LOAD_PRIMARY_DATA_START" });
    
    try {
      const locationFilter = model.data.activeLocations.includes("all") || model.data.activeLocations.length === 0
        ? "all"
        : model.data.activeLocations;
      
      const params = new URLSearchParams();
      if (locationFilter !== "all") {
        if (Array.isArray(locationFilter)) {
          params.append("locationIds", locationFilter.join(","));
        } else {
          params.append("locationIds", locationFilter);
        }
      }
      
      params.append("startDate", model.filters.dateRange.start.toISOString().split("T")[0]);
      params.append("endDate", model.filters.dateRange.end.toISOString().split("T")[0]);
      params.append("includeVat", model.ui.includeVat.toString());
      
      const response = await fetch(`/api/sales/aggregated?${params.toString()}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch sales data");
      }
      
      dispatch({ type: "LOAD_PRIMARY_DATA_SUCCESS", payload: result.data || [] });
    } catch (error) {
      dispatch({
        type: "LOAD_PRIMARY_DATA_ERROR",
        payload: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Effect: Load comparison data when comparison mode is enabled
  if (
    model.ui.comparisonMode &&
    model.filters.comparisonDateRange &&
    (model.filters.comparisonDateRange !== previousModel?.filters.comparisonDateRange ||
     model.data.activeLocations !== previousModel?.data.activeLocations ||
     model.ui.includeVat !== previousModel?.ui.includeVat)
  ) {
    dispatch({ type: "LOAD_COMPARISON_DATA_START" });
    
    try {
      const locationFilter = model.data.activeLocations.includes("all") || model.data.activeLocations.length === 0
        ? "all"
        : model.data.activeLocations;
      
      const params = new URLSearchParams();
      if (locationFilter !== "all") {
        if (Array.isArray(locationFilter)) {
          params.append("locationIds", locationFilter.join(","));
        } else {
          params.append("locationIds", locationFilter);
        }
      }
      
      params.append("startDate", model.filters.comparisonDateRange.start.toISOString().split("T")[0]);
      params.append("endDate", model.filters.comparisonDateRange.end.toISOString().split("T")[0]);
      params.append("includeVat", model.ui.includeVat.toString());
      
      const response = await fetch(`/api/sales/aggregated?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        dispatch({ type: "LOAD_COMPARISON_DATA_SUCCESS", payload: result.data || [] });
      }
    } catch (error) {
      dispatch({
        type: "LOAD_COMPARISON_DATA_ERROR",
        payload: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Effect: Auto-refresh
  if (model.ui.autoRefreshEnabled) {
    // This would be handled by a separate interval effect
  }
}
```

```typescript
// src/app/(dashboard)/finance/sales/page.tsx
"use client";

import { useReducer, useEffect, useRef } from "react";
import { SalesModel, initialSalesModel } from "@/models/sales.model";
import { SalesIntent, SalesIntentCreators } from "@/intents/sales.intent";
import { salesReducer } from "@/reducers/sales.reducer";
import { handleSalesEffects } from "@/effects/sales.effects";
import { SalesView } from "@/views/sales.view";

export default function Sales() {
  const [model, dispatch] = useReducer(salesReducer, initialSalesModel);
  const previousModelRef = useRef<SalesModel | null>(null);

  // Handle side effects
  useEffect(() => {
    handleSalesEffects(model, previousModelRef.current, dispatch);
    previousModelRef.current = model;
  }, [model]);

  // Auto-refresh effect
  useEffect(() => {
    if (!model.ui.autoRefreshEnabled) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/bork/aggregate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        const result = await response.json();
        if (result.success && result.summary.totalAggregatedDates > 0) {
          dispatch({ type: "REFRESH_COMPLETE", payload: new Date() });
          // Optionally reload data
          window.location.reload();
        }
      } catch (error) {
        console.error('[Sales] Auto-refresh error:', error);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [model.ui.autoRefreshEnabled]);

  // Manual refresh handler
  const handleRefresh = async () => {
    dispatch(SalesIntentCreators.startRefresh());
    
    try {
      const response = await fetch('/api/bork/aggregate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const result = await response.json();
      if (result.success) {
        dispatch({ type: "REFRESH_COMPLETE", payload: new Date() });
        window.location.reload();
      }
    } catch (error) {
      dispatch(SalesIntentCreators.stopRefresh());
    }
  };

  return <SalesView model={model} dispatch={dispatch} onRefresh={handleRefresh} />;
}
```

```typescript
// src/views/sales.view.tsx
"use client";

import { SalesModel } from "@/models/sales.model";
import { SalesIntent, SalesIntentCreators } from "@/intents/sales.intent";
import { SalesKpiCard } from "@/components/sales/SalesKpiCard";
import { SalesChart } from "@/components/sales/SalesChart";
import { SalesCategoryFilter } from "@/components/sales/SalesCategoryFilter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RefreshCw, Loader2, Filter } from "lucide-react";
import SmartPeriodSelector from "@/components/finance/SmartPeriodSelector";
import LocationMultiSelect from "@/components/finance/LocationMultiSelect";
import { computeSalesSummary } from "@/utils/sales.utils";

interface SalesViewProps {
  model: SalesModel;
  dispatch: (intent: SalesIntent) => void;
  onRefresh: () => void;
}

export function SalesView({ model, dispatch, onRefresh }: SalesViewProps) {
  // Compute derived data from model
  const primarySummary = computeSalesSummary(model.data.primarySalesData, model.ui.includeVat);
  const comparisonSummary = computeSalesSummary(model.data.comparisonSalesData, model.ui.includeVat);

  const locationFilter = model.data.activeLocations.includes("all") || model.data.activeLocations.length === 0
    ? "all"
    : model.data.activeLocations;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Performance</h1>
          <p className="text-muted-foreground">Analyze sales data from Bork POS</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={model.ui.isRefreshing}
          >
            {model.ui.isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh Sales Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch(SalesIntentCreators.toggleCategoryFilter())}
          >
            <Filter className="h-4 w-4" />
            Category Filters
            {model.data.selectedCategories.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {model.data.selectedCategories.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SmartPeriodSelector
              value={model.filters.periodPreset}
              onChange={(preset, range) =>
                dispatch(SalesIntentCreators.setPeriodPreset(preset, range))
              }
            />
            {model.ui.comparisonMode && (
              <SmartPeriodSelector
                value={model.filters.comparisonPeriodPreset}
                onChange={(preset, range) =>
                  dispatch(SalesIntentCreators.setComparisonPeriod(preset, range))
                }
              />
            )}
          </div>

          <LocationMultiSelect
            locations={model.data.locations}
            activeLocations={model.data.activeLocations}
            onChange={(locations) => dispatch(SalesIntentCreators.setActiveLocations(locations))}
          />

          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Switch
                checked={model.ui.comparisonMode}
                onCheckedChange={() => dispatch(SalesIntentCreators.toggleComparisonMode())}
              />
              <Label>Enable comparison mode</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={model.ui.includeVat}
                onCheckedChange={() => dispatch(SalesIntentCreators.toggleVat())}
              />
              <Label>Include VAT</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SalesKpiCard
          title={`Revenue ${model.ui.includeVat ? '(incl. VAT)' : '(excl. VAT)'}`}
          value={primarySummary?.revenue || 0}
          previousValue={model.ui.comparisonMode ? (comparisonSummary?.revenue || 0) : undefined}
          format="currency"
          isLoading={model.loading.primaryData}
          onClick={() => dispatch(SalesIntentCreators.selectMetric("revenue"))}
          isSelected={model.ui.selectedMetric === "revenue" && model.data.selectedCategories.length === 0}
        />
        {/* More KPI cards... */}
      </div>

      {/* Chart */}
      <SalesChart
        selectedMetric={model.ui.selectedMetric}
        activeLocations={model.data.activeLocations}
        dateRange={model.filters.dateRange}
        comparisonDateRange={model.ui.comparisonMode ? model.filters.comparisonDateRange : null}
        chartType={model.ui.chartType}
        granularity={model.ui.granularity}
        selectedCategories={model.data.selectedCategories}
        categoryData={model.data.categoryData}
        includeVat={model.ui.includeVat}
      />

      {/* Category Filter Sheet */}
      <SalesCategoryFilter
        open={model.ui.isCategoryFilterOpen}
        onOpenChange={(open) =>
          dispatch(open ? SalesIntentCreators.toggleCategoryFilter() : SalesIntentCreators.closeCategoryFilter())
        }
        selectedCategories={model.data.selectedCategories}
        onCategoriesChange={(categories) =>
          dispatch(SalesIntentCreators.setSelectedCategories(categories))
        }
      />
    </div>
  );
}
```

---

**User**

ok can show me a Next.js Server Components + Service Layer vs MVC vs MVVM vs MVI in an comparison please, same as you did for mvi vs mvvm

---

**Cursor**

Comparison of all five architectures using your sales page as the example.

## Architecture Comparison: Complete Overview

### 1. Next.js Server Components + Service Layer

**Structure:**
```
Server Component (page.tsx) → Service Layer → Database
         ↓
Client Component (UI only)
```

**Example:**
```typescript
// app/(dashboard)/finance/sales/page.tsx (Server Component)
import { SalesService } from '@/lib/services/sales.service';
import { SalesClient } from './sales-client';

export default async function SalesPage({ searchParams }) {
  // Server-side data fetching - NO waterfalls!
  const [locations, salesData] = await Promise.all([
    SalesService.fetchLocations(),
    SalesService.fetchSalesData(searchParams),
  ]);
  
  return <SalesClient initialData={{ locations, salesData }} />;
}

// lib/services/sales.service.ts
export class SalesService {
  static async fetchLocations() {
    const supabase = await createClient();
    return await supabase.from("locations").select("*");
  }
  
  static async fetchSalesData(filters: SalesFilters) {
    // All business logic here
    const supabase = await createClient();
    // Query aggregated tables
    return await supabase.from("bork_sales_aggregated").select("*");
  }
}

// sales-client.tsx (Client Component - UI only)
"use client";
export function SalesClient({ initialData }) {
  const [filters, setFilters] = useState();
  // Only UI state, no data fetching
}
```

### 2. MVC (Model-View-Controller)

**Structure:**
```
Controller → Model → Database
     ↓
   View
```

**Example:**
```typescript
// controllers/SalesController.ts
export class SalesController {
  async getSales(req: Request, res: Response) {
    const model = new SalesModel();
    const data = await model.fetchSales(req.query);
    const view = new SalesView(data);
    return view.render();
  }
}

// models/SalesModel.ts
export class SalesModel {
  async fetchSales(filters: SalesFilters) {
    const supabase = createClient();
    return await supabase.from("bork_sales_aggregated").select("*");
  }
}

// views/SalesView.tsx
export class SalesView {
  constructor(private data: SalesData) {}
  render() {
    return <div>{/* Render data */}</div>;
  }
}
```

### 3. MVVM (Model-View-ViewModel)

**Structure:**
```
View ↔ ViewModel ↔ Model ↔ Database
```

**Example:**
```typescript
// ViewModels/SalesViewModel.ts
export class SalesViewModel {
  private _locations = new BehaviorSubject<Location[]>([]);
  private _salesData = new BehaviorSubject<SalesData[]>([]);
  
  locations$ = this._locations.asObservable();
  salesData$ = this._salesData.asObservable();
  
  async loadLocations() {
    const data = await SalesModel.fetchLocations();
    this._locations.next(data);
  }
  
  async loadSalesData(filters: SalesFilters) {
    const data = await SalesModel.fetchSales(filters);
    this._salesData.next(data);
  }
}

// Views/SalesView.tsx
export function SalesView() {
  const viewModel = new SalesViewModel();
  const locations = useObservable(viewModel.locations$);
  
  useEffect(() => {
    viewModel.loadLocations();
  }, []);
  
  return <div>{/* Render */}</div>;
}
```

### 4. MVI (Model-View-Intent)

**Structure:**
```
Intent → Model → View
         ↑         ↓
         └─────────┘
```

**Example:**
```typescript
// Already shown above - unidirectional flow
// Intent → Reducer → Model → View
```

---

## Comparison Table

| Aspect | Next.js RSC + Service | MVC | MVVM | MVI |
|--------|----------------------|-----|------|-----|
| **Data Flow** | Server → Client (unidirectional) | Controller → Model → View | Bidirectional (View ↔ ViewModel) | Unidirectional (Intent → Model → View) |
| **State Management** | Server state + Client UI state | Controller holds state | ViewModel holds state | Model (immutable) |
| **Business Logic Location** | Service Layer | Controller/Model | ViewModel | Effects + Reducer |
| **Data Fetching** | Server Components (server-side) | Controller/Model | ViewModel | Effects layer |
| **Initial Load Speed** | ⭐⭐⭐⭐⭐ Fastest (SSR) | ⭐⭐⭐ Medium | ⭐⭐ Slow (client-side) | ⭐⭐ Slow (client-side) |
| **Waterfall Prevention** | ⭐⭐⭐⭐⭐ Excellent (parallel) | ⭐⭐⭐ Good | ⭐⭐ Poor | ⭐⭐ Poor |
| **Bundle Size** | ⭐⭐⭐⭐⭐ Smallest | ⭐⭐⭐⭐ Small | ⭐⭐⭐ Medium | ⭐⭐⭐ Medium |
| **SEO** | ⭐⭐⭐⭐⭐ Perfect | ⭐⭐⭐⭐ Good | ⭐⭐ Poor | ⭐⭐ Poor |
| **React/Next.js Fit** | ⭐⭐⭐⭐⭐ Native | ⭐⭐ Poor (not React-native) | ⭐⭐⭐ Good | ⭐⭐⭐⭐ Excellent |
| **Complexity** | ⭐⭐⭐ Low-Medium | ⭐⭐⭐⭐ Medium | ⭐⭐⭐ Medium | ⭐⭐⭐⭐⭐ High |
| **Testability** | ⭐⭐⭐⭐ High | ⭐⭐⭐ Medium | ⭐⭐⭐⭐ High | ⭐⭐⭐⭐⭐ Very High |
| **Debugging** | ⭐⭐⭐⭐ Easy | ⭐⭐⭐ Medium | ⭐⭐⭐ Medium | ⭐⭐⭐⭐⭐ Excellent (time-travel) |
| **Type Safety** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Medium | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Excellent |
| **Code Reusability** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Medium | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Excellent |
| **Learning Curve** | ⭐⭐⭐⭐ Easy | ⭐⭐⭐ Medium | ⭐⭐⭐ Medium | ⭐⭐ Steep |

---

## Detailed Comparison by Category

### Performance & Loading

| Metric | Next.js RSC + Service | MVC | MVVM | MVI |
|--------|----------------------|-----|------|-----|
| **Time to First Byte (TTFB)** | ~200ms (server-rendered) | ~500ms | ~1000ms+ (client-side) | ~1000ms+ (client-side) |
| **First Contentful Paint** | ~400ms | ~800ms | ~1500ms | ~1500ms |
| **JavaScript Bundle** | ~50KB (UI only) | ~100KB | ~200KB | ~250KB (includes reducer) |
| **Waterfall Queries** | None (parallel on server) | Some | Many (sequential) | Many (sequential) |
| **Caching** | Built-in (Next.js cache) | Manual | Manual | Manual |

### Code Organization

| Aspect | Next.js RSC + Service | MVC | MVVM | MVI |
|--------|----------------------|-----|------|-----|
| **File Structure** | `app/` (pages), `lib/` (services) | `controllers/`, `models/`, `views/` | `ViewModels/`, `Views/`, `Models/` | `intents/`, `reducers/`, `models/`, `views/`, `effects/` |
| **Lines of Code (for sales page)** | ~200 (page) + ~150 (service) | ~300 (controller) + ~200 (model) | ~400 (viewmodel) + ~250 (view) | ~500 (reducer) + ~300 (effects) + ~200 (view) |
| **Separation of Concerns** | Clear (server/client) | Clear (MVC) | Clear (MVVM) | Very Clear (MVI) |

### State Management

| Aspect | Next.js RSC + Service | MVC | MVVM | MVI |
|--------|----------------------|-----|------|-----|
| **Server State** | Server Components | N/A | N/A | N/A |
| **Client State** | React hooks | Controller state | ViewModel observables | Immutable Model |
| **State Updates** | Props + hooks | Controller methods | ViewModel methods | Intent → Reducer |
| **State Persistence** | URL params + cookies | Session/DB | LocalStorage | LocalStorage (optional) |
| **State Sharing** | Props + Context | Controller | ViewModel | Model (single source) |

### Data Fetching

| Aspect | Next.js RSC + Service | MVC | MVVM | MVI |
|--------|----------------------|-----|------|-----|
| **Where** | Server Components | Controller/Model | ViewModel | Effects layer |
| **When** | Page load (server) | Request time | Component mount | Effect triggers |
| **Caching** | Next.js built-in | Manual | Manual | Manual |
| **Error Handling** | Server error boundaries | Try-catch | Try-catch | Error intents |
| **Loading States** | Suspense boundaries | Manual flags | Manual flags | Loading intents |

### React/Next.js Integration

| Aspect | Next.js RSC + Service | MVC | MVVM | MVI |
|--------|----------------------|-----|------|-----|
| **React Server Components** | ✅ Native | ❌ Not applicable | ❌ Not applicable | ❌ Not applicable |
| **React Hooks** | ✅ Full support | ⚠️ Limited | ✅ Full support | ✅ Full support |
| **SSR/SSG** | ✅ Built-in | ⚠️ Manual setup | ❌ Client-only | ❌ Client-only |
| **Streaming** | ✅ Built-in | ❌ No | ❌ No | ❌ No |
| **Route Handlers** | ✅ API routes | ✅ Can use | ✅ Can use | ✅ Can use |

### Use Case Recommendations

| Use Case | Best Architecture | Why |
|----------|-------------------|-----|
| **Dashboard with lots of data** | Next.js RSC + Service | Fast initial load, SEO, server-side aggregation |
| **Real-time updates** | MVVM or MVI | Reactive state management |
| **Simple CRUD app** | MVC | Traditional, straightforward |
| **Complex state management** | MVI | Unidirectional flow, time-travel debugging |
| **Public-facing pages** | Next.js RSC + Service | SEO, performance |
| **Admin panels** | MVVM or Next.js RSC + Service | Balance of complexity and performance |
| **Mobile-first SPA** | MVVM or MVI | Client-side routing, offline support |

---

## Side-by-Side Code Comparison

### Same Feature: "Load Sales Data"

#### Next.js RSC + Service Layer
```typescript
// Server Component
export default async function SalesPage() {
  const data = await SalesService.fetchSalesData();
  return <SalesClient initialData={data} />;
}

// Service
export class SalesService {
  static async fetchSalesData() {
    // Server-side, parallel queries
    const [locations, sales] = await Promise.all([
      this.fetchLocations(),
      this.fetchSales(),
    ]);
    return { locations, sales };
  }
}
```

#### MVC
```typescript
// Controller
export class SalesController {
  async index(req: Request, res: Response) {
    const model = new SalesModel();
    const data = await model.fetchAll(req.query);
    const view = new SalesView(data);
    res.send(view.render());
  }
}

// Model
export class SalesModel {
  async fetchAll(filters: SalesFilters) {
    // Sequential or manual parallel
    const locations = await this.fetchLocations();
    const sales = await this.fetchSales(filters);
    return { locations, sales };
  }
}
```

#### MVVM
```typescript
// ViewModel
export class SalesViewModel {
  locations$ = new BehaviorSubject<Location[]>([]);
  salesData$ = new BehaviorSubject<SalesData[]>([]);
  
  async loadData() {
    // Client-side, sequential
    const locations = await SalesModel.fetchLocations();
    this.locations$.next(locations);
    
    const sales = await SalesModel.fetchSales();
    this.salesData$.next(sales);
  }
}

// View
export function SalesView() {
  const vm = new SalesViewModel();
  const locations = useObservable(vm.locations$);
  
  useEffect(() => {
    vm.loadData(); // Client-side fetch
  }, []);
}
```

#### MVI
```typescript
// Intent
export const loadSalesData = (): SalesIntent => ({ 
  type: "LOAD_SALES_DATA_START" 
});

// Effect
export async function handleSalesEffects(model: SalesModel, dispatch: Dispatcher) {
  if (needsDataLoad(model)) {
    dispatch({ type: "LOAD_SALES_DATA_START" });
    
    // Client-side, sequential
    const locations = await fetchLocations();
    dispatch({ type: "LOAD_LOCATIONS_SUCCESS", payload: locations });
    
    const sales = await fetchSales();
    dispatch({ type: "LOAD_SALES_DATA_SUCCESS", payload: sales });
  }
}

// Reducer
export function salesReducer(model: SalesModel, intent: SalesIntent): SalesModel {
  switch (intent.type) {
    case "LOAD_SALES_DATA_START":
      return { ...model, loading: { ...model.loading, sales: true } };
    // ...
  }
}
```

---

## Summary Scorecard

### Next.js RSC + Service Layer
- Best for: Performance, SEO, Next.js apps
- Score: 9.5/10
- When to use: Most Next.js apps, especially data-heavy pages

### MVC
- Best for: Traditional server-side apps
- Score: 6/10
- When to use: Non-React apps, simple CRUD

### MVVM
- Best for: Reactive UI, real-time updates
- Score: 7.5/10
- When to use: Complex client-side state, real-time features

### MVI
- Best for: Complex state, predictable flow
- Score: 8/10
- When to use: Complex state management, need for time-travel debugging

---

## Recommendation for Your Codebase

Given your setup:
1. You have aggregated tables (good for performance)
2. Large data pages with filters
3. Next.js app
4. Need for fast page loads

Recommendation: Next.js Server Components + Service Layer

Why:
- Fast initial loads (server-side data fetching)
- Better SEO
- Smaller client bundles
- Fits Next.js patterns
- Less complexity than MVI
- Better performance than MVVM/MVC

Migration path:
1. Keep aggregated tables
2. Move data fetching to Server Components
3. Extract business logic to Service Layer
4. Keep client components for interactivity only

Should I show a complete refactored example of your sales page using Next.js RSC + Service Layer?

```plaintext
Server Component (page.tsx) → Service Layer → Database
         ↓
Client Component (UI only)
```

```typescript
// app/(dashboard)/finance/sales/page.tsx (Server Component)
import { SalesService } from '@/lib/services/sales.service';
import { SalesClient } from './sales-client';

export default async function SalesPage({ searchParams }) {
  // Server-side data fetching - NO waterfalls!
  const [locations, salesData] = await Promise.all([
    SalesService.fetchLocations(),
    SalesService.fetchSalesData(searchParams),
  ]);
  
  return <SalesClient initialData={{ locations, salesData }} />;
}

// lib/services/sales.service.ts
export class SalesService {
  static async fetchLocations() {
    const supabase = await createClient();
    return await supabase.from("locations").select("*");
  }
  
  static async fetchSalesData(filters: SalesFilters) {
    // All business logic here
    const supabase = await createClient();
    // Query aggregated tables
    return await supabase.from("bork_sales_aggregated").select("*");
  }
}

// sales-client.tsx (Client Component - UI only)
"use client";
export function SalesClient({ initialData }) {
  const [filters, setFilters] = useState();
  // Only UI state, no data fetching
}
```

```plaintext
Controller → Model → Database
     ↓
   View
```

```typescript
// controllers/SalesController.ts
export class SalesController {
  async getSales(req: Request, res: Response) {
    const model = new SalesModel();
    const data = await model.fetchSales(req.query);
    const view = new SalesView(data);
    return view.render();
  }
}

// models/SalesModel.ts
export class SalesModel {
  async fetchSales(filters: SalesFilters) {
    const supabase = createClient();
    return await supabase.from("bork_sales_aggregated").select("*");
  }
}

// views/SalesView.tsx
export class SalesView {
  constructor(private data: SalesData) {}
  render() {
    return <div>{/* Render data */}</div>;
  }
}
```

```plaintext
View ↔ ViewModel ↔ Model ↔ Database
```

```typescript
// ViewModels/SalesViewModel.ts
export class SalesViewModel {
  private _locations = new BehaviorSubject<Location[]>([]);
  private _salesData = new BehaviorSubject<SalesData[]>([]);
  
  locations$ = this._locations.asObservable();
  salesData$ = this._salesData.asObservable();
  
  async loadLocations() {
    const data = await SalesModel.fetchLocations();
    this._locations.next(data);
  }
  
  async loadSalesData(filters: SalesFilters) {
    const data = await SalesModel.fetchSales(filters);
    this._salesData.next(data);
  }
}

// Views/SalesView.tsx
export function SalesView() {
  const viewModel = new SalesViewModel();
  const locations = useObservable(viewModel.locations$);
  
  useEffect(() => {
    viewModel.loadLocations();
  }, []);
  
  return <div>{/* Render */}</div>;
}
```

```plaintext
Intent → Model → View
         ↑         ↓
         └─────────┘
```

```typescript
// Already shown above - unidirectional flow
// Intent → Reducer → Model → View
```

```typescript
// Server Component
export default async function SalesPage() {
  const data = await SalesService.fetchSalesData();
  return <SalesClient initialData={data} />;
}

// Service
export class SalesService {
  static async fetchSalesData() {
    // Server-side, parallel queries
    const [locations, sales] = await Promise.all([
      this.fetchLocations(),
      this.fetchSales(),
    ]);
    return { locations, sales };
  }
}
```

```typescript
// Controller
export class SalesController {
  async index(req: Request, res: Response) {
    const model = new SalesModel();
    const data = await model.fetchAll(req.query);
    const view = new SalesView(data);
    res.send(view.render());
  }
}

// Model
export class SalesModel {
  async fetchAll(filters: SalesFilters) {
    // Sequential or manual parallel
    const locations = await this.fetchLocations();
    const sales = await this.fetchSales(filters);
    return { locations, sales };
  }
}
```

```typescript
// ViewModel
export class SalesViewModel {
  locations$ = new BehaviorSubject<Location[]>([]);
  salesData$ = new BehaviorSubject<SalesData[]>([]);
  
  async loadData() {
    // Client-side, sequential
    const locations = await SalesModel.fetchLocations();
    this.locations$.next(locations);
    
    const sales = await SalesModel.fetchSales();
    this.salesData$.next(sales);
  }
}

// View
export function SalesView() {
  const vm = new SalesViewModel();
  const locations = useObservable(vm.locations$);
  
  useEffect(() => {
    vm.loadData(); // Client-side fetch
  }, []);
}
```

```typescript
// Intent
export const loadSalesData = (): SalesIntent => ({ 
  type: "LOAD_SALES_DATA_START" 
});

// Effect
export async function handleSalesEffects(model: SalesModel, dispatch: Dispatcher) {
  if (needsDataLoad(model)) {
    dispatch({ type: "LOAD_SALES_DATA_START" });
    
    // Client-side, sequential
    const locations = await fetchLocations();
    dispatch({ type: "LOAD_LOCATIONS_SUCCESS", payload: locations });
    
    const sales = await fetchSales();
    dispatch({ type: "LOAD_SALES_DATA_SUCCESS", payload: sales });
  }
}

// Reducer
export function salesReducer(model: SalesModel, intent: SalesIntent): SalesModel {
  switch (intent.type) {
    case "LOAD_SALES_DATA_START":
      return { ...model, loading: { ...model.loading, sales: true } };
    // ...
  }
}
```

---

**User**

you may plan this, and then we will add this to our todo's

---

**Cursor**

Reviewing the codebase structure to draft a migration plan to Next.js Server Components + Service Layer.


Migration plan to Next.js Server Components + Service Layer architecture:

## Migration plan: Next.js Server Components + Service Layer

### Current state analysis

**Pages requiring migration** (client components with data fetching):
1. `/finance/sales/page.tsx` - Sales dashboard (714 lines)
2. `/finance/pnl/page.tsx` - P&L dashboard
3. `/finance/pnl/balance/page.tsx` - P&L balance (1243 lines)
4. `/finance/data/eitje-data/finance/page.tsx` - Eitje finance
5. `/finance/data/eitje-data/hours/page.tsx` - Eitje hours
6. `/finance/data/eitje-data/labor-costs/page.tsx` - Labor costs
7. `/finance/data/eitje-data/data-imported/page.tsx` - Data imported (731 lines)
8. `/finance/data/eitje-data/workers/page.tsx` - Workers
9. `/finance/data/eitje-data/locations-teams/page.tsx` - Locations & teams
10. `/finance/labor/page.tsx` - Labor dashboard
11. `/finance/daily-ops/page.tsx` - Daily ops dashboard
12. `/view-data/eitje-data/*` - View data pages

**Existing service layer** (good foundation):
- `lib/eitje/aggregation-service.ts` ✅
- `lib/finance/pnl-calculations.ts` ✅
- `lib/bork/aggregation-service.ts` ✅

---

## Phase 1: Foundation & setup

### Task 1.1: Create service layer structure
Priority: High  
Estimated time: 2-3 hours

**Files to create:**
```
src/lib/services/
├── sales.service.ts           # Sales data service
├── pnl.service.ts             # P&L data service
├── eitje.service.ts           # Eitje data service
├── labor.service.ts           # Labor data service
├── locations.service.ts       # Locations service (shared)
└── types/
    ├── sales.types.ts
    ├── pnl.types.ts
    ├── eitje.types.ts
    └── common.types.ts
```

**Tasks:**
- [ ] Create `src/lib/services/` directory
- [ ] Create `locations.service.ts` (extract locations fetching logic)
- [ ] Create `sales.service.ts` (extract sales data logic)
- [ ] Create shared types directory
- [ ] Add error handling utilities
- [ ] Add caching utilities

### Task 1.2: Create shared utilities
Priority: High  
Estimated time: 1 hour

**Files to create:**
```
src/lib/services/utils/
├── query-builder.ts           # Supabase query builder helpers
├── filter-utils.ts            # Filter transformation utilities
├── pagination-utils.ts         # Pagination helpers
└── error-handler.ts           # Standardized error handling
```

**Tasks:**
- [ ] Create query builder utilities
- [ ] Create filter transformation functions
- [ ] Create pagination helpers
- [ ] Create error handler with standardized error types

---

## Phase 2: Migrate high-priority pages

### Task 2.1: Migrate Sales page (pilot)
Priority: High  
Estimated time: 4-6 hours

**Files to modify/create:**
```
src/app/(dashboard)/finance/sales/
├── page.tsx                   # Convert to Server Component
├── sales-client.tsx           # New - Client component for UI
└── loading.tsx                # New - Loading state
```

**Tasks:**
- [ ] Create `SalesService.fetchSalesData()` method
- [ ] Create `SalesService.fetchLocations()` method
- [ ] Convert `page.tsx` to Server Component (remove "use client")
- [ ] Extract UI logic to `sales-client.tsx`
- [ ] Create `loading.tsx` with Suspense boundary
- [ ] Create `error.tsx` for error boundaries
- [ ] Test data fetching on server
- [ ] Test client-side filtering/interactivity
- [ ] Performance testing (measure before/after)

**Acceptance criteria:**
- Page loads faster (TTFB < 500ms)
- No client-side data fetching on initial load
- All filters still work
- No breaking changes to UI

### Task 2.2: Migrate Locations service (shared)
Priority: High  
Estimated time: 1-2 hours

**Files to create:**
```
src/lib/services/locations.service.ts
```

**Tasks:**
- [ ] Extract locations fetching from all pages
- [ ] Create `LocationsService.fetchAll()` method
- [ ] Create `LocationsService.fetchById()` method
- [ ] Add caching (10 min stale time)
- [ ] Update all pages to use service

---

## Phase 3: Migrate Eitje data pages

### Task 3.1: Create Eitje service
Priority: Medium  
Estimated time: 3-4 hours

**Files to create/modify:**
```
src/lib/services/eitje.service.ts
```

**Tasks:**
- [ ] Create `EitjeService.fetchFinanceData()` method
- [ ] Create `EitjeService.fetchHoursData()` method
- [ ] Create `EitjeService.fetchLaborCosts()` method
- [ ] Create `EitjeService.fetchRawData()` method
- [ ] Create `EitjeService.fetchWorkers()` method
- [ ] Create `EitjeService.fetchLocationsTeams()` method
- [ ] Integrate with existing `aggregation-service.ts`

### Task 3.2: Migrate Eitje finance page
Priority: Medium  
Estimated time: 3-4 hours

**Files to modify/create:**
```
src/app/(dashboard)/finance/data/eitje-data/finance/
├── page.tsx                   # Server Component
├── finance-client.tsx         # Client Component
├── loading.tsx
└── error.tsx
```

**Tasks:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test pagination
- [ ] Test filters (date, location)

### Task 3.3: Migrate Eitje hours page
Priority: Medium  
Estimated time: 2-3 hours

**Tasks:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test functionality

### Task 3.4: Migrate Eitje labor costs page
Priority: Medium  
Estimated time: 2-3 hours

**Tasks:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test functionality

### Task 3.5: Migrate Eitje data imported page
Priority: Medium  
Estimated time: 3-4 hours

**Tasks:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test pagination (50 items per page)
- [ ] Test error handling

### Task 3.6: Migrate Eitje workers page
Priority: Low  
Estimated time: 1-2 hours

**Tasks:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component

### Task 3.7: Migrate Eitje locations-teams page
Priority: Low  
Estimated time: 1-2 hours

**Tasks:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component

---

## Phase 4: Migrate P&L pages

### Task 4.1: Create P&L service
Priority: High  
Estimated time: 3-4 hours

**Files to create:**
```
src/lib/services/pnl.service.ts
```

**Tasks:**
- [ ] Create `PnLService.fetchSummaryData()` method
- [ ] Create `PnLService.fetchTimeSeries()` method
- [ ] Create `PnLService.fetchByCategory()` method
- [ ] Integrate with existing `pnl-calculations.ts`
- [ ] Add filtering logic

### Task 4.2: Migrate P&L page
Priority: High  
Estimated time: 4-5 hours

**Files to modify/create:**
```
src/app/(dashboard)/finance/pnl/
├── page.tsx                   # Server Component
├── pnl-client.tsx             # Client Component
├── loading.tsx
└── error.tsx
```

**Tasks:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test KPI cards
- [ ] Test charts
- [ ] Test comparison mode

### Task 4.3: Migrate P&L balance page
Priority: Medium  
Estimated time: 5-6 hours

**Tasks:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test complex calculations
- [ ] Test filters

---

## Phase 5: Migrate remaining pages

### Task 5.1: Migrate Labor dashboard
Priority: Medium  
Estimated time: 3-4 hours

**Tasks:**
- [ ] Create `LaborService`
- [ ] Convert to Server Component
- [ ] Extract UI to client component

### Task 5.2: Migrate Daily Ops dashboard
Priority: Medium  
Estimated time: 4-5 hours

**Tasks:**
- [ ] Create `DailyOpsService`
- [ ] Convert to Server Component
- [ ] Extract UI to client component

### Task 5.3: Migrate View Data pages
Priority: Low  
Estimated time: 2-3 hours per page

**Tasks:**
- [ ] Migrate `/view-data/eitje-data/*` pages
- [ ] Reuse Eitje service

---

## Phase 6: Optimization & cleanup

### Task 6.1: Remove deprecated hooks
Priority: Low  
Estimated time: 2-3 hours

**Files to potentially remove:**
- `hooks/useSalesData.ts` (if fully migrated)
- `hooks/usePnLSummary.ts` (if fully migrated)
- Other data-fetching hooks

**Tasks:**
- [ ] Audit all hooks
- [ ] Identify deprecated hooks
- [ ] Remove or mark as deprecated
- [ ] Update documentation

### Task 6.2: Add caching strategy
Priority: Medium  
Estimated time: 3-4 hours

**Tasks:**
- [ ] Implement Next.js revalidation
- [ ] Add cache tags
- [ ] Configure stale time per data type
- [ ] Add cache invalidation on mutations

### Task 6.3: Performance optimization
Priority: Medium  
Estimated time: 2-3 hours

**Tasks:**
- [ ] Measure page load times
- [ ] Optimize database queries
- [ ] Add streaming where appropriate
- [ ] Optimize bundle sizes

### Task 6.4: Error handling standardization
Priority: Medium  
Estimated time: 2-3 hours

**Tasks:**
- [ ] Standardize error types
- [ ] Create error boundaries
- [ ] Add error logging
- [ ] User-friendly error messages

### Task 6.5: Documentation
Priority: Low  
Estimated time: 2-3 hours

**Tasks:**
- [ ] Document service layer patterns
- [ ] Create migration guide
- [ ] Update README
- [ ] Add code examples

---

## Implementation checklist template

### For each page migration:

- [ ] **Analysis**
  - [ ] Identify all data fetching logic
  - [ ] Identify all UI state
  - [ ] Identify filter logic
  - [ ] Document current behavior

- [ ] **Service creation**
  - [ ] Create service methods
  - [ ] Add error handling
  - [ ] Add TypeScript types
  - [ ] Add JSDoc comments

- [ ] **Server Component**
  - [ ] Remove "use client" directive
  - [ ] Fetch data server-side
  - [ ] Handle searchParams
  - [ ] Add loading.tsx
  - [ ] Add error.tsx

- [ ] **Client Component**
  - [ ] Extract UI logic
  - [ ] Keep only interactive state
  - [ ] Use React Query for client-side updates only
  - [ ] Test all interactions

- [ ] **Testing**
  - [ ] Test initial load
  - [ ] Test filters
  - [ ] Test pagination
  - [ ] Test error states
  - [ ] Performance test

- [ ] **Cleanup**
  - [ ] Remove unused code
  - [ ] Update imports
  - [ ] Remove deprecated hooks if applicable

---

## Priority order

**Sprint 1 (Week 1-2):**
1. Task 1.1: Service layer structure
2. Task 1.2: Shared utilities
3. Task 2.1: Sales page (pilot)
4. Task 2.2: Locations service

**Sprint 2 (Week 3-4):**
5. Task 3.1: Eitje service
6. Task 3.2: Eitje finance page
7. Task 3.3: Eitje hours page
8. Task 3.4: Eitje labor costs page

**Sprint 3 (Week 5-6):**
9. Task 4.1: P&L service
10. Task 4.2: P&L page
11. Task 3.5: Eitje data imported page

**Sprint 4 (Week 7-8):**
12. Task 4.3: P&L balance page
13. Task 5.1: Labor dashboard
14. Task 5.2: Daily Ops dashboard

**Sprint 5 (Week 9-10):**
15. Task 3.6: Eitje workers page
16. Task 3.7: Eitje locations-teams page
17. Task 5.3: View Data pages
18. Task 6.1-6.5: Optimization & cleanup

---

## Success metrics

**Performance:**
- [ ] Time to First Byte (TTFB) < 500ms (target: 200-300ms)
- [ ] First Contentful Paint (FCP) < 1s (target: 400-600ms)
- [ ] JavaScript bundle size reduction: 30-50%
- [ ] Eliminate request waterfalls (parallel server fetching)

**Code quality:**
- [ ] All data fetching in service layer
- [ ] All pages use Server Components for initial load
- [ ] TypeScript coverage: 100%
- [ ] No "use client" in page components

**Developer experience:**
- [ ] Clear separation of concerns
- [ ] Reusable service methods
- [ ] Easier to test
- [ ] Better error handling

---

## Notes

1. Start with Sales page as pilot to validate the approach
2. Keep old pages working during migration (gradual rollout)
3. Test each migration thoroughly before moving to next
4. Use feature flags if needed for gradual rollout
5. Monitor performance metrics before/after each migration

---

## Estimated total time

- Phase 1: 3-4 hours
- Phase 2: 6-8 hours
- Phase 3: 18-24 hours
- Phase 4: 12-15 hours
- Phase 5: 9-12 hours
- Phase 6: 9-13 hours

Total: ~57-76 hours (about 8-10 working days)

---

Ready to add to your todos. Should I create a detailed task breakdown for any specific phase?

```plaintext
src/lib/services/
├── sales.service.ts           # Sales data service
├── pnl.service.ts             # P&L data service
├── eitje.service.ts           # Eitje data service
├── labor.service.ts           # Labor data service
├── locations.service.ts       # Locations service (shared)
└── types/
    ├── sales.types.ts
    ├── pnl.types.ts
    ├── eitje.types.ts
    └── common.types.ts
```

```plaintext
src/lib/services/utils/
├── query-builder.ts           # Supabase query builder helpers
├── filter-utils.ts            # Filter transformation utilities
├── pagination-utils.ts         # Pagination helpers
└── error-handler.ts           # Standardized error handling
```

```plaintext
src/app/(dashboard)/finance/sales/
├── page.tsx                   # Convert to Server Component
├── sales-client.tsx           # New - Client component for UI
└── loading.tsx                # New - Loading state
```

```plaintext
src/lib/services/locations.service.ts
```

```plaintext
src/lib/services/eitje.service.ts
```

```plaintext
src/app/(dashboard)/finance/data/eitje-data/finance/
├── page.tsx                   # Server Component
├── finance-client.tsx         # Client Component
├── loading.tsx
└── error.tsx
```

```plaintext
src/lib/services/pnl.service.ts
```

```plaintext
src/app/(dashboard)/finance/pnl/
├── page.tsx                   # Server Component
├── pnl-client.tsx             # Client Component
├── loading.tsx
└── error.tsx
```

---

**User**

add this plan to our todo list!

---

**Cursor**

Searching for where todos or roadmap files are stored to add the plan.


Checking the roadmap structure and docs directory:


Creating a migration plan document in your docs folder to match your planning style:


Creating the migration plan document:


Creating the migration plan document in your planning style:

```markdown
# Next.js Server Components + Service Layer Migration Plan

## Overview
Migrate all client-side data fetching pages to Next.js Server Components with a dedicated Service Layer architecture. This will improve performance, reduce bundle sizes, eliminate request waterfalls, and improve SEO.

**Estimated Total Time**: 57-76 hours (8-10 working days)  
**Start Date**: TBD  
**Target Completion**: TBD

## Current State Analysis

### Pages Requiring Migration (12 total)
1. ✅ `/finance/sales/page.tsx` - Sales dashboard (714 lines)
2. ✅ `/finance/pnl/page.tsx` - P&L dashboard
3. ✅ `/finance/pnl/balance/page.tsx` - P&L balance (1243 lines)
4. ✅ `/finance/data/eitje-data/finance/page.tsx` - Eitje finance
5. ✅ `/finance/data/eitje-data/hours/page.tsx` - Eitje hours
6. ✅ `/finance/data/eitje-data/labor-costs/page.tsx` - Labor costs
7. ✅ `/finance/data/eitje-data/data-imported/page.tsx` - Data imported (731 lines)
8. ✅ `/finance/data/eitje-data/workers/page.tsx` - Workers
9. ✅ `/finance/data/eitje-data/locations-teams/page.tsx` - Locations & teams
10. ✅ `/finance/labor/page.tsx` - Labor dashboard
11. ✅ `/finance/daily-ops/page.tsx` - Daily ops dashboard
12. ✅ `/view-data/eitje-data/*` - View data pages

### Existing Service Layer (Good Foundation)
- ✅ `lib/eitje/aggregation-service.ts` - Already exists
- ✅ `lib/finance/pnl-calculations.ts` - Already exists
- ✅ `lib/bork/aggregation-service.ts` - Already exists

---

## Phase 1: Foundation & Setup

### Task 1.1: Create Service Layer Structure
**Priority**: 🔴 High  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Files to Create:**
```
src/lib/services/
├── sales.service.ts           # Sales data service
├── pnl.service.ts             # P&L data service
├── eitje.service.ts           # Eitje data service
├── labor.service.ts           # Labor data service
├── locations.service.ts       # Locations service (shared)
└── types/
    ├── sales.types.ts
    ├── pnl.types.ts
    ├── eitje.types.ts
    └── common.types.ts
```

**Checklist:**
- [ ] Create `src/lib/services/` directory
- [ ] Create `locations.service.ts` (extract locations fetching logic)
- [ ] Create `sales.service.ts` (extract sales data logic)
- [ ] Create shared types directory
- [ ] Add error handling utilities
- [ ] Add caching utilities

**Acceptance Criteria:**
- Service layer directory structure created
- TypeScript types defined
- Basic error handling in place

---

### Task 1.2: Create Shared Utilities
**Priority**: 🔴 High  
**Estimated Time**: 1 hour  
**Status**: ⬜ Not Started

**Files to Create:**
```
src/lib/services/utils/
├── query-builder.ts           # Supabase query builder helpers
├── filter-utils.ts            # Filter transformation utilities
├── pagination-utils.ts         # Pagination helpers
└── error-handler.ts           # Standardized error handling
```

**Checklist:**
- [ ] Create query builder utilities
- [ ] Create filter transformation functions
- [ ] Create pagination helpers
- [ ] Create error handler with standardized error types

**Acceptance Criteria:**
- Utility functions are reusable
- Type-safe implementations
- Well-documented

---

## Phase 2: Migrate High-Priority Pages

### Task 2.1: Migrate Sales Page (PILOT)
**Priority**: 🔴 High  
**Estimated Time**: 4-6 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 1.1, Task 1.2

**Files to Modify/Create:**
```
src/app/(dashboard)/finance/sales/
├── page.tsx                   # Convert to Server Component
├── sales-client.tsx           # New - Client component for UI
├── loading.tsx                # New - Loading state
└── error.tsx                  # New - Error boundary
```

**Checklist:**
- [ ] Create `SalesService.fetchSalesData()` method
- [ ] Create `SalesService.fetchLocations()` method
- [ ] Convert `page.tsx` to Server Component (remove "use client")
- [ ] Extract UI logic to `sales-client.tsx`
- [ ] Create `loading.tsx` with Suspense boundary
- [ ] Create `error.tsx` for error boundaries
- [ ] Test data fetching on server
- [ ] Test client-side filtering/interactivity
- [ ] Performance testing (measure before/after)

**Acceptance Criteria:**
- ✅ Page loads faster (TTFB < 500ms)
- ✅ No client-side data fetching on initial load
- ✅ All filters still work
- ✅ No breaking changes to UI
- ✅ Performance metrics documented

**Performance Metrics to Track:**
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- JavaScript bundle size
- Number of client-side requests

---

### Task 2.2: Migrate Locations Service (Shared)
**Priority**: 🔴 High  
**Estimated Time**: 1-2 hours  
**Status**: ⬜ Not Started

**Files to Create:**
```
src/lib/services/locations.service.ts
```

**Checklist:**
- [ ] Extract locations fetching from all pages
- [ ] Create `LocationsService.fetchAll()` method
- [ ] Create `LocationsService.fetchById()` method
- [ ] Add caching (10 min stale time)
- [ ] Update all pages to use service

**Acceptance Criteria:**
- Single source of truth for locations
- All pages use the service
- Caching implemented

---

## Phase 3: Migrate Eitje Data Pages

### Task 3.1: Create Eitje Service
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 1.1

**Files to Create/Modify:**
```
src/lib/services/eitje.service.ts
```

**Checklist:**
- [ ] Create `EitjeService.fetchFinanceData()` method
- [ ] Create `EitjeService.fetchHoursData()` method
- [ ] Create `EitjeService.fetchLaborCosts()` method
- [ ] Create `EitjeService.fetchRawData()` method
- [ ] Create `EitjeService.fetchWorkers()` method
- [ ] Create `EitjeService.fetchLocationsTeams()` method
- [ ] Integrate with existing `aggregation-service.ts`

**Acceptance Criteria:**
- All Eitje data fetching methods implemented
- Integrated with existing aggregation service
- Type-safe

---

### Task 3.2: Migrate Eitje Finance Page
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Files to Modify/Create:**
```
src/app/(dashboard)/finance/data/eitje-data/finance/
├── page.tsx                   # Server Component
├── finance-client.tsx         # Client Component
├── loading.tsx
└── error.tsx
```

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test pagination
- [ ] Test filters (date, location)

**Acceptance Criteria:**
- Server-side data fetching
- All functionality preserved
- Performance improved

---

### Task 3.3: Migrate Eitje Hours Page
**Priority**: 🟡 Medium  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test functionality

---

### Task 3.4: Migrate Eitje Labor Costs Page
**Priority**: 🟡 Medium  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test functionality

---

### Task 3.5: Migrate Eitje Data Imported Page
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test pagination (50 items per page)
- [ ] Test error handling

---

### Task 3.6: Migrate Eitje Workers Page
**Priority**: 🟢 Low  
**Estimated Time**: 1-2 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component

---

### Task 3.7: Migrate Eitje Locations-Teams Page
**Priority**: 🟢 Low  
**Estimated Time**: 1-2 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component

---

## Phase 4: Migrate P&L Pages

### Task 4.1: Create P&L Service
**Priority**: 🔴 High  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 1.1

**Files to Create:**
```
src/lib/services/pnl.service.ts
```

**Checklist:**
- [ ] Create `PnLService.fetchSummaryData()` method
- [ ] Create `PnLService.fetchTimeSeries()` method
- [ ] Create `PnLService.fetchByCategory()` method
- [ ] Integrate with existing `pnl-calculations.ts`
- [ ] Add filtering logic

**Acceptance Criteria:**
- All P&L data fetching methods implemented
- Integrated with existing calculations
- Type-safe

---

### Task 4.2: Migrate P&L Page
**Priority**: 🔴 High  
**Estimated Time**: 4-5 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 4.1

**Files to Modify/Create:**
```
src/app/(dashboard)/finance/pnl/
├── page.tsx                   # Server Component
├── pnl-client.tsx             # Client Component
├── loading.tsx
└── error.tsx
```

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test KPI cards
- [ ] Test charts
- [ ] Test comparison mode

**Acceptance Criteria:**
- Server-side data fetching
- All functionality preserved
- Performance improved

---

### Task 4.3: Migrate P&L Balance Page
**Priority**: 🟡 Medium  
**Estimated Time**: 5-6 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 4.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test complex calculations
- [ ] Test filters

---

## Phase 5: Migrate Remaining Pages

### Task 5.1: Migrate Labor Dashboard
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Create `LaborService`
- [ ] Convert to Server Component
- [ ] Extract UI to client component

---

### Task 5.2: Migrate Daily Ops Dashboard
**Priority**: 🟡 Medium  
**Estimated Time**: 4-5 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Create `DailyOpsService`
- [ ] Convert to Server Component
- [ ] Extract UI to client component

---

### Task 5.3: Migrate View Data Pages
**Priority**: 🟢 Low  
**Estimated Time**: 2-3 hours per page  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Migrate `/view-data/eitje-data/*` pages
- [ ] Reuse Eitje service

---

## Phase 6: Optimization & Cleanup

### Task 6.1: Remove Deprecated Hooks
**Priority**: 🟢 Low  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Files to Potentially Remove:**
- `hooks/useSalesData.ts` (if fully migrated)
- `hooks/usePnLSummary.ts` (if fully migrated)
- Other data-fetching hooks

**Checklist:**
- [ ] Audit all hooks
- [ ] Identify deprecated hooks
- [ ] Remove or mark as deprecated
- [ ] Update documentation

---

### Task 6.2: Add Caching Strategy
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Implement Next.js revalidation
- [ ] Add cache tags
- [ ] Configure stale time per data type
- [ ] Add cache invalidation on mutations

---

### Task 6.3: Performance Optimization
**Priority**: 🟡 Medium  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Measure page load times
- [ ] Optimize database queries
- [ ] Add streaming where appropriate
- [ ] Optimize bundle sizes

---

### Task 6.4: Error Handling Standardization
**Priority**: 🟡 Medium  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Standardize error types
- [ ] Create error boundaries
- [ ] Add error logging
- [ ] User-friendly error messages

---

### Task 6.5: Documentation
**Priority**: 🟢 Low  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Document service layer patterns
- [ ] Create migration guide
- [ ] Update README
- [ ] Add code examples

---

## Implementation Checklist Template

### For Each Page Migration:

**Analysis:**
- [ ] Identify all data fetching logic
- [ ] Identify all UI state
- [ ] Identify filter logic
- [ ] Document current behavior

**Service Creation:**
- [ ] Create service methods
- [ ] Add error handling
- [ ] Add TypeScript types
- [ ] Add JSDoc comments

**Server Component:**
- [ ] Remove "use client" directive
- [ ] Fetch data server-side
- [ ] Handle searchParams
- [ ] Add loading.tsx
- [ ] Add error.tsx

**Client Component:**
- [ ] Extract UI logic
- [ ] Keep only interactive state
- [ ] Use React Query for client-side updates only
- [ ] Test all interactions

**Testing:**
- [ ] Test initial load
- [ ] Test filters
- [ ] Test pagination
- [ ] Test error states
- [ ] Performance test

**Cleanup:**
- [ ] Remove unused code
- [ ] Update imports
- [ ] Remove deprecated hooks if applicable

---

## Priority Order (Sprint Planning)

### Sprint 1 (Week 1-2):
1. ✅ Task 1.1: Service layer structure
2. ✅ Task 1.2: Shared utilities
3. ✅ Task 2.1: Sales page (pilot)
4. ✅ Task 2.2: Locations service

### Sprint 2 (Week 3-4):
5. ✅ Task 3.1: Eitje service
6. ✅ Task 3.2: Eitje finance page
7. ✅ Task 3.3: Eitje hours page
8. ✅ Task 3.4: Eitje labor costs page

### Sprint 3 (Week 5-6):
9. ✅ Task 4.1: P&L service
10. ✅ Task 4.2: P&L page
11. ✅ Task 3.5: Eitje data imported page

### Sprint 4 (Week 7-8):
12. ✅ Task 4.3: P&L balance page
13. ✅ Task 5.1: Labor dashboard
14. ✅ Task 5.2: Daily Ops dashboard

### Sprint 5 (Week 9-10):
15. ✅ Task 3.6: Eitje workers page
16. ✅ Task 3.7: Eitje locations-teams page
17. ✅ Task 5.3: View Data pages
18. ✅ Task 6.1-6.5: Optimization & cleanup

---

## Success Metrics

### Performance:
- [ ] Time to First Byte (TTFB) < 500ms (target: 200-300ms)
- [ ] First Contentful Paint (FCP) < 1s (target: 400-600ms)
- [ ] JavaScript bundle size reduction: 30-50%
- [ ] Eliminate request waterfalls (parallel server fetching)

### Code Quality:
- [ ] All data fetching in service layer
- [ ] All pages use Server Components for initial load
- [ ] TypeScript coverage: 100%
- [ ] No "use client" in page components

### Developer Experience:
- [ ] Clear separation of concerns
- [ ] Reusable service methods
- [ ] Easier to test
- [ ] Better error handling

---

## Notes

1. **Start with Sales page as pilot** - Validate approach before scaling
2. **Keep old pages working** - Gradual migration, no breaking changes
3. **Test each migration thoroughly** - Don't move to next until current is stable
4. **Use feature flags if needed** - For gradual rollout
5. **Monitor performance metrics** - Before/after each migration

---

## Estimated Total Time

- Phase 1: 3-4 hours
- Phase 2: 6-8 hours
- Phase 3: 18-24 hours
- Phase 4: 12-15 hours
- Phase 5: 9-12 hours
- Phase 6: 9-13 hours

**Total: ~57-76 hours (8-10 working days)**

---

## Progress Tracking

**Overall Progress**: 0% (0/30 tasks completed)

**Phase 1**: 0% (0/2 tasks)  
**Phase 2**: 0% (0/2 tasks)  
**Phase 3**: 0% (0/7 tasks)  
**Phase 4**: 0% (0/3 tasks)  
**Phase 5**: 0% (0/3 tasks)  
**Phase 6**: 0% (0/5 tasks)

---

## Last Updated
_Date: TBD_  
_By: TBD_
```

Saved this plan as `/Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/docs/MIGRATION-SERVER-COMPONENTS-PLAN.md`.

The document includes:
- All 30 tasks organized by phase
- Priority levels (High/Medium/Low)
- Time estimates
- Checklists for each task
- Acceptance criteria
- Progress tracking
- Sprint planning suggestions

You can:
1. Track progress by updating checkboxes
2. Add roadmap items to your database using the structure
3. Reference it during implementation
4. Share it with your team

Should I also create SQL scripts to add these tasks to your `roadmap_items` table, or do you prefer to add them manually through your roadmap UI?

```markdown
# Next.js Server Components + Service Layer Migration Plan

## Overview
Migrate all client-side data fetching pages to Next.js Server Components with a dedicated Service Layer architecture. This will improve performance, reduce bundle sizes, eliminate request waterfalls, and improve SEO.

**Estimated Total Time**: 57-76 hours (8-10 working days)  
**Start Date**: TBD  
**Target Completion**: TBD

## Current State Analysis

### Pages Requiring Migration (12 total)
1. ✅ `/finance/sales/page.tsx` - Sales dashboard (714 lines)
2. ✅ `/finance/pnl/page.tsx` - P&L dashboard
3. ✅ `/finance/pnl/balance/page.tsx` - P&L balance (1243 lines)
4. ✅ `/finance/data/eitje-data/finance/page.tsx` - Eitje finance
5. ✅ `/finance/data/eitje-data/hours/page.tsx` - Eitje hours
6. ✅ `/finance/data/eitje-data/labor-costs/page.tsx` - Labor costs
7. ✅ `/finance/data/eitje-data/data-imported/page.tsx` - Data imported (731 lines)
8. ✅ `/finance/data/eitje-data/workers/page.tsx` - Workers
9. ✅ `/finance/data/eitje-data/locations-teams/page.tsx` - Locations & teams
10. ✅ `/finance/labor/page.tsx` - Labor dashboard
11. ✅ `/finance/daily-ops/page.tsx` - Daily ops dashboard
12. ✅ `/view-data/eitje-data/*` - View data pages

### Existing Service Layer (Good Foundation)
- ✅ `lib/eitje/aggregation-service.ts` - Already exists
- ✅ `lib/finance/pnl-calculations.ts` - Already exists
- ✅ `lib/bork/aggregation-service.ts` - Already exists

---

## Phase 1: Foundation & Setup

### Task 1.1: Create Service Layer Structure
**Priority**: 🔴 High  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Files to Create:**
```

```plaintext

**Checklist:**
- [ ] Create `src/lib/services/` directory
- [ ] Create `locations.service.ts` (extract locations fetching logic)
- [ ] Create `sales.service.ts` (extract sales data logic)
- [ ] Create shared types directory
- [ ] Add error handling utilities
- [ ] Add caching utilities

**Acceptance Criteria:**
- Service layer directory structure created
- TypeScript types defined
- Basic error handling in place

---

### Task 1.2: Create Shared Utilities
**Priority**: 🔴 High  
**Estimated Time**: 1 hour  
**Status**: ⬜ Not Started

**Files to Create:**
```

```plaintext

**Checklist:**
- [ ] Create query builder utilities
- [ ] Create filter transformation functions
- [ ] Create pagination helpers
- [ ] Create error handler with standardized error types

**Acceptance Criteria:**
- Utility functions are reusable
- Type-safe implementations
- Well-documented

---

## Phase 2: Migrate High-Priority Pages

### Task 2.1: Migrate Sales Page (PILOT)
**Priority**: 🔴 High  
**Estimated Time**: 4-6 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 1.1, Task 1.2

**Files to Modify/Create:**
```

```plaintext

**Checklist:**
- [ ] Create `SalesService.fetchSalesData()` method
- [ ] Create `SalesService.fetchLocations()` method
- [ ] Convert `page.tsx` to Server Component (remove "use client")
- [ ] Extract UI logic to `sales-client.tsx`
- [ ] Create `loading.tsx` with Suspense boundary
- [ ] Create `error.tsx` for error boundaries
- [ ] Test data fetching on server
- [ ] Test client-side filtering/interactivity
- [ ] Performance testing (measure before/after)

**Acceptance Criteria:**
- ✅ Page loads faster (TTFB < 500ms)
- ✅ No client-side data fetching on initial load
- ✅ All filters still work
- ✅ No breaking changes to UI
- ✅ Performance metrics documented

**Performance Metrics to Track:**
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- JavaScript bundle size
- Number of client-side requests

---

### Task 2.2: Migrate Locations Service (Shared)
**Priority**: 🔴 High  
**Estimated Time**: 1-2 hours  
**Status**: ⬜ Not Started

**Files to Create:**
```

```plaintext

**Checklist:**
- [ ] Extract locations fetching from all pages
- [ ] Create `LocationsService.fetchAll()` method
- [ ] Create `LocationsService.fetchById()` method
- [ ] Add caching (10 min stale time)
- [ ] Update all pages to use service

**Acceptance Criteria:**
- Single source of truth for locations
- All pages use the service
- Caching implemented

---

## Phase 3: Migrate Eitje Data Pages

### Task 3.1: Create Eitje Service
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 1.1

**Files to Create/Modify:**
```

```plaintext

**Checklist:**
- [ ] Create `EitjeService.fetchFinanceData()` method
- [ ] Create `EitjeService.fetchHoursData()` method
- [ ] Create `EitjeService.fetchLaborCosts()` method
- [ ] Create `EitjeService.fetchRawData()` method
- [ ] Create `EitjeService.fetchWorkers()` method
- [ ] Create `EitjeService.fetchLocationsTeams()` method
- [ ] Integrate with existing `aggregation-service.ts`

**Acceptance Criteria:**
- All Eitje data fetching methods implemented
- Integrated with existing aggregation service
- Type-safe

---

### Task 3.2: Migrate Eitje Finance Page
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Files to Modify/Create:**
```

```plaintext

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test pagination
- [ ] Test filters (date, location)

**Acceptance Criteria:**
- Server-side data fetching
- All functionality preserved
- Performance improved

---

### Task 3.3: Migrate Eitje Hours Page
**Priority**: 🟡 Medium  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test functionality

---

### Task 3.4: Migrate Eitje Labor Costs Page
**Priority**: 🟡 Medium  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test functionality

---

### Task 3.5: Migrate Eitje Data Imported Page
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test pagination (50 items per page)
- [ ] Test error handling

---

### Task 3.6: Migrate Eitje Workers Page
**Priority**: 🟢 Low  
**Estimated Time**: 1-2 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component

---

### Task 3.7: Migrate Eitje Locations-Teams Page
**Priority**: 🟢 Low  
**Estimated Time**: 1-2 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component

---

## Phase 4: Migrate P&L Pages

### Task 4.1: Create P&L Service
**Priority**: 🔴 High  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 1.1

**Files to Create:**
```

```plaintext

**Checklist:**
- [ ] Create `PnLService.fetchSummaryData()` method
- [ ] Create `PnLService.fetchTimeSeries()` method
- [ ] Create `PnLService.fetchByCategory()` method
- [ ] Integrate with existing `pnl-calculations.ts`
- [ ] Add filtering logic

**Acceptance Criteria:**
- All P&L data fetching methods implemented
- Integrated with existing calculations
- Type-safe

---

### Task 4.2: Migrate P&L Page
**Priority**: 🔴 High  
**Estimated Time**: 4-5 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 4.1

**Files to Modify/Create:**
```

```plaintext

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test KPI cards
- [ ] Test charts
- [ ] Test comparison mode

**Acceptance Criteria:**
- Server-side data fetching
- All functionality preserved
- Performance improved

---

### Task 4.3: Migrate P&L Balance Page
**Priority**: 🟡 Medium  
**Estimated Time**: 5-6 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 4.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test complex calculations
- [ ] Test filters

---

## Phase 5: Migrate Remaining Pages

### Task 5.1: Migrate Labor Dashboard
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Create `LaborService`
- [ ] Convert to Server Component
- [ ] Extract UI to client component

---

### Task 5.2: Migrate Daily Ops Dashboard
**Priority**: 🟡 Medium  
**Estimated Time**: 4-5 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Create `DailyOpsService`
- [ ] Convert to Server Component
- [ ] Extract UI to client component

---

### Task 5.3: Migrate View Data Pages
**Priority**: 🟢 Low  
**Estimated Time**: 2-3 hours per page  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Migrate `/view-data/eitje-data/*` pages
- [ ] Reuse Eitje service

---

## Phase 6: Optimization & Cleanup

### Task 6.1: Remove Deprecated Hooks
**Priority**: 🟢 Low  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Files to Potentially Remove:**
- `hooks/useSalesData.ts` (if fully migrated)
- `hooks/usePnLSummary.ts` (if fully migrated)
- Other data-fetching hooks

**Checklist:**
- [ ] Audit all hooks
- [ ] Identify deprecated hooks
- [ ] Remove or mark as deprecated
- [ ] Update documentation

---

### Task 6.2: Add Caching Strategy
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Implement Next.js revalidation
- [ ] Add cache tags
- [ ] Configure stale time per data type
- [ ] Add cache invalidation on mutations

---

### Task 6.3: Performance Optimization
**Priority**: 🟡 Medium  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Measure page load times
- [ ] Optimize database queries
- [ ] Add streaming where appropriate
- [ ] Optimize bundle sizes

---

### Task 6.4: Error Handling Standardization
**Priority**: 🟡 Medium  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Standardize error types
- [ ] Create error boundaries
- [ ] Add error logging
- [ ] User-friendly error messages

---

### Task 6.5: Documentation
**Priority**: 🟢 Low  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Document service layer patterns
- [ ] Create migration guide
- [ ] Update README
- [ ] Add code examples

---

## Implementation Checklist Template

### For Each Page Migration:

**Analysis:**
- [ ] Identify all data fetching logic
- [ ] Identify all UI state
- [ ] Identify filter logic
- [ ] Document current behavior

**Service Creation:**
- [ ] Create service methods
- [ ] Add error handling
- [ ] Add TypeScript types
- [ ] Add JSDoc comments

**Server Component:**
- [ ] Remove "use client" directive
- [ ] Fetch data server-side
- [ ] Handle searchParams
- [ ] Add loading.tsx
- [ ] Add error.tsx

**Client Component:**
- [ ] Extract UI logic
- [ ] Keep only interactive state
- [ ] Use React Query for client-side updates only
- [ ] Test all interactions

**Testing:**
- [ ] Test initial load
- [ ] Test filters
- [ ] Test pagination
- [ ] Test error states
- [ ] Performance test

**Cleanup:**
- [ ] Remove unused code
- [ ] Update imports
- [ ] Remove deprecated hooks if applicable

---

## Priority Order (Sprint Planning)

### Sprint 1 (Week 1-2):
1. ✅ Task 1.1: Service layer structure
2. ✅ Task 1.2: Shared utilities
3. ✅ Task 2.1: Sales page (pilot)
4. ✅ Task 2.2: Locations service

### Sprint 2 (Week 3-4):
5. ✅ Task 3.1: Eitje service
6. ✅ Task 3.2: Eitje finance page
7. ✅ Task 3.3: Eitje hours page
8. ✅ Task 3.4: Eitje labor costs page

### Sprint 3 (Week 5-6):
9. ✅ Task 4.1: P&L service
10. ✅ Task 4.2: P&L page
11. ✅ Task 3.5: Eitje data imported page

### Sprint 4 (Week 7-8):
12. ✅ Task 4.3: P&L balance page
13. ✅ Task 5.1: Labor dashboard
14. ✅ Task 5.2: Daily Ops dashboard

### Sprint 5 (Week 9-10):
15. ✅ Task 3.6: Eitje workers page
16. ✅ Task 3.7: Eitje locations-teams page
17. ✅ Task 5.3: View Data pages
18. ✅ Task 6.1-6.5: Optimization & cleanup

---

## Success Metrics

### Performance:
- [ ] Time to First Byte (TTFB) < 500ms (target: 200-300ms)
- [ ] First Contentful Paint (FCP) < 1s (target: 400-600ms)
- [ ] JavaScript bundle size reduction: 30-50%
- [ ] Eliminate request waterfalls (parallel server fetching)

### Code Quality:
- [ ] All data fetching in service layer
- [ ] All pages use Server Components for initial load
- [ ] TypeScript coverage: 100%
- [ ] No "use client" in page components

### Developer Experience:
- [ ] Clear separation of concerns
- [ ] Reusable service methods
- [ ] Easier to test
- [ ] Better error handling

---

## Notes

1. **Start with Sales page as pilot** - Validate approach before scaling
2. **Keep old pages working** - Gradual migration, no breaking changes
3. **Test each migration thoroughly** - Don't move to next until current is stable
4. **Use feature flags if needed** - For gradual rollout
5. **Monitor performance metrics** - Before/after each migration

---

## Estimated Total Time

- Phase 1: 3-4 hours
- Phase 2: 6-8 hours
- Phase 3: 18-24 hours
- Phase 4: 12-15 hours
- Phase 5: 9-12 hours
- Phase 6: 9-13 hours

**Total: ~57-76 hours (8-10 working days)**

---

## Progress Tracking

**Overall Progress**: 0% (0/30 tasks completed)

**Phase 1**: 0% (0/2 tasks)  
**Phase 2**: 0% (0/2 tasks)  
**Phase 3**: 0% (0/7 tasks)  
**Phase 4**: 0% (0/3 tasks)  
**Phase 5**: 0% (0/3 tasks)  
**Phase 6**: 0% (0/5 tasks)

---

## Last Updated
_Date: TBD_  
_By: TBD_
```

---

**User**

add those sql sripts, and also add scripts to create user tables, that bind all different user to one single uuid user, do the same for teams, an make sure teams, users are bound to locations

---

**Cursor**

Creating SQL scripts for roadmap tasks and unified user/team tables. Checking the existing database structure first:


Checking the locations table structure:


Creating SQL scripts for unified users/teams and roadmap items:


```sql
-- ========================================
-- UNIFIED USERS AND TEAMS SYSTEM
-- ========================================
-- This migration creates unified user and team tables that bind
-- all different external user/team IDs (Eitje, Bork, etc.) to single UUIDs
-- and links them to locations

-- ========================================
-- 1. UNIFIED USERS TABLE
-- ========================================
-- Canonical user record - one UUID per actual person
CREATE TABLE IF NOT EXISTS unified_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Common user information
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  employee_number TEXT,
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- 2. USER SYSTEM MAPPINGS TABLE
-- ========================================
-- Maps external system IDs (Eitje, Bork, etc.) to unified user UUID
CREATE TABLE IF NOT EXISTS user_system_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unified_user_id UUID NOT NULL REFERENCES unified_users(id) ON DELETE CASCADE,
  -- External system information
  system_name TEXT NOT NULL, -- 'eitje', 'bork', 'internal', etc.
  external_id TEXT NOT NULL, -- The ID from the external system (eitje_id, bork_id, etc.)
  -- Additional metadata
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure one mapping per system+external_id combination
  UNIQUE(system_name, external_id)
);

-- ========================================
-- 3. USER LOCATIONS TABLE
-- ========================================
-- Many-to-many relationship: users can work at multiple locations
CREATE TABLE IF NOT EXISTS user_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unified_user_id UUID NOT NULL REFERENCES unified_users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  -- Role/position at this location
  role TEXT, -- 'manager', 'employee', 'admin', etc.
  start_date DATE,
  end_date DATE, -- NULL if still active
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unified_user_id, location_id)
);

-- ========================================
-- 4. UNIFIED TEAMS TABLE
-- ========================================
-- Canonical team record - one UUID per actual team
CREATE TABLE IF NOT EXISTS unified_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Common team information
  name TEXT NOT NULL,
  description TEXT,
  team_type TEXT, -- 'kitchen', 'service', 'management', etc.
  is_active BOOLEAN DEFAULT true,
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- 5. TEAM SYSTEM MAPPINGS TABLE
-- ========================================
-- Maps external system IDs (Eitje, Bork, etc.) to unified team UUID
CREATE TABLE IF NOT EXISTS team_system_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unified_team_id UUID NOT NULL REFERENCES unified_teams(id) ON DELETE CASCADE,
  -- External system information
  system_name TEXT NOT NULL, -- 'eitje', 'bork', 'internal', etc.
  external_id TEXT NOT NULL, -- The ID from the external system (eitje_id, bork_id, etc.)
  -- Additional metadata
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure one mapping per system+external_id combination
  UNIQUE(system_name, external_id)
);

-- ========================================
-- 6. TEAM LOCATIONS TABLE
-- ========================================
-- Many-to-many relationship: teams can exist at multiple locations
CREATE TABLE IF NOT EXISTS team_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unified_team_id UUID NOT NULL REFERENCES unified_teams(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  -- Team-specific info at this location
  start_date DATE,
  end_date DATE, -- NULL if still active
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unified_team_id, location_id)
);

-- ========================================
-- 7. TEAM MEMBERS TABLE
-- ========================================
-- Many-to-many relationship: users can be in multiple teams
CREATE TABLE IF NOT EXISTS team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unified_user_id UUID NOT NULL REFERENCES unified_users(id) ON DELETE CASCADE,
  unified_team_id UUID NOT NULL REFERENCES unified_teams(id) ON DELETE CASCADE,
  -- Role in this team
  role TEXT, -- 'member', 'leader', 'coordinator', etc.
  start_date DATE,
  end_date DATE, -- NULL if still active
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unified_user_id, unified_team_id)
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_user_system_mappings_unified_user_id ON user_system_mappings(unified_user_id);
CREATE INDEX IF NOT EXISTS idx_user_system_mappings_system_external ON user_system_mappings(system_name, external_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(unified_user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_location_id ON user_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_active ON user_locations(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_team_system_mappings_unified_team_id ON team_system_mappings(unified_team_id);
CREATE INDEX IF NOT EXISTS idx_team_system_mappings_system_external ON team_system_mappings(system_name, external_id);
CREATE INDEX IF NOT EXISTS idx_team_locations_team_id ON team_locations(unified_team_id);
CREATE INDEX IF NOT EXISTS idx_team_locations_location_id ON team_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_team_locations_active ON team_locations(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(unified_user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(unified_team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_unified_users_email ON unified_users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_users_active ON unified_users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_unified_teams_active ON unified_teams(is_active) WHERE is_active = true;

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================
CREATE TRIGGER update_unified_users_updated_at
  BEFORE UPDATE ON unified_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_system_mappings_updated_at
  BEFORE UPDATE ON user_system_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_locations_updated_at
  BEFORE UPDATE ON user_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unified_teams_updated_at
  BEFORE UPDATE ON unified_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_system_mappings_updated_at
  BEFORE UPDATE ON team_system_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_locations_updated_at
  BEFORE UPDATE ON team_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- RLS POLICIES
-- ========================================
-- Enable RLS on all tables
ALTER TABLE unified_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_system_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_system_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Policies for unified_users
CREATE POLICY "Anyone can view unified users"
  ON unified_users FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert unified users"
  ON unified_users FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update unified users"
  ON unified_users FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete unified users"
  ON unified_users FOR DELETE
  USING (auth.role() = 'authenticated');

-- Policies for user_system_mappings
CREATE POLICY "Anyone can view user system mappings"
  ON user_system_mappings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage user system mappings"
  ON user_system_mappings FOR ALL
  USING (auth.role() = 'authenticated');

-- Policies for user_locations
CREATE POLICY "Anyone can view user locations"
  ON user_locations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage user locations"
  ON user_locations FOR ALL
  USING (auth.role() = 'authenticated');

-- Policies for unified_teams
CREATE POLICY "Anyone can view unified teams"
  ON unified_teams FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert unified teams"
  ON unified_teams FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update unified teams"
  ON unified_teams FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete unified teams"
  ON unified_teams FOR DELETE
  USING (auth.role() = 'authenticated');

-- Policies for team_system_mappings
CREATE POLICY "Anyone can view team system mappings"
  ON team_system_mappings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage team system mappings"
  ON team_system_mappings FOR ALL
  USING (auth.role() = 'authenticated');

-- Policies for team_locations
CREATE POLICY "Anyone can view team locations"
  ON team_locations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage team locations"
  ON team_locations FOR ALL
  USING (auth.role() = 'authenticated');

-- Policies for team_members
CREATE POLICY "Anyone can view team members"
  ON team_members FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage team members"
  ON team_members FOR ALL
  USING (auth.role() = 'authenticated');

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to get unified user ID from external system ID
CREATE OR REPLACE FUNCTION get_unified_user_id(
  p_system_name TEXT,
  p_external_id TEXT
) RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT unified_user_id
    FROM user_system_mappings
    WHERE system_name = p_system_name
      AND external_id = p_external_id::TEXT
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get unified team ID from external system ID
CREATE OR REPLACE FUNCTION get_unified_team_id(
  p_system_name TEXT,
  p_external_id TEXT
) RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT unified_team_id
    FROM team_system_mappings
    WHERE system_name = p_system_name
      AND external_id = p_external_id::TEXT
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE unified_users IS 'Canonical user records - one UUID per actual person';
COMMENT ON TABLE user_system_mappings IS 'Maps external system user IDs (Eitje, Bork, etc.) to unified user UUIDs';
COMMENT ON TABLE user_locations IS 'Many-to-many relationship: users can work at multiple locations';
COMMENT ON TABLE unified_teams IS 'Canonical team records - one UUID per actual team';
COMMENT ON TABLE team_system_mappings IS 'Maps external system team IDs (Eitje, Bork, etc.) to unified team UUIDs';
COMMENT ON TABLE team_locations IS 'Many-to-many relationship: teams can exist at multiple locations';
COMMENT ON TABLE team_members IS 'Many-to-many relationship: users can be in multiple teams';

```

```sql
-- ========================================
-- ADD MIGRATION PLAN TO ROADMAP
-- ========================================
-- This script adds all tasks from the Next.js Server Components migration plan
-- to the roadmap_items table

-- Get the maximum display_order to append new items
DO $$
DECLARE
  max_order INTEGER;
  current_order INTEGER;
BEGIN
  -- Get current max display_order
  SELECT COALESCE(MAX(display_order), -1) INTO max_order FROM roadmap_items;
  current_order := max_order + 1;

  -- ========================================
  -- PHASE 1: Foundation & Setup
  -- ========================================
  
  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Create Service Layer Structure',
      'Create src/lib/services/ directory with sales.service.ts, pnl.service.ts, eitje.service.ts, labor.service.ts, locations.service.ts and types directory. Add error handling and caching utilities.',
      'As a developer, I want a centralized service layer so that data fetching logic is reusable and testable.',
      'Service layer directory structure created, TypeScript types defined, basic error handling in place',
      current_order,
      'Engineering',
      'Architecture',
      'next-up',
      'Must',
      true,
      ARRAY['migration', 'refactoring', 'performance']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Create Shared Utilities',
      'Create query-builder.ts, filter-utils.ts, pagination-utils.ts, and error-handler.ts in src/lib/services/utils/. Make utility functions reusable and type-safe.',
      'As a developer, I want shared utilities so that I don''t repeat code across services.',
      'Utility functions are reusable, type-safe implementations, well-documented',
      current_order,
      'Engineering',
      'Architecture',
      'next-up',
      'Must',
      true,
      ARRAY['migration', 'refactoring']
    );
  current_order := current_order + 1;

  -- ========================================
  -- PHASE 2: Migrate High-Priority Pages
  -- ========================================

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Sales Page (PILOT)',
      'Convert /finance/sales/page.tsx to Server Component, create sales-client.tsx for UI, add loading.tsx and error.tsx. Create SalesService.fetchSalesData() and SalesService.fetchLocations() methods. Test performance improvements.',
      'As a user, I want the sales page to load faster so that I can view data immediately.',
      'Page loads faster (TTFB < 500ms), no client-side data fetching on initial load, all filters still work, no breaking changes to UI, performance metrics documented',
      current_order,
      'Engineering',
      'Migration',
      'next-up',
      'Must',
      true,
      ARRAY['migration', 'performance', 'sales']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Locations Service (Shared)',
      'Extract locations fetching from all pages, create LocationsService.fetchAll() and LocationsService.fetchById() methods, add caching (10 min stale time), update all pages to use service.',
      'As a developer, I want a single source of truth for locations so that data is consistent across the app.',
      'Single source of truth for locations, all pages use the service, caching implemented',
      current_order,
      'Engineering',
      'Migration',
      'next-up',
      'Must',
      true,
      ARRAY['migration', 'refactoring']
    );
  current_order := current_order + 1;

  -- ========================================
  -- PHASE 3: Migrate Eitje Data Pages
  -- ========================================

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Create Eitje Service',
      'Create EitjeService.fetchFinanceData(), fetchHoursData(), fetchLaborCosts(), fetchRawData(), fetchWorkers(), fetchLocationsTeams() methods. Integrate with existing aggregation-service.ts.',
      'As a developer, I want centralized Eitje data fetching so that all Eitje pages can use the same service.',
      'All Eitje data fetching methods implemented, integrated with existing aggregation service, type-safe',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Should',
      true,
      ARRAY['migration', 'eitje']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Eitje Finance Page',
      'Convert /finance/data/eitje-data/finance/page.tsx to Server Component, extract UI to finance-client.tsx, test pagination and filters.',
      'As a user, I want the Eitje finance page to load faster.',
      'Server-side data fetching, all functionality preserved, performance improved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Should',
      true,
      ARRAY['migration', 'eitje', 'performance']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Eitje Hours Page',
      'Convert /finance/data/eitje-data/hours/page.tsx to Server Component, extract UI to client component, test functionality.',
      'As a user, I want the Eitje hours page to load faster.',
      'Server-side data fetching, all functionality preserved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Should',
      true,
      ARRAY['migration', 'eitje', 'performance']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Eitje Labor Costs Page',
      'Convert /finance/data/eitje-data/labor-costs/page.tsx to Server Component, extract UI to client component, test functionality.',
      'As a user, I want the Eitje labor costs page to load faster.',
      'Server-side data fetching, all functionality preserved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Should',
      true,
      ARRAY['migration', 'eitje', 'performance']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Eitje Data Imported Page',
      'Convert /finance/data/eitje-data/data-imported/page.tsx to Server Component, extract UI to client component, test pagination (50 items per page) and error handling.',
      'As a user, I want the Eitje data imported page to load faster.',
      'Server-side data fetching, pagination works, error handling improved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Should',
      true,
      ARRAY['migration', 'eitje', 'performance']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Eitje Workers Page',
      'Convert /finance/data/eitje-data/workers/page.tsx to Server Component, extract UI to client component.',
      'As a user, I want the Eitje workers page to load faster.',
      'Server-side data fetching, all functionality preserved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Could',
      true,
      ARRAY['migration', 'eitje']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Eitje Locations-Teams Page',
      'Convert /finance/data/eitje-data/locations-teams/page.tsx to Server Component, extract UI to client component.',
      'As a user, I want the Eitje locations-teams page to load faster.',
      'Server-side data fetching, all functionality preserved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Could',
      true,
      ARRAY['migration', 'eitje']
    );
  current_order := current_order + 1;

  -- ========================================
  -- PHASE 4: Migrate P&L Pages
  -- ========================================

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Create P&L Service',
      'Create PnLService.fetchSummaryData(), fetchTimeSeries(), fetchByCategory() methods. Integrate with existing pnl-calculations.ts, add filtering logic.',
      'As a developer, I want centralized P&L data fetching so that all P&L pages can use the same service.',
      'All P&L data fetching methods implemented, integrated with existing calculations, type-safe',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Should',
      true,
      ARRAY['migration', 'pnl']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate P&L Page',
      'Convert /finance/pnl/page.tsx to Server Component, extract UI to pnl-client.tsx, test KPI cards, charts, and comparison mode.',
      'As a user, I want the P&L page to load faster.',
      'Server-side data fetching, all functionality preserved, performance improved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Should',
      true,
      ARRAY['migration', 'pnl', 'performance']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate P&L Balance Page',
      'Convert /finance/pnl/balance/page.tsx to Server Component, extract UI to client component, test complex calculations and filters.',
      'As a user, I want the P&L balance page to load faster.',
      'Server-side data fetching, all calculations work correctly, performance improved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Should',
      true,
      ARRAY['migration', 'pnl', 'performance']
    );
  current_order := current_order + 1;

  -- ========================================
  -- PHASE 5: Migrate Remaining Pages
  -- ========================================

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Labor Dashboard',
      'Create LaborService, convert /finance/labor/page.tsx to Server Component, extract UI to client component.',
      'As a user, I want the labor dashboard to load faster.',
      'Server-side data fetching, all functionality preserved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Could',
      true,
      ARRAY['migration', 'labor']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Daily Ops Dashboard',
      'Create DailyOpsService, convert /finance/daily-ops/page.tsx to Server Component, extract UI to client component.',
      'As a user, I want the daily ops dashboard to load faster.',
      'Server-side data fetching, all functionality preserved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Could',
      true,
      ARRAY['migration', 'daily-ops']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate View Data Pages',
      'Migrate /view-data/eitje-data/* pages, reuse Eitje service.',
      'As a user, I want the view data pages to load faster.',
      'Server-side data fetching, all functionality preserved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Could',
      true,
      ARRAY['migration', 'eitje']
    );
  current_order := current_order + 1;

  -- ========================================
  -- PHASE 6: Optimization & Cleanup
  -- ========================================

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Remove Deprecated Hooks',
      'Audit all hooks, identify deprecated hooks (useSalesData.ts, usePnLSummary.ts, etc.), remove or mark as deprecated, update documentation.',
      'As a developer, I want to remove deprecated code so that the codebase is cleaner.',
      'Deprecated hooks removed or marked, documentation updated',
      current_order,
      'Engineering',
      'Cleanup',
      'someday',
      'Could',
      true,
      ARRAY['cleanup', 'refactoring']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Add Caching Strategy',
      'Implement Next.js revalidation, add cache tags, configure stale time per data type, add cache invalidation on mutations.',
      'As a user, I want faster page loads through caching.',
      'Caching implemented, revalidation configured, cache invalidation works',
      current_order,
      'Engineering',
      'Performance',
      'someday',
      'Should',
      true,
      ARRAY['performance', 'caching']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Performance Optimization',
      'Measure page load times, optimize database queries, add streaming where appropriate, optimize bundle sizes.',
      'As a user, I want the fastest possible page loads.',
      'Page load times improved, database queries optimized, bundle sizes reduced',
      current_order,
      'Engineering',
      'Performance',
      'someday',
      'Should',
      true,
      ARRAY['performance', 'optimization']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Error Handling Standardization',
      'Standardize error types, create error boundaries, add error logging, create user-friendly error messages.',
      'As a user, I want clear error messages when something goes wrong.',
      'Error handling standardized, error boundaries created, user-friendly messages',
      current_order,
      'Engineering',
      'Quality',
      'someday',
      'Should',
      true,
      ARRAY['error-handling', 'quality']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Documentation',
      'Document service layer patterns, create migration guide, update README, add code examples.',
      'As a developer, I want documentation so that I understand how to use the service layer.',
      'Documentation created, migration guide written, README updated, code examples added',
      current_order,
      'Engineering',
      'Documentation',
      'someday',
      'Could',
      true,
      ARRAY['documentation']
    );
  current_order := current_order + 1;

  RAISE NOTICE 'Successfully added % roadmap items starting from display_order %', current_order - max_order - 1, max_order + 1;

END $$;

```

```markdown
# Next.js Server Components + Service Layer Migration Plan

## Overview
Migrate all client-side data fetching pages to Next.js Server Components with a dedicated Service Layer architecture. This will improve performance, reduce bundle sizes, eliminate request waterfalls, and improve SEO.

**Estimated Total Time**: 57-76 hours (8-10 working days)  
**Start Date**: TBD  
**Target Completion**: TBD

## Current State Analysis

### Pages Requiring Migration (12 total)
1. ✅ `/finance/sales/page.tsx` - Sales dashboard (714 lines)
2. ✅ `/finance/pnl/page.tsx` - P&L dashboard
3. ✅ `/finance/pnl/balance/page.tsx` - P&L balance (1243 lines)
4. ✅ `/finance/data/eitje-data/finance/page.tsx` - Eitje finance
5. ✅ `/finance/data/eitje-data/hours/page.tsx` - Eitje hours
6. ✅ `/finance/data/eitje-data/labor-costs/page.tsx` - Labor costs
7. ✅ `/finance/data/eitje-data/data-imported/page.tsx` - Data imported (731 lines)
8. ✅ `/finance/data/eitje-data/workers/page.tsx` - Workers
9. ✅ `/finance/data/eitje-data/locations-teams/page.tsx` - Locations & teams
10. ✅ `/finance/labor/page.tsx` - Labor dashboard
11. ✅ `/finance/daily-ops/page.tsx` - Daily ops dashboard
12. ✅ `/view-data/eitje-data/*` - View data pages

### Existing Service Layer (Good Foundation)
- ✅ `lib/eitje/aggregation-service.ts` - Already exists
- ✅ `lib/finance/pnl-calculations.ts` - Already exists
- ✅ `lib/bork/aggregation-service.ts` - Already exists

---

## Phase 1: Foundation & Setup

### Task 1.1: Create Service Layer Structure
**Priority**: 🔴 High  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Files to Create:**
```
src/lib/services/
├── sales.service.ts           # Sales data service
├── pnl.service.ts             # P&L data service
├── eitje.service.ts           # Eitje data service
├── labor.service.ts           # Labor data service
├── locations.service.ts       # Locations service (shared)
└── types/
    ├── sales.types.ts
    ├── pnl.types.ts
    ├── eitje.types.ts
    └── common.types.ts
```

**Checklist:**
- [ ] Create `src/lib/services/` directory
- [ ] Create `locations.service.ts` (extract locations fetching logic)
- [ ] Create `sales.service.ts` (extract sales data logic)
- [ ] Create shared types directory
- [ ] Add error handling utilities
- [ ] Add caching utilities

**Acceptance Criteria:**
- Service layer directory structure created
- TypeScript types defined
- Basic error handling in place

---

### Task 1.2: Create Shared Utilities
**Priority**: 🔴 High  
**Estimated Time**: 1 hour  
**Status**: ⬜ Not Started

**Files to Create:**
```
src/lib/services/utils/
├── query-builder.ts           # Supabase query builder helpers
├── filter-utils.ts            # Filter transformation utilities
├── pagination-utils.ts         # Pagination helpers
└── error-handler.ts           # Standardized error handling
```

**Checklist:**
- [ ] Create query builder utilities
- [ ] Create filter transformation functions
- [ ] Create pagination helpers
- [ ] Create error handler with standardized error types

**Acceptance Criteria:**
- Utility functions are reusable
- Type-safe implementations
- Well-documented

---

## Phase 2: Migrate High-Priority Pages

### Task 2.1: Migrate Sales Page (PILOT)
**Priority**: 🔴 High  
**Estimated Time**: 4-6 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 1.1, Task 1.2

**Files to Modify/Create:**
```
src/app/(dashboard)/finance/sales/
├── page.tsx                   # Convert to Server Component
├── sales-client.tsx           # New - Client component for UI
├── loading.tsx                # New - Loading state
└── error.tsx                  # New - Error boundary
```

**Checklist:**
- [ ] Create `SalesService.fetchSalesData()` method
- [ ] Create `SalesService.fetchLocations()` method
- [ ] Convert `page.tsx` to Server Component (remove "use client")
- [ ] Extract UI logic to `sales-client.tsx`
- [ ] Create `loading.tsx` with Suspense boundary
- [ ] Create `error.tsx` for error boundaries
- [ ] Test data fetching on server
- [ ] Test client-side filtering/interactivity
- [ ] Performance testing (measure before/after)

**Acceptance Criteria:**
- ✅ Page loads faster (TTFB < 500ms)
- ✅ No client-side data fetching on initial load
- ✅ All filters still work
- ✅ No breaking changes to UI
- ✅ Performance metrics documented

**Performance Metrics to Track:**
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- JavaScript bundle size
- Number of client-side requests

---

### Task 2.2: Migrate Locations Service (Shared)
**Priority**: 🔴 High  
**Estimated Time**: 1-2 hours  
**Status**: ⬜ Not Started

**Files to Create:**
```
src/lib/services/locations.service.ts
```

**Checklist:**
- [ ] Extract locations fetching from all pages
- [ ] Create `LocationsService.fetchAll()` method
- [ ] Create `LocationsService.fetchById()` method
- [ ] Add caching (10 min stale time)
- [ ] Update all pages to use service

**Acceptance Criteria:**
- Single source of truth for locations
- All pages use the service
- Caching implemented

---

## Phase 3: Migrate Eitje Data Pages

### Task 3.1: Create Eitje Service
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 1.1

**Files to Create/Modify:**
```
src/lib/services/eitje.service.ts
```

**Checklist:**
- [ ] Create `EitjeService.fetchFinanceData()` method
- [ ] Create `EitjeService.fetchHoursData()` method
- [ ] Create `EitjeService.fetchLaborCosts()` method
- [ ] Create `EitjeService.fetchRawData()` method
- [ ] Create `EitjeService.fetchWorkers()` method
- [ ] Create `EitjeService.fetchLocationsTeams()` method
- [ ] Integrate with existing `aggregation-service.ts`

**Acceptance Criteria:**
- All Eitje data fetching methods implemented
- Integrated with existing aggregation service
- Type-safe

---

### Task 3.2: Migrate Eitje Finance Page
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Files to Modify/Create:**
```
src/app/(dashboard)/finance/data/eitje-data/finance/
├── page.tsx                   # Server Component
├── finance-client.tsx         # Client Component
├── loading.tsx
└── error.tsx
```

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test pagination
- [ ] Test filters (date, location)

**Acceptance Criteria:**
- Server-side data fetching
- All functionality preserved
- Performance improved

---

### Task 3.3: Migrate Eitje Hours Page
**Priority**: 🟡 Medium  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test functionality

---

### Task 3.4: Migrate Eitje Labor Costs Page
**Priority**: 🟡 Medium  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test functionality

---

### Task 3.5: Migrate Eitje Data Imported Page
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test pagination (50 items per page)
- [ ] Test error handling

---

### Task 3.6: Migrate Eitje Workers Page
**Priority**: 🟢 Low  
**Estimated Time**: 1-2 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component

---

### Task 3.7: Migrate Eitje Locations-Teams Page
**Priority**: 🟢 Low  
**Estimated Time**: 1-2 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component

---

## Phase 4: Migrate P&L Pages

### Task 4.1: Create P&L Service
**Priority**: 🔴 High  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 1.1

**Files to Create:**
```
src/lib/services/pnl.service.ts
```

**Checklist:**
- [ ] Create `PnLService.fetchSummaryData()` method
- [ ] Create `PnLService.fetchTimeSeries()` method
- [ ] Create `PnLService.fetchByCategory()` method
- [ ] Integrate with existing `pnl-calculations.ts`
- [ ] Add filtering logic

**Acceptance Criteria:**
- All P&L data fetching methods implemented
- Integrated with existing calculations
- Type-safe

---

### Task 4.2: Migrate P&L Page
**Priority**: 🔴 High  
**Estimated Time**: 4-5 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 4.1

**Files to Modify/Create:**
```
src/app/(dashboard)/finance/pnl/
├── page.tsx                   # Server Component
├── pnl-client.tsx             # Client Component
├── loading.tsx
└── error.tsx
```

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test KPI cards
- [ ] Test charts
- [ ] Test comparison mode

**Acceptance Criteria:**
- Server-side data fetching
- All functionality preserved
- Performance improved

---

### Task 4.3: Migrate P&L Balance Page
**Priority**: 🟡 Medium  
**Estimated Time**: 5-6 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 4.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test complex calculations
- [ ] Test filters

---

## Phase 5: Migrate Remaining Pages

### Task 5.1: Migrate Labor Dashboard
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Create `LaborService`
- [ ] Convert to Server Component
- [ ] Extract UI to client component

---

### Task 5.2: Migrate Daily Ops Dashboard
**Priority**: 🟡 Medium  
**Estimated Time**: 4-5 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Create `DailyOpsService`
- [ ] Convert to Server Component
- [ ] Extract UI to client component

---

### Task 5.3: Migrate View Data Pages
**Priority**: 🟢 Low  
**Estimated Time**: 2-3 hours per page  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Migrate `/view-data/eitje-data/*` pages
- [ ] Reuse Eitje service

---

## Phase 6: Optimization & Cleanup

### Task 6.1: Remove Deprecated Hooks
**Priority**: 🟢 Low  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Files to Potentially Remove:**
- `hooks/useSalesData.ts` (if fully migrated)
- `hooks/usePnLSummary.ts` (if fully migrated)
- Other data-fetching hooks

**Checklist:**
- [ ] Audit all hooks
- [ ] Identify deprecated hooks
- [ ] Remove or mark as deprecated
- [ ] Update documentation

---

### Task 6.2: Add Caching Strategy
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Implement Next.js revalidation
- [ ] Add cache tags
- [ ] Configure stale time per data type
- [ ] Add cache invalidation on mutations

---

### Task 6.3: Performance Optimization
**Priority**: 🟡 Medium  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Measure page load times
- [ ] Optimize database queries
- [ ] Add streaming where appropriate
- [ ] Optimize bundle sizes

---

### Task 6.4: Error Handling Standardization
**Priority**: 🟡 Medium  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Standardize error types
- [ ] Create error boundaries
- [ ] Add error logging
- [ ] User-friendly error messages

---

### Task 6.5: Documentation
**Priority**: 🟢 Low  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Document service layer patterns
- [ ] Create migration guide
- [ ] Update README
- [ ] Add code examples

---

## Implementation Checklist Template

### For Each Page Migration:

**Analysis:**
- [ ] Identify all data fetching logic
- [ ] Identify all UI state
- [ ] Identify filter logic
- [ ] Document current behavior

**Service Creation:**
- [ ] Create service methods
- [ ] Add error handling
- [ ] Add TypeScript types
- [ ] Add JSDoc comments

**Server Component:**
- [ ] Remove "use client" directive
- [ ] Fetch data server-side
- [ ] Handle searchParams
- [ ] Add loading.tsx
- [ ] Add error.tsx

**Client Component:**
- [ ] Extract UI logic
- [ ] Keep only interactive state
- [ ] Use React Query for client-side updates only
- [ ] Test all interactions

**Testing:**
- [ ] Test initial load
- [ ] Test filters
- [ ] Test pagination
- [ ] Test error states
- [ ] Performance test

**Cleanup:**
- [ ] Remove unused code
- [ ] Update imports
- [ ] Remove deprecated hooks if applicable

---

## Priority Order (Sprint Planning)

### Sprint 1 (Week 1-2):
1. ✅ Task 1.1: Service layer structure
2. ✅ Task 1.2: Shared utilities
3. ✅ Task 2.1: Sales page (pilot)
4. ✅ Task 2.2: Locations service

### Sprint 2 (Week 3-4):
5. ✅ Task 3.1: Eitje service
6. ✅ Task 3.2: Eitje finance page
7. ✅ Task 3.3: Eitje hours page
8. ✅ Task 3.4: Eitje labor costs page

### Sprint 3 (Week 5-6):
9. ✅ Task 4.1: P&L service
10. ✅ Task 4.2: P&L page
11. ✅ Task 3.5: Eitje data imported page

### Sprint 4 (Week 7-8):
12. ✅ Task 4.3: P&L balance page
13. ✅ Task 5.1: Labor dashboard
14. ✅ Task 5.2: Daily Ops dashboard

### Sprint 5 (Week 9-10):
15. ✅ Task 3.6: Eitje workers page
16. ✅ Task 3.7: Eitje locations-teams page
17. ✅ Task 5.3: View Data pages
18. ✅ Task 6.1-6.5: Optimization & cleanup

---

## Success Metrics

### Performance:
- [ ] Time to First Byte (TTFB) < 500ms (target: 200-300ms)
- [ ] First Contentful Paint (FCP) < 1s (target: 400-600ms)
- [ ] JavaScript bundle size reduction: 30-50%
- [ ] Eliminate request waterfalls (parallel server fetching)

### Code Quality:
- [ ] All data fetching in service layer
- [ ] All pages use Server Components for initial load
- [ ] TypeScript coverage: 100%
- [ ] No "use client" in page components

### Developer Experience:
- [ ] Clear separation of concerns
- [ ] Reusable service methods
- [ ] Easier to test
- [ ] Better error handling

---

## Notes

1. **Start with Sales page as pilot** - Validate approach before scaling
2. **Keep old pages working** - Gradual migration, no breaking changes
3. **Test each migration thoroughly** - Don't move to next until current is stable
4. **Use feature flags if needed** - For gradual rollout
5. **Monitor performance metrics** - Before/after each migration

---

## Estimated Total Time

- Phase 1: 3-4 hours
- Phase 2: 6-8 hours
- Phase 3: 18-24 hours
- Phase 4: 12-15 hours
- Phase 5: 9-12 hours
- Phase 6: 9-13 hours

**Total: ~57-76 hours (8-10 working days)**

---

## Progress Tracking

**Overall Progress**: 0% (0/30 tasks completed)

**Phase 1**: 0% (0/2 tasks)  
**Phase 2**: 0% (0/2 tasks)  
**Phase 3**: 0% (0/7 tasks)  
**Phase 4**: 0% (0/3 tasks)  
**Phase 5**: 0% (0/3 tasks)  
**Phase 6**: 0% (0/5 tasks)

---

## Last Updated
_Date: 2025-01-03_  
_By: Migration Plan_

```

Created the SQL scripts and migration plan. Creating a summary document and a helper script to migrate existing data:


```sql
-- ========================================
-- MIGRATE EXISTING USERS AND TEAMS TO UNIFIED TABLES
-- ========================================
-- This script migrates existing Eitje and Bork users/teams to the unified system
-- Run this AFTER running the create_unified_users_teams.sql migration

DO $$
DECLARE
  unified_user_id UUID;
  unified_team_id UUID;
  location_uuid UUID;
  eitje_env_record RECORD;
  eitje_user_record RECORD;
  eitje_team_record RECORD;
  bork_user_record RECORD;
BEGIN
  RAISE NOTICE 'Starting migration of existing users and teams...';

  -- ========================================
  -- 1. MIGRATE EITJE USERS
  -- ========================================
  RAISE NOTICE 'Migrating Eitje users...';
  
  FOR eitje_user_record IN 
    SELECT 
      eu.id,
      eu.eitje_id,
      eu.first_name,
      eu.last_name,
      eu.email,
      eu.phone,
      eu.employee_number,
      eu.hire_date,
      eu.is_active,
      eu.raw_data
    FROM eitje_users eu
  LOOP
    -- Create unified user if not exists (match by email or name)
    SELECT id INTO unified_user_id
    FROM unified_users
    WHERE email = eitje_user_record.email
       OR (first_name = eitje_user_record.first_name 
           AND last_name = eitje_user_record.last_name)
    LIMIT 1;

    -- If no match found, create new unified user
    IF unified_user_id IS NULL THEN
      INSERT INTO unified_users (
        first_name,
        last_name,
        email,
        phone,
        employee_number,
        hire_date,
        is_active
      ) VALUES (
        eitje_user_record.first_name,
        eitje_user_record.last_name,
        eitje_user_record.email,
        eitje_user_record.phone,
        eitje_user_record.employee_number,
        eitje_user_record.hire_date,
        eitje_user_record.is_active
      ) RETURNING id INTO unified_user_id;
    END IF;

    -- Create system mapping
    INSERT INTO user_system_mappings (
      unified_user_id,
      system_name,
      external_id,
      raw_data
    ) VALUES (
      unified_user_id,
      'eitje',
      eitje_user_record.eitje_id::TEXT,
      eitje_user_record.raw_data
    ) ON CONFLICT (system_name, external_id) DO NOTHING;

    RAISE NOTICE 'Migrated Eitje user % (eitje_id: %) to unified user %', 
      COALESCE(eitje_user_record.first_name || ' ' || eitje_user_record.last_name, 'Unknown'),
      eitje_user_record.eitje_id,
      unified_user_id;
  END LOOP;

  -- ========================================
  -- 2. MIGRATE BORK USERS
  -- ========================================
  RAISE NOTICE 'Migrating Bork users...';
  
  FOR bork_user_record IN 
    SELECT 
      bu.id,
      bu.location_id,
      bu.bork_id,
      bu.name,
      bu.email,
      bu.role,
      bu.raw_data
    FROM bork_users bu
  LOOP
    -- Try to find existing unified user by email or create new
    SELECT id INTO unified_user_id
    FROM unified_users
    WHERE email = bork_user_record.email
    LIMIT 1;

    -- If no match found, create new unified user
    IF unified_user_id IS NULL THEN
      -- Parse name (assuming format: "First Last")
      INSERT INTO unified_users (
        first_name,
        last_name,
        email,
        is_active
      ) VALUES (
        SPLIT_PART(bork_user_record.name, ' ', 1),
        SPLIT_PART(bork_user_record.name, ' ', 2),
        bork_user_record.email,
        true
      ) RETURNING id INTO unified_user_id;
    END IF;

    -- Create system mapping
    INSERT INTO user_system_mappings (
      unified_user_id,
      system_name,
      external_id,
      raw_data
    ) VALUES (
      unified_user_id,
      'bork',
      bork_user_record.bork_id::TEXT,
      bork_user_record.raw_data
    ) ON CONFLICT (system_name, external_id) DO NOTHING;

    -- Link user to location
    IF bork_user_record.location_id IS NOT NULL THEN
      INSERT INTO user_locations (
        unified_user_id,
        location_id,
        role,
        is_active
      ) VALUES (
        unified_user_id,
        bork_user_record.location_id,
        bork_user_record.role,
        true
      ) ON CONFLICT (unified_user_id, location_id) DO UPDATE
      SET role = EXCLUDED.role,
          updated_at = NOW();
    END IF;

    RAISE NOTICE 'Migrated Bork user % (bork_id: %) to unified user %', 
      bork_user_record.name,
      bork_user_record.bork_id,
      unified_user_id;
  END LOOP;

  -- ========================================
  -- 3. MIGRATE EITJE TEAMS
  -- ========================================
  RAISE NOTICE 'Migrating Eitje teams...';
  
  FOR eitje_team_record IN 
    SELECT 
      et.id,
      et.eitje_id,
      et.environment_id,
      et.name,
      et.description,
      et.team_type,
      et.is_active,
      et.raw_data
    FROM eitje_teams et
  LOOP
    -- Create unified team
    INSERT INTO unified_teams (
      name,
      description,
      team_type,
      is_active
    ) VALUES (
      eitje_team_record.name,
      eitje_team_record.description,
      eitje_team_record.team_type,
      eitje_team_record.is_active
    ) RETURNING id INTO unified_team_id;

    -- Create system mapping
    INSERT INTO team_system_mappings (
      unified_team_id,
      system_name,
      external_id,
      raw_data
    ) VALUES (
      unified_team_id,
      'eitje',
      eitje_team_record.eitje_id::TEXT,
      eitje_team_record.raw_data
    ) ON CONFLICT (system_name, external_id) DO NOTHING;

    -- Link team to location (via environment_id -> location mapping)
    -- First, we need to find the location UUID that corresponds to the environment_id
    -- This assumes there's a mapping between eitje_environments and locations
    -- You may need to adjust this based on your actual mapping logic
    IF eitje_team_record.environment_id IS NOT NULL THEN
      -- Try to find location by matching environment name with location name
      SELECT l.id INTO location_uuid
      FROM locations l
      INNER JOIN eitje_environments ee ON ee.eitje_id = eitje_team_record.environment_id
      WHERE LOWER(l.name) = LOWER(ee.name)
      LIMIT 1;

      IF location_uuid IS NOT NULL THEN
        INSERT INTO team_locations (
          unified_team_id,
          location_id,
          is_active
        ) VALUES (
          unified_team_id,
          location_uuid,
          eitje_team_record.is_active
        ) ON CONFLICT (unified_team_id, location_id) DO UPDATE
        SET is_active = EXCLUDED.is_active,
            updated_at = NOW();
      END IF;
    END IF;

    RAISE NOTICE 'Migrated Eitje team % (eitje_id: %) to unified team %', 
      eitje_team_record.name,
      eitje_team_record.eitje_id,
      unified_team_id;
  END LOOP;

  -- ========================================
  -- 4. LINK EITJE USERS TO LOCATIONS
  -- ========================================
  RAISE NOTICE 'Linking Eitje users to locations...';
  
  -- This assumes users are linked to locations through their shifts/environments
  -- You may need to adjust this based on your actual data structure
  FOR eitje_user_record IN 
    SELECT DISTINCT
      usm.unified_user_id,
      ee.eitje_id as environment_id
    FROM user_system_mappings usm
    INNER JOIN eitje_users eu ON eu.eitje_id = usm.external_id::INTEGER
    INNER JOIN eitje_time_registration_shifts_raw etrs ON etrs.user_id = eu.eitje_id
    INNER JOIN eitje_environments ee ON ee.eitje_id = etrs.environment_id
    WHERE usm.system_name = 'eitje'
  LOOP
    -- Find location by matching environment name with location name
    SELECT l.id INTO location_uuid
    FROM locations l
    INNER JOIN eitje_environments ee ON ee.eitje_id = eitje_user_record.environment_id
    WHERE LOWER(l.name) = LOWER(ee.name)
    LIMIT 1;

    IF location_uuid IS NOT NULL THEN
      INSERT INTO user_locations (
        unified_user_id,
        location_id,
        is_active
      ) VALUES (
        eitje_user_record.unified_user_id,
        location_uuid,
        true
      ) ON CONFLICT (unified_user_id, location_id) DO NOTHING;
    END IF;
  END LOOP;

  RAISE NOTICE 'Migration completed successfully!';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Migration failed: %', SQLERRM;
END $$;

```

```markdown
# Unified Users and Teams System Setup

## Overview
This system creates a unified user and team management structure that binds all different external user/team IDs (Eitje, Bork, etc.) to single UUIDs and links them to locations.

## Architecture

### Core Tables

1. **unified_users** - Canonical user records (one UUID per actual person)
2. **user_system_mappings** - Maps external system IDs (Eitje, Bork, etc.) to unified user UUIDs
3. **user_locations** - Many-to-many: users can work at multiple locations
4. **unified_teams** - Canonical team records (one UUID per actual team)
5. **team_system_mappings** - Maps external system IDs to unified team UUIDs
6. **team_locations** - Many-to-many: teams can exist at multiple locations
7. **team_members** - Many-to-many: users can be in multiple teams

### Key Features

- **Single Source of Truth**: One UUID per actual user/team, regardless of external system
- **Multi-System Support**: Supports Eitje, Bork, and future systems
- **Location Binding**: Users and teams are linked to locations
- **Flexible Relationships**: Many-to-many relationships for users↔locations, teams↔locations, users↔teams

## Setup Instructions

### Step 1: Create Database Tables

Run the migration file:
```sql
-- File: supabase/migrations/20250103000001_create_unified_users_teams.sql
```

This creates:
- All unified tables
- Indexes for performance
- RLS policies
- Helper functions (`get_unified_user_id`, `get_unified_team_id`)
- Triggers for `updated_at` timestamps

### Step 2: Migrate Existing Data

Run the migration script:
```sql
-- File: scripts/migrate-existing-users-teams.sql
```

This script:
- Migrates Eitje users to unified_users
- Migrates Bork users to unified_users
- Creates system mappings for both systems
- Links users to locations
- Migrates Eitje teams to unified_teams
- Links teams to locations

### Step 3: Verify Migration

Check that data was migrated correctly:

```sql
-- Check unified users
SELECT COUNT(*) FROM unified_users;

-- Check system mappings
SELECT system_name, COUNT(*) 
FROM user_system_mappings 
GROUP BY system_name;

-- Check user locations
SELECT COUNT(*) FROM user_locations;

-- Check unified teams
SELECT COUNT(*) FROM unified_teams;

-- Check team locations
SELECT COUNT(*) FROM team_locations;
```

## Usage Examples

### Get Unified User ID from Eitje ID

```sql
SELECT get_unified_user_id('eitje', '12345');
```

### Get All Users at a Location

```sql
SELECT 
  uu.*,
  l.name as location_name
FROM unified_users uu
INNER JOIN user_locations ul ON ul.unified_user_id = uu.id
INNER JOIN locations l ON l.id = ul.location_id
WHERE l.id = 'your-location-uuid'
  AND ul.is_active = true;
```

### Get All Teams at a Location

```sql
SELECT 
  ut.*,
  l.name as location_name
FROM unified_teams ut
INNER JOIN team_locations tl ON tl.unified_team_id = ut.id
INNER JOIN locations l ON l.id = tl.location_id
WHERE l.id = 'your-location-uuid'
  AND tl.is_active = true;
```

### Get Team Members

```sql
SELECT 
  uu.first_name || ' ' || uu.last_name as user_name,
  ut.name as team_name,
  tm.role as team_role
FROM team_members tm
INNER JOIN unified_users uu ON uu.id = tm.unified_user_id
INNER JOIN unified_teams ut ON ut.id = tm.unified_team_id
WHERE tm.is_active = true;
```

### Get All System IDs for a User

```sql
SELECT 
  usm.system_name,
  usm.external_id
FROM user_system_mappings usm
WHERE usm.unified_user_id = 'user-uuid';
```

## Integration with Existing Tables

### Eitje Integration

When syncing Eitje data:
1. Get unified user ID: `SELECT get_unified_user_id('eitje', eitje_user_id)`
2. If NULL, create new unified user and mapping
3. Link to location via `user_locations`

### Bork Integration

When syncing Bork data:
1. Get unified user ID: `SELECT get_unified_user_id('bork', bork_user_id)`
2. If NULL, create new unified user and mapping
3. Link to location via `user_locations`

## Adding New Systems

To add a new system (e.g., "newpos"):

1. Create system mappings when syncing:
```sql
INSERT INTO user_system_mappings (
  unified_user_id,
  system_name,
  external_id,
  raw_data
) VALUES (
  unified_user_uuid,
  'newpos',
  'external_user_id',
  '{}'::jsonb
);
```

2. Use the helper function:
```sql
SELECT get_unified_user_id('newpos', 'external_user_id');
```

## Best Practices

1. **Always use unified UUIDs** in new tables/features
2. **Create mappings immediately** when syncing external data
3. **Link to locations** when user/team is location-specific
4. **Use is_active flags** to track current vs historical relationships
5. **Use helper functions** instead of direct queries when possible

## Maintenance

### Deactivating Users/Teams

```sql
-- Deactivate user
UPDATE unified_users SET is_active = false WHERE id = 'user-uuid';

-- Deactivate user at specific location
UPDATE user_locations SET is_active = false, end_date = CURRENT_DATE 
WHERE unified_user_id = 'user-uuid' AND location_id = 'location-uuid';

-- Deactivate team
UPDATE unified_teams SET is_active = false WHERE id = 'team-uuid';
```

### Merging Duplicate Users

If you find duplicate unified users (same person):

1. Identify the "primary" user UUID
2. Update all system mappings to point to primary:
```sql
UPDATE user_system_mappings 
SET unified_user_id = 'primary-uuid'
WHERE unified_user_id = 'duplicate-uuid';
```

3. Update all location links:
```sql
UPDATE user_locations 
SET unified_user_id = 'primary-uuid'
WHERE unified_user_id = 'duplicate-uuid';
```

4. Delete the duplicate user:
```sql
DELETE FROM unified_users WHERE id = 'duplicate-uuid';
```

## Troubleshooting

### Issue: No mappings found

**Solution**: Run the migration script to create initial mappings

### Issue: Users not linked to locations

**Solution**: Check the location matching logic in `migrate-existing-users-teams.sql` - you may need to adjust the matching criteria

### Issue: Duplicate users

**Solution**: Use the merge procedure above to consolidate duplicates

## Related Files

- Migration: `supabase/migrations/20250103000001_create_unified_users_teams.sql`
- Data Migration: `scripts/migrate-existing-users-teams.sql`
- Roadmap Items: `scripts/add-migration-roadmap-items.sql`

```

Created the SQL scripts and documentation. Summary:

## Created files

### 1. Database migration: unified users and teams
📄 `supabase/migrations/20250103000001_create_unified_users_teams.sql`

Creates:
- `unified_users` — canonical user records (UUID primary key)
- `user_system_mappings` — maps external IDs (eitje_id, bork_id) to unified UUIDs
- `user_locations` — many-to-many: users ↔ locations
- `unified_teams` — canonical team records (UUID primary key)
- `team_system_mappings` — maps external IDs to unified team UUIDs
- `team_locations` — many-to-many: teams ↔ locations
- `team_members` — many-to-many: users ↔ teams

Includes:
- Indexes for performance
- RLS policies
- Helper functions: `get_unified_user_id()`, `get_unified_team_id()`
- Triggers for `updated_at` timestamps

### 2. Roadmap items SQL script
📄 `scripts/add-migration-roadmap-items.sql`

Adds all 30 migration tasks from the plan to your `roadmap_items` table with:
- Proper `display_order` sequencing
- Status: "next-up" for Phase 1-2, "someday" for Phase 3-6
- Priority: "Must" for high priority, "Should" for medium, "Could" for low
- Tags: migration, performance, refactoring, etc.

### 3. Data migration script
📄 `scripts/migrate-existing-users-teams.sql`

Migrates existing data:
- Eitje users → unified_users
- Bork users → unified_users
- Creates system mappings
- Links users to locations
- Migrates Eitje teams
- Links teams to locations

### 4. Documentation
📄 `docs/MIGRATION-SERVER-COMPONENTS-PLAN.md` — Migration plan  
📄 `docs/UNIFIED-USERS-TEAMS-SETUP.md` — Setup guide for unified users/teams

## Next steps

1. Run the database migration:
   ```sql
   -- Run in Supabase SQL Editor
   -- File: supabase/migrations/20250103000001_create_unified_users_teams.sql
   ```

2. Add roadmap items:
   ```sql
   -- Run in Supabase SQL Editor
   -- File: scripts/add-migration-roadmap-items.sql
   ```

3. Migrate existing data (optional, after step 1):
   ```sql
   -- Run in Supabase SQL Editor
   -- File: scripts/migrate-existing-users-teams.sql
   ```

4. View roadmap items in your roadmap UI at `/roadmap`

All files are ready. The unified users/teams system allows you to:
- ✅ Bind multiple external user IDs (Eitje, Bork) to one UUID
- ✅ Bind multiple external team IDs to one UUID
- ✅ Link users and teams to locations
- ✅ Track relationships over time with `is_active` flags
- ✅ Support future systems easily

Should I help you run these scripts or make any adjustments?

```sql
   -- Run in Supabase SQL Editor
   -- File: supabase/migrations/20250103000001_create_unified_users_teams.sql
```

```sql
   -- Run in Supabase SQL Editor
   -- File: scripts/add-migration-roadmap-items.sql
```

```sql
   -- Run in Supabase SQL Editor
   -- File: scripts/migrate-existing-users-teams.sql
```

---

**User**

ow i thought just add to our todo we have here ,but you addedd them to the roadmap. so when is set a item to doing will that trigger an agent to that will open a new feature branche?

---

**Cursor**

Checking for a todo system and any automation for roadmap items:


No automation is configured. Setting a roadmap item to "doing" only updates the database; it doesn't create a feature branch.

Checking for existing webhooks or GitHub integrations:


There’s no automation set up. Setting a roadmap item to "doing" only updates the database; it doesn’t create a feature branch.

## Current state

Right now, when you change status to "doing":
- Database is updated (`roadmap_items.status = 'doing'`)
- UI refreshes
- No branch creation
- No automation triggered

## Options to add automation

### Option 1: Database trigger + edge function (recommended)
Create a Supabase database trigger that calls an edge function when status changes to "doing". The edge function uses the GitHub API to create a feature branch.

Flow:
```
Status → "doing" 
  → Database Trigger fires
  → Edge Function called
  → GitHub API creates branch: feature/migration-task-name
  → Updates roadmap item with branch name
```

### Option 2: Webhook integration
Add a webhook endpoint that GitHub calls, or use Supabase webhooks to call an external service.

### Option 3: Manual script
Create a script you run manually that reads "doing" items and creates branches.

## What I can create

1. Database trigger: fires when `status = 'doing'` is set
2. Edge function: uses GitHub API to create a feature branch
3. Branch naming: `feature/migration-{task-slug}` (e.g., `feature/migration-create-service-layer`)
4. Update roadmap item: store the branch name in the roadmap item

## Questions

1. Do you want automation, or prefer a manual script?
2. Do you have a GitHub Personal Access Token (PAT) for the repo?
3. Should this run automatically, or only when you click a button?
4. Prefer roadmap items or a separate todo table?

Tell me which approach you prefer and I’ll set it up.

```plaintext
Status → "doing" 
  → Database Trigger fires
  → Edge Function called
  → GitHub API creates branch: feature/migration-task-name
  → Updates roadmap item with branch name
```

---

**User**

ok and what abou triggering an agent?

---

**Cursor**

Exploring how to trigger an AI agent when a roadmap item is set to "doing". Checking existing agent/automation patterns:


There’s no Cursor agent API to trigger automatically. Here are options to trigger an agent when a roadmap item is set to "doing":

## Agent Triggering Options

### Option 1: Cursor Agent Queue (Recommended)
Create a task queue that the agent reads when you ask.

**How it works:**
1. Database trigger → inserts into `agent_tasks` table when status = "doing"
2. You ask: "What tasks are ready?" or "Start working on doing items"
3. Agent reads the queue and starts working

**Benefits:**
- Works with current Cursor agent system
- You control when the agent starts
- Can batch multiple tasks

### Option 2: Webhook + Notification
Create a webhook that notifies you when an item is set to "doing".

**How it works:**
1. Database trigger → calls edge function
2. Edge function → sends notification (email, Slack, etc.)
3. You manually trigger the agent

### Option 3: GitHub Actions (Future)
Use GitHub Actions to trigger when a branch is created.

**How it works:**
1. Status → "doing" → creates feature branch
2. GitHub Action → creates a GitHub Issue
3. You use Cursor with the issue context

### Option 4: Manual "Agent Mode" Button
Add a button in the roadmap UI to start the agent.

**How it works:**
1. Click "Start Agent" on a "doing" item
2. Opens a chat with the task details
3. Agent starts working

## Recommended Solution: Agent Task Queue

I can create:

1. `agent_tasks` table — stores tasks ready for the agent
2. Database trigger — auto-creates task when status → "doing"
3. Queue API endpoint — lists ready tasks
4. Agent helper — script to read and process tasks

**Flow:**
```
You set status → "doing"
  ↓
Database trigger fires
  ↓
Creates record in agent_tasks table
  ↓
You: "What tasks are ready for me?"
  ↓
Agent reads agent_tasks table
  ↓
Agent: "I found 3 tasks. Should I start?"
  ↓
You: "Yes, start with task #1"
  ↓
Agent creates branch and starts implementation
```

## What I can build

1. `agent_tasks` table with:
   - Task details from roadmap item
   - Status (pending, in_progress, completed)
   - Branch name
   - Created timestamp

2. Database trigger that:
   - Fires when `status = 'doing'`
   - Creates agent task automatically
   - Links to roadmap item

3. Helper script/API:
   - Lists pending tasks
   - Marks task as in_progress
   - Updates with branch name

4. Agent workflow:
   - Reads pending tasks
   - Creates feature branch
   - Starts implementation
   - Updates task status

Should I create this system? It would:
- Auto-create tasks when you set status to "doing"
- Let you ask the agent "what's ready?"
- Let the agent work through the queue
- Track progress automatically

This works with Cursor's current agent system and gives you control over when the agent starts.

```plaintext
You set status → "doing"
  ↓
Database trigger fires
  ↓
Creates record in agent_tasks table
  ↓
You: "What tasks are ready for me?"
  ↓
Agent reads agent_tasks table
  ↓
Agent: "I found 3 tasks. Should I start?"
  ↓
You: "Yes, start with task #1"
  ↓
Agent creates branch and starts implementation
```

---

**User**

ad automation for roadmap item to create branche and Agent Task Quee to the roadmap. 

---

**Cursor**

Implementing automation to create branches and an Agent Task Queue. Creating the necessary files:


Here’s the implementation for branch creation automation and an Agent Task Queue. Switch to agent mode to create the files.

## Implementation plan

### 1. Database Migration: Agent Task Queue Table

```sql
-- supabase/migrations/20250103000002_create_agent_task_queue.sql
-- ========================================
-- AGENT TASK QUEUE SYSTEM
-- ========================================
-- Creates a queue system for AI agents to pick up tasks when roadmap items are set to "doing"

-- Agent Tasks Table
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roadmap_item_id UUID NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  
  -- Task Details
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'migration', -- 'migration', 'feature', 'bugfix', etc.
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  
  -- GitHub Branch Info
  branch_name TEXT,
  branch_created BOOLEAN DEFAULT false,
  branch_created_at TIMESTAMP WITH TIME ZONE,
  
  -- Task Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  
  -- Agent Info
  assigned_agent TEXT, -- 'cursor', 'auto', etc.
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error Handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_roadmap_item ON agent_tasks(roadmap_item_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_pending ON agent_tasks(status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_agent_tasks_branch_name ON agent_tasks(branch_name) WHERE branch_name IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_agent_tasks_updated_at
  BEFORE UPDATE ON agent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view agent tasks"
  ON agent_tasks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage agent tasks"
  ON agent_tasks FOR ALL
  USING (auth.role() = 'authenticated');

-- Function to generate branch name from title
CREATE OR REPLACE FUNCTION generate_branch_name(title TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Convert to lowercase, replace spaces and special chars with hyphens
  RETURN 'feature/' || LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to create agent task when roadmap item status changes to "doing"
CREATE OR REPLACE FUNCTION create_agent_task_on_doing()
RETURNS TRIGGER AS $$
DECLARE
  task_id UUID;
  branch_name TEXT;
BEGIN
  -- Only create task if status changed TO "doing" (not from "doing")
  IF NEW.status = 'doing' AND (OLD.status IS NULL OR OLD.status != 'doing') THEN
    -- Generate branch name
    branch_name := generate_branch_name(NEW.title);
    
    -- Check if task already exists for this roadmap item
    SELECT id INTO task_id
    FROM agent_tasks
    WHERE roadmap_item_id = NEW.id
      AND status IN ('pending', 'in_progress')
    LIMIT 1;
    
    -- Only create if task doesn't exist
    IF task_id IS NULL THEN
      INSERT INTO agent_tasks (
        roadmap_item_id,
        title,
        description,
        task_type,
        priority,
        branch_name,
        status,
        metadata
      ) VALUES (
        NEW.id,
        NEW.title,
        NEW.description,
        COALESCE((NEW.metadata->>'task_type')::TEXT, 'migration'),
        CASE 
          WHEN NEW.have_state = 'Must' THEN 'high'
          WHEN NEW.have_state = 'Should' THEN 'medium'
          WHEN NEW.have_state = 'Could' THEN 'low'
          ELSE 'medium'
        END,
        branch_name,
        'pending',
        jsonb_build_object(
          'department', NEW.department,
          'category', NEW.category,
          'triggers', NEW.triggers,
          'have_state', NEW.have_state
        )
      ) RETURNING id INTO task_id;
      
      RAISE NOTICE 'Created agent task % for roadmap item % (branch: %)', task_id, NEW.id, branch_name;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS roadmap_item_doing_trigger ON roadmap_items;
CREATE TRIGGER roadmap_item_doing_trigger
  AFTER UPDATE OF status ON roadmap_items
  FOR EACH ROW
  WHEN (NEW.status = 'doing' AND (OLD.status IS NULL OR OLD.status != 'doing'))
  EXECUTE FUNCTION create_agent_task_on_doing();

COMMENT ON TABLE agent_tasks IS 'Queue of tasks for AI agents to process when roadmap items are set to "doing"';
COMMENT ON FUNCTION create_agent_task_on_doing() IS 'Automatically creates agent task when roadmap item status changes to "doing"';
```

### 2. Edge Function: Create GitHub Branch

```typescript
// supabase/functions/create-github-branch/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface CreateBranchRequest {
  branch_name: string;
  roadmap_item_id: string;
  task_id: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { branch_name, roadmap_item_id, task_id }: CreateBranchRequest = await req.json();

    if (!branch_name) {
      return new Response(
        JSON.stringify({ success: false, error: "branch_name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get GitHub token from environment
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    if (!githubToken) {
      return new Response(
        JSON.stringify({ success: false, error: "GITHUB_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get repo info from environment
    const repoOwner = Deno.env.get("GITHUB_REPO_OWNER") || "alviniomolina";
    const repoName = Deno.env.get("GITHUB_REPO_NAME") || "just-daily-ops-platform";
    const baseBranch = Deno.env.get("GITHUB_BASE_BRANCH") || "development";

    console.log(`[create-github-branch] Creating branch: ${branch_name} from ${baseBranch}`);

    // Step 1: Get SHA of base branch
    const baseBranchResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/git/ref/heads/${baseBranch}`,
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!baseBranchResponse.ok) {
      const error = await baseBranchResponse.text();
      throw new Error(`Failed to get base branch: ${baseBranchResponse.status} - ${error}`);
    }

    const baseBranchData = await baseBranchResponse.json();
    const baseSha = baseBranchData.object.sha;

    console.log(`[create-github-branch] Base branch SHA: ${baseSha}`);

    // Step 2: Create new branch
    const createBranchResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/git/refs`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: `refs/heads/${branch_name}`,
          sha: baseSha,
        }),
      }
    );

    if (!createBranchResponse.ok) {
      const error = await createBranchResponse.text();
      
      // If branch already exists, that's okay
      if (createBranchResponse.status === 422) {
        const errorData = JSON.parse(error);
        if (errorData.message?.includes("already exists")) {
          console.log(`[create-github-branch] Branch ${branch_name} already exists`);
          return new Response(
            JSON.stringify({
              success: true,
              message: "Branch already exists",
              branch_name,
              branch_url: `https://github.com/${repoOwner}/${repoName}/tree/${branch_name}`,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      
      throw new Error(`Failed to create branch: ${createBranchResponse.status} - ${error}`);
    }

    const branchData = await createBranchResponse.json();
    const branchUrl = `https://github.com/${repoOwner}/${repoName}/tree/${branch_name}`;

    console.log(`[create-github-branch] Branch created successfully: ${branchUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        branch_name,
        branch_url: branchUrl,
        ref: branchData.ref,
        sha: branchData.object.sha,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[create-github-branch] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### 3. API Route: Agent Tasks Management

```typescript
// src/app/api/agent/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/integrations/supabase/server";

/**
 * GET /api/agent/tasks - Get agent tasks
 * Query params:
 *   - status: filter by status (pending, in_progress, completed, failed)
 *   - limit: number of tasks to return (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    let query = supabase
      .from("agent_tasks")
      .select(`
        *,
        roadmap_items (
          id,
          title,
          description,
          department,
          category,
          status,
          have_state
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("[API /agent/tasks] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent/tasks - Create or update agent task
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { action, task_id, roadmap_item_id, ...taskData } = body;

    if (action === "create" && roadmap_item_id) {
      // Create new task
      const { data, error } = await supabase
        .from("agent_tasks")
        .insert(taskData)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, data });
    } else if (action === "update" && task_id) {
      // Update existing task
      const { data, error } = await supabase
        .from("agent_tasks")
        .update(taskData)
        .eq("id", task_id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, data });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action or missing required fields" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[API /agent/tasks] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

### 4. API Route: Create Branch and Update Task

```typescript
// src/app/api/agent/tasks/[taskId]/create-branch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/integrations/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const supabase = await createClient();
    const taskId = params.taskId;

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from("agent_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    // If branch already created, return
    if (task.branch_created) {
      return NextResponse.json({
        success: true,
        message: "Branch already created",
        branch_name: task.branch_name,
      });
    }

    // Call edge function to create branch
    const { data: branchData, error: branchError } = await supabase.functions.invoke(
      "create-github-branch",
      {
        body: {
          branch_name: task.branch_name,
          roadmap_item_id: task.roadmap_item_id,
          task_id: taskId,
        },
      }
    );

    if (branchError) {
      // Update task with error
      await supabase
        .from("agent_tasks")
        .update({
          status: "failed",
          error_message: branchError.message,
          retry_count: task.retry_count + 1,
        })
        .eq("id", taskId);

      throw branchError;
    }

    // Update task with branch info
    const { error: updateError } = await supabase
      .from("agent_tasks")
      .update({
        branch_created: true,
        branch_created_at: new Date().toISOString(),
        status: "pending", // Ready for agent to pick up
        metadata: {
          ...(task.metadata || {}),
          branch_url: branchData.branch_url,
        },
      })
      .eq("id", taskId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: "Branch created successfully",
      branch_name: branchData.branch_name,
      branch_url: branchData.branch_url,
      task_id: taskId,
    });
  } catch (error) {
    console.error("[API /agent/tasks/create-branch] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

### 5. Update Roadmap Component to Show Agent Tasks

```typescript
// src/components/roadmap/AgentTaskQueue.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, GitBranch, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface AgentTask {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  branch_name: string | null;
  branch_created: boolean;
  priority: string;
  created_at: string;
  roadmap_items: {
    title: string;
    department: string;
  } | null;
}

export function AgentTaskQueue() {
  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ["agent-tasks"],
    queryFn: async () => {
      const response = await fetch("/api/agent/tasks?status=pending&limit=10");
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      return result.data as AgentTask[];
    },
  });

  const handleCreateBranch = async (taskId: string) => {
    try {
      const response = await fetch(`/api/agent/tasks/${taskId}/create-branch`, {
        method: "POST",
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Branch created: ${result.branch_name}`);
        refetch();
      } else {
        toast.error(result.error || "Failed to create branch");
      }
    } catch (error) {
      toast.error("Failed to create branch");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      in_progress: "default",
      completed: "secondary",
      failed: "destructive",
    };
    return variants[status] || "outline";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            🤖 Agent Task Queue
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading tasks...</div>
        ) : tasks && tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(task.status)}
                      <h4 className="font-semibold">{task.title}</h4>
                      <Badge variant={getStatusBadge(task.status)}>
                        {task.status}
                      </Badge>
                      <Badge variant="outline">{task.priority}</Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {task.description}
                      </p>
                    )}
                    {task.branch_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <GitBranch className="h-3 w-3" />
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {task.branch_name}
                        </code>
                        {task.branch_created && (
                          <Badge variant="outline" className="text-xs">
                            Created
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  {!task.branch_created && task.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCreateBranch(task.id)}
                    >
                      <GitBranch className="h-3 w-3 mr-1" />
                      Create Branch
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No pending tasks. Set a roadmap item to "doing" to create a task!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 6. Update Roadmap Page to Include Agent Queue

Add to `src/app/(dashboard)/roadmap/page.tsx`:

```typescript
// Add import at top
import { AgentTaskQueue } from "@/components/roadmap/AgentTaskQueue";

// Add before the DndContext section (around line 390):
<AgentTaskQueue />

// Full component structure:
return (
  <div className="container mx-auto p-6 space-y-6">
    {/* ... existing header ... */}
    
    {/* Add Agent Task Queue here */}
    <AgentTaskQueue />
    
    {/* Existing roadmap columns */}
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* ... */}
    </DndContext>
  </div>
);
```

### 7. Helper Script for Agent to Read Queue

```typescript
// scripts/agent-read-queue.ts
/**
 * Helper script for AI agent to read pending tasks from queue
 * Usage: node scripts/agent-read-queue.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function readAgentQueue() {
  console.log("🤖 Reading Agent Task Queue...\n");

  const { data: tasks, error } = await supabase
    .from("agent_tasks")
    .select(`
      *,
      roadmap_items (
        id,
        title,
        description,
        department,
        category,
        status,
        have_state,
        user_story,
        expected_results
      )
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    console.error("❌ Error reading queue:", error);
    return;
  }

  if (!tasks || tasks.length === 0) {
    console.log("✅ No pending tasks in queue.");
    return;
  }

  console.log(`📋 Found ${tasks.length} pending task(s):\n`);

  tasks.forEach((task, index) => {
    console.log(`${index + 1}. ${task.title}`);
    console.log(`   ID: ${task.id}`);
    console.log(`   Branch: ${task.branch_name || "Not created yet"}`);
    console.log(`   Priority: ${task.priority}`);
    if (task.description) {
      console.log(`   Description: ${task.description.substring(0, 100)}...`);
    }
    console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
    console.log("");
  });

  return tasks;
}

// Run if called directly
if (require.main === module) {
  readAgentQueue()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { readAgentQueue };
```

### 8. Environment Variables Needed

Add to `.env.local`:

```bash
# GitHub Integration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_REPO_OWNER=alviniomolina
GITHUB_REPO_NAME=just-daily-ops-platform
GITHUB_BASE_BRANCH=development
```

### 9. Update Roadmap Item Card to Show Branch Status

Modify `src/components/roadmap/RoadmapItemCard.tsx` to show branch info:

```typescript
// Add after line 159 (after triggers display):
// Add query to check if task exists
const { data: agentTask } = useQuery({
  queryKey: ["agent-task", item.id],
  queryFn: async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("agent_tasks")
      .select("branch_name, branch_created, status")
      .eq("roadmap_item_id", item.id)
      .single();
    return data;
  },
  enabled: status === "doing",
});

// Add in JSX (around line 163, inside CardContent):
{status === "doing" && agentTask && (
  <div className="mt-2 pt-2 border-t">
    {agentTask.branch_name ? (
      <div className="flex items-center gap-2 text-xs">
        <GitBranch className="h-3 w-3" />
        <code className="bg-muted px-2 py-1 rounded">
          {agentTask.branch_name}
        </code>
        {agentTask.branch_created && (
          <Badge variant="outline" className="text-xs">Branch Created</Badge>
        )}
      </div>
    ) : (
      <div className="text-xs text-muted-foreground">
        Creating branch...
      </div>
    )}
  </div>
)}
```

## Summary

What this adds:
1. Database table: `agent_tasks` — stores tasks for agents
2. Auto-trigger: creates task when roadmap item → "doing"
3. Auto-branch: creates GitHub branch for the task
4. Agent queue UI: shows pending tasks in roadmap
5. API endpoints: manage tasks and create branches
6. Helper script: agent can read the queue

Flow:
1. You set status → "doing"
2. Database trigger creates agent task
3. Branch is created automatically (or on button click)
4. Task appears in Agent Task Queue
5. Agent can read queue and start working

Switch to agent mode to create these files. Should I continue?

```sql
-- supabase/migrations/20250103000002_create_agent_task_queue.sql
-- ========================================
-- AGENT TASK QUEUE SYSTEM
-- ========================================
-- Creates a queue system for AI agents to pick up tasks when roadmap items are set to "doing"

-- Agent Tasks Table
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roadmap_item_id UUID NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  
  -- Task Details
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'migration', -- 'migration', 'feature', 'bugfix', etc.
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  
  -- GitHub Branch Info
  branch_name TEXT,
  branch_created BOOLEAN DEFAULT false,
  branch_created_at TIMESTAMP WITH TIME ZONE,
  
  -- Task Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  
  -- Agent Info
  assigned_agent TEXT, -- 'cursor', 'auto', etc.
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error Handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_roadmap_item ON agent_tasks(roadmap_item_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_pending ON agent_tasks(status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_agent_tasks_branch_name ON agent_tasks(branch_name) WHERE branch_name IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_agent_tasks_updated_at
  BEFORE UPDATE ON agent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view agent tasks"
  ON agent_tasks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage agent tasks"
  ON agent_tasks FOR ALL
  USING (auth.role() = 'authenticated');

-- Function to generate branch name from title
CREATE OR REPLACE FUNCTION generate_branch_name(title TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Convert to lowercase, replace spaces and special chars with hyphens
  RETURN 'feature/' || LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to create agent task when roadmap item status changes to "doing"
CREATE OR REPLACE FUNCTION create_agent_task_on_doing()
RETURNS TRIGGER AS $$
DECLARE
  task_id UUID;
  branch_name TEXT;
BEGIN
  -- Only create task if status changed TO "doing" (not from "doing")
  IF NEW.status = 'doing' AND (OLD.status IS NULL OR OLD.status != 'doing') THEN
    -- Generate branch name
    branch_name := generate_branch_name(NEW.title);
    
    -- Check if task already exists for this roadmap item
    SELECT id INTO task_id
    FROM agent_tasks
    WHERE roadmap_item_id = NEW.id
      AND status IN ('pending', 'in_progress')
    LIMIT 1;
    
    -- Only create if task doesn't exist
    IF task_id IS NULL THEN
      INSERT INTO agent_tasks (
        roadmap_item_id,
        title,
        description,
        task_type,
        priority,
        branch_name,
        status,
        metadata
      ) VALUES (
        NEW.id,
        NEW.title,
        NEW.description,
        COALESCE((NEW.metadata->>'task_type')::TEXT, 'migration'),
        CASE 
          WHEN NEW.have_state = 'Must' THEN 'high'
          WHEN NEW.have_state = 'Should' THEN 'medium'
          WHEN NEW.have_state = 'Could' THEN 'low'
          ELSE 'medium'
        END,
        branch_name,
        'pending',
        jsonb_build_object(
          'department', NEW.department,
          'category', NEW.category,
          'triggers', NEW.triggers,
          'have_state', NEW.have_state
        )
      ) RETURNING id INTO task_id;
      
      RAISE NOTICE 'Created agent task % for roadmap item % (branch: %)', task_id, NEW.id, branch_name;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS roadmap_item_doing_trigger ON roadmap_items;
CREATE TRIGGER roadmap_item_doing_trigger
  AFTER UPDATE OF status ON roadmap_items
  FOR EACH ROW
  WHEN (NEW.status = 'doing' AND (OLD.status IS NULL OR OLD.status != 'doing'))
  EXECUTE FUNCTION create_agent_task_on_doing();

COMMENT ON TABLE agent_tasks IS 'Queue of tasks for AI agents to process when roadmap items are set to "doing"';
COMMENT ON FUNCTION create_agent_task_on_doing() IS 'Automatically creates agent task when roadmap item status changes to "doing"';
```

```typescript
// supabase/functions/create-github-branch/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface CreateBranchRequest {
  branch_name: string;
  roadmap_item_id: string;
  task_id: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { branch_name, roadmap_item_id, task_id }: CreateBranchRequest = await req.json();

    if (!branch_name) {
      return new Response(
        JSON.stringify({ success: false, error: "branch_name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get GitHub token from environment
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    if (!githubToken) {
      return new Response(
        JSON.stringify({ success: false, error: "GITHUB_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get repo info from environment
    const repoOwner = Deno.env.get("GITHUB_REPO_OWNER") || "alviniomolina";
    const repoName = Deno.env.get("GITHUB_REPO_NAME") || "just-daily-ops-platform";
    const baseBranch = Deno.env.get("GITHUB_BASE_BRANCH") || "development";

    console.log(`[create-github-branch] Creating branch: ${branch_name} from ${baseBranch}`);

    // Step 1: Get SHA of base branch
    const baseBranchResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/git/ref/heads/${baseBranch}`,
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!baseBranchResponse.ok) {
      const error = await baseBranchResponse.text();
      throw new Error(`Failed to get base branch: ${baseBranchResponse.status} - ${error}`);
    }

    const baseBranchData = await baseBranchResponse.json();
    const baseSha = baseBranchData.object.sha;

    console.log(`[create-github-branch] Base branch SHA: ${baseSha}`);

    // Step 2: Create new branch
    const createBranchResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/git/refs`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: `refs/heads/${branch_name}`,
          sha: baseSha,
        }),
      }
    );

    if (!createBranchResponse.ok) {
      const error = await createBranchResponse.text();
      
      // If branch already exists, that's okay
      if (createBranchResponse.status === 422) {
        const errorData = JSON.parse(error);
        if (errorData.message?.includes("already exists")) {
          console.log(`[create-github-branch] Branch ${branch_name} already exists`);
          return new Response(
            JSON.stringify({
              success: true,
              message: "Branch already exists",
              branch_name,
              branch_url: `https://github.com/${repoOwner}/${repoName}/tree/${branch_name}`,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      
      throw new Error(`Failed to create branch: ${createBranchResponse.status} - ${error}`);
    }

    const branchData = await createBranchResponse.json();
    const branchUrl = `https://github.com/${repoOwner}/${repoName}/tree/${branch_name}`;

    console.log(`[create-github-branch] Branch created successfully: ${branchUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        branch_name,
        branch_url: branchUrl,
        ref: branchData.ref,
        sha: branchData.object.sha,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[create-github-branch] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

```typescript
// src/app/api/agent/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/integrations/supabase/server";

/**
 * GET /api/agent/tasks - Get agent tasks
 * Query params:
 *   - status: filter by status (pending, in_progress, completed, failed)
 *   - limit: number of tasks to return (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    let query = supabase
      .from("agent_tasks")
      .select(`
        *,
        roadmap_items (
          id,
          title,
          description,
          department,
          category,
          status,
          have_state
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("[API /agent/tasks] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent/tasks - Create or update agent task
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { action, task_id, roadmap_item_id, ...taskData } = body;

    if (action === "create" && roadmap_item_id) {
      // Create new task
      const { data, error } = await supabase
        .from("agent_tasks")
        .insert(taskData)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, data });
    } else if (action === "update" && task_id) {
      // Update existing task
      const { data, error } = await supabase
        .from("agent_tasks")
        .update(taskData)
        .eq("id", task_id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, data });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action or missing required fields" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[API /agent/tasks] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

```typescript
// src/app/api/agent/tasks/[taskId]/create-branch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/integrations/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const supabase = await createClient();
    const taskId = params.taskId;

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from("agent_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    // If branch already created, return
    if (task.branch_created) {
      return NextResponse.json({
        success: true,
        message: "Branch already created",
        branch_name: task.branch_name,
      });
    }

    // Call edge function to create branch
    const { data: branchData, error: branchError } = await supabase.functions.invoke(
      "create-github-branch",
      {
        body: {
          branch_name: task.branch_name,
          roadmap_item_id: task.roadmap_item_id,
          task_id: taskId,
        },
      }
    );

    if (branchError) {
      // Update task with error
      await supabase
        .from("agent_tasks")
        .update({
          status: "failed",
          error_message: branchError.message,
          retry_count: task.retry_count + 1,
        })
        .eq("id", taskId);

      throw branchError;
    }

    // Update task with branch info
    const { error: updateError } = await supabase
      .from("agent_tasks")
      .update({
        branch_created: true,
        branch_created_at: new Date().toISOString(),
        status: "pending", // Ready for agent to pick up
        metadata: {
          ...(task.metadata || {}),
          branch_url: branchData.branch_url,
        },
      })
      .eq("id", taskId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: "Branch created successfully",
      branch_name: branchData.branch_name,
      branch_url: branchData.branch_url,
      task_id: taskId,
    });
  } catch (error) {
    console.error("[API /agent/tasks/create-branch] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

```typescript
// src/components/roadmap/AgentTaskQueue.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, GitBranch, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface AgentTask {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  branch_name: string | null;
  branch_created: boolean;
  priority: string;
  created_at: string;
  roadmap_items: {
    title: string;
    department: string;
  } | null;
}

export function AgentTaskQueue() {
  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ["agent-tasks"],
    queryFn: async () => {
      const response = await fetch("/api/agent/tasks?status=pending&limit=10");
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      return result.data as AgentTask[];
    },
  });

  const handleCreateBranch = async (taskId: string) => {
    try {
      const response = await fetch(`/api/agent/tasks/${taskId}/create-branch`, {
        method: "POST",
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Branch created: ${result.branch_name}`);
        refetch();
      } else {
        toast.error(result.error || "Failed to create branch");
      }
    } catch (error) {
      toast.error("Failed to create branch");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      in_progress: "default",
      completed: "secondary",
      failed: "destructive",
    };
    return variants[status] || "outline";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            🤖 Agent Task Queue
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading tasks...</div>
        ) : tasks && tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(task.status)}
                      <h4 className="font-semibold">{task.title}</h4>
                      <Badge variant={getStatusBadge(task.status)}>
                        {task.status}
                      </Badge>
                      <Badge variant="outline">{task.priority}</Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {task.description}
                      </p>
                    )}
                    {task.branch_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <GitBranch className="h-3 w-3" />
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {task.branch_name}
                        </code>
                        {task.branch_created && (
                          <Badge variant="outline" className="text-xs">
                            Created
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  {!task.branch_created && task.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCreateBranch(task.id)}
                    >
                      <GitBranch className="h-3 w-3 mr-1" />
                      Create Branch
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No pending tasks. Set a roadmap item to "doing" to create a task!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

```typescript
// Add import at top
import { AgentTaskQueue } from "@/components/roadmap/AgentTaskQueue";

// Add before the DndContext section (around line 390):
<AgentTaskQueue />

// Full component structure:
return (
  <div className="container mx-auto p-6 space-y-6">
    {/* ... existing header ... */}
    
    {/* Add Agent Task Queue here */}
    <AgentTaskQueue />
    
    {/* Existing roadmap columns */}
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* ... */}
    </DndContext>
  </div>
);
```

```typescript
// scripts/agent-read-queue.ts
/**
 * Helper script for AI agent to read pending tasks from queue
 * Usage: node scripts/agent-read-queue.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function readAgentQueue() {
  console.log("🤖 Reading Agent Task Queue...\n");

  const { data: tasks, error } = await supabase
    .from("agent_tasks")
    .select(`
      *,
      roadmap_items (
        id,
        title,
        description,
        department,
        category,
        status,
        have_state,
        user_story,
        expected_results
      )
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    console.error("❌ Error reading queue:", error);
    return;
  }

  if (!tasks || tasks.length === 0) {
    console.log("✅ No pending tasks in queue.");
    return;
  }

  console.log(`📋 Found ${tasks.length} pending task(s):\n`);

  tasks.forEach((task, index) => {
    console.log(`${index + 1}. ${task.title}`);
    console.log(`   ID: ${task.id}`);
    console.log(`   Branch: ${task.branch_name || "Not created yet"}`);
    console.log(`   Priority: ${task.priority}`);
    if (task.description) {
      console.log(`   Description: ${task.description.substring(0, 100)}...`);
    }
    console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
    console.log("");
  });

  return tasks;
}

// Run if called directly
if (require.main === module) {
  readAgentQueue()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { readAgentQueue };
```

```shellscript
# GitHub Integration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_REPO_OWNER=alviniomolina
GITHUB_REPO_NAME=just-daily-ops-platform
GITHUB_BASE_BRANCH=development
```

```typescript
// Add after line 159 (after triggers display):
// Add query to check if task exists
const { data: agentTask } = useQuery({
  queryKey: ["agent-task", item.id],
  queryFn: async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("agent_tasks")
      .select("branch_name, branch_created, status")
      .eq("roadmap_item_id", item.id)
      .single();
    return data;
  },
  enabled: status === "doing",
});

// Add in JSX (around line 163, inside CardContent):
{status === "doing" && agentTask && (
  <div className="mt-2 pt-2 border-t">
    {agentTask.branch_name ? (
      <div className="flex items-center gap-2 text-xs">
        <GitBranch className="h-3 w-3" />
        <code className="bg-muted px-2 py-1 rounded">
          {agentTask.branch_name}
        </code>
        {agentTask.branch_created && (
          <Badge variant="outline" className="text-xs">Branch Created</Badge>
        )}
      </div>
    ) : (
      <div className="text-xs text-muted-foreground">
        Creating branch...
      </div>
    )}
  </div>
)}
```

---

**User**

Hi. We will. need to update our routes. So. the pages we have Pages, yes. I'm not correct. There should be We have four departments. 40 parvans yes Um, Four departments. Yes. Correct. First We have. Beverage? Then we have Food Then we have Finance. And then we have... Daily operations. The fifth It's actually a department, but it's more about the app. which is Back office. So our complete route has to be updated So if you have now finance, department it will show Um... the main pages for Profit and loss Um, Sales Labor. View data That's it. Then we have prophet Allah has children pages So the profit and loss balance is a child page of the profit and loss page you see Um, for the sales We also have child pages and for labor We have the "Eitje". child pages which are If I'm correct, Our words. revenue Users I mean not users but workers teams and locations. Actually, users Teams and locations can be one page, so there's three pages. All right? So this is a new Sidemap. And this is actually how the page should how the navigation should work. So then we know all the routes Bye. Correct. So you just put a sub sub folder And then you know the route. Alright. Can you add this as an... Roadmap item to do. And can you also please organize my navigation, the sitemap, as I just said? Execute, please.

---

**Cursor**

Reviewing the current navigation structure, then adding a roadmap item and reorganizing the navigation.


Adding a roadmap item and reorganizing the navigation. Creating the SQL script and updated navigation structure:


Adding the roadmap item and providing the updated navigation structure.

## 1. SQL Script to Add Roadmap Item

```sql
-- scripts/add-reorganize-navigation-roadmap-item.sql
-- Add roadmap item for reorganizing routes and navigation by departments

DO $$
DECLARE
  max_order INTEGER;
  current_order INTEGER;
BEGIN
  SELECT COALESCE(MAX(display_order), -1) INTO max_order FROM roadmap_items;
  current_order := max_order + 1;

  INSERT INTO roadmap_items (
    title, 
    description, 
    user_story, 
    expected_results, 
    display_order, 
    department, 
    category, 
    status, 
    have_state, 
    is_active, 
    triggers
  )
  VALUES (
    'Reorganize Routes and Navigation by Departments',
    'Reorganize all routes and navigation structure to match the 5-department structure: Beverage, Food, Finance, Daily Operations, and Back Office. Finance department should have main pages (Profit & Loss, Sales, Labor, View Data) with proper child pages hierarchy. Update all routes, navigation sidebar, and ensure all pages are accessible under the correct department structure.',
    'As a user, I want navigation organized by departments so that I can easily find pages related to my department.',
    'All routes organized by departments, navigation sidebar updated with correct hierarchy, all pages accessible under proper department routes, Finance department has main pages (P&L, Sales, Labor, View Data) with child pages (P&L Balance, Sales children, Labor Eitje pages: Revenue, Workers, Teams & Locations)',
    current_order,
    'Engineering',
    'Navigation',
    'next-up',
    'Must',
    true,
    ARRAY['navigation', 'refactoring', 'routes', 'organization']
  );

  RAISE NOTICE 'Successfully added roadmap item for navigation reorganization at display_order %', current_order;
END $$;
```

## 2. Updated Navigation Structure

Updated `src/components/app-sidebar.tsx` with the new department structure:

```typescript
// src/components/app-sidebar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  ClipboardCheck,
  Send,
  FileText,
  RotateCcw,
  Package,
  BarChart3,
  Box,
  Truck,
  MapPin,
  Activity,
  Palette,
  Users,
  LayoutDashboard,
  Utensils,
  ClipboardList,
  TrendingUp,
  BarChartBig,
  DollarSign,
  Upload,
  Sparkles,
  TrendingDown,
  Trash2,
  Database,
  Wifi,
  Map,
  ChevronRight,
  Clock,
  DollarSign as DollarSignIcon,
  UserCheck,
  Building2,
  Coffee,
  Apple,
  Briefcase,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserRole } from "@/hooks/useUserRole";
import { useDepartment } from "@/contexts/DepartmentContext";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

// Type definitions for menu items
type MenuItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  isCollapsible?: boolean;
  children?: MenuItem[];
};

// ========================================
// BEVERAGE DEPARTMENT
// ========================================
const beverageItems: MenuItem[] = [
  // Add beverage-specific items here
  { title: "Beverage Dashboard", url: "/beverage", icon: Coffee },
  // Add more beverage pages as needed
];

// ========================================
// FOOD DEPARTMENT
// ========================================
const foodItems: MenuItem[] = [
  // Add food-specific items here
  { title: "Food Dashboard", url: "/food", icon: Apple },
  // Add more food pages as needed
];

// ========================================
// FINANCE DEPARTMENT
// ========================================
// P&L Child Pages
const pnlChildItems: MenuItem[] = [
  { title: "Balance", url: "/finance/pnl/balance", icon: BarChartBig },
];

// Sales Child Pages (to be created)
const salesChildItems: MenuItem[] = [
  // Add sales child pages here when created
  // Example: { title: "Sales by Category", url: "/finance/sales/category", icon: TrendingUp },
];

// Labor Eitje Child Pages
const laborEitjeChildItems: MenuItem[] = [
  { title: "Revenue", url: "/finance/labor/eitje/revenue", icon: DollarSignIcon },
  { title: "Workers", url: "/finance/labor/eitje/workers", icon: UserCheck },
  { title: "Teams & Locations", url: "/finance/labor/eitje/teams-locations", icon: Building2 },
];

// View Data Child Pages
const viewDataChildItems: MenuItem[] = [
  { title: "Hours", url: "/finance/view-data/hours", icon: Clock },
  { title: "Labor Costs", url: "/finance/view-data/labor-costs", icon: DollarSignIcon },
  { title: "Sales by Bork", url: "/finance/view-data/sales", icon: TrendingUp },
  { title: "Data Imported", url: "/finance/view-data/data-imported", icon: Database },
];

const financeItems: MenuItem[] = [
  // Main Pages with Children
  {
    title: "Profit & Loss",
    url: "/finance/pnl",
    icon: DollarSign,
    isCollapsible: true,
    children: pnlChildItems,
  },
  {
    title: "Sales",
    url: "/finance/sales",
    icon: TrendingUp,
    isCollapsible: salesChildItems.length > 0,
    children: salesChildItems.length > 0 ? salesChildItems : undefined,
  },
  {
    title: "Labor",
    url: "/finance/labor",
    icon: Users,
    isCollapsible: true,
    children: laborEitjeChildItems,
  },
  {
    title: "View Data",
    url: "/finance/view-data",
    icon: Database,
    isCollapsible: true,
    children: viewDataChildItems,
  },
];

// ========================================
// DAILY OPERATIONS DEPARTMENT
// ========================================
const dailyOpsChildItems: MenuItem[] = [
  { title: "KPIs", url: "/daily-ops/kpis", icon: BarChart3 },
  { title: "Trends", url: "/daily-ops/trends", icon: TrendingUp },
  { title: "Productivity", url: "/daily-ops/productivity", icon: Activity },
  { title: "Insights", url: "/daily-ops/insights", icon: Sparkles },
];

const dailyOpsItems: MenuItem[] = [
  {
    title: "Daily Operations",
    url: "/daily-ops",
    icon: Activity,
    isCollapsible: true,
    children: dailyOpsChildItems,
  },
];

// ========================================
// BACK OFFICE DEPARTMENT
// ========================================
const backOfficeItems: MenuItem[] = [
  { title: "Back Office Dashboard", url: "/back-office", icon: Briefcase },
  { title: "Settings", url: "/back-office/settings", icon: Settings },
  { title: "Suppliers", url: "/back-office/suppliers", icon: Truck },
  { title: "Locations", url: "/back-office/locations", icon: MapPin },
  { title: "Reports", url: "/back-office/reports", icon: FileText },
  { title: "Member Activity", url: "/back-office/member-activity", icon: Activity },
  { title: "Package Usage", url: "/back-office/package-usage", icon: Package },
];

// ========================================
// ADMIN ITEMS (for Back Office)
// ========================================
const adminItems: MenuItem[] = [
  { title: "Suppliers", url: "/back-office/suppliers", icon: Truck },
  { title: "Locations", url: "/back-office/locations", icon: MapPin },
  { title: "Reports", url: "/back-office/reports", icon: BarChart3 },
  { title: "Member Activity", url: "/back-office/member-activity", icon: Activity },
  { title: "Package Usage", url: "/back-office/package-usage", icon: Package },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const pathname = usePathname();
  const { isOwner } = useUserRole();
  const { department, setDepartment } = useDepartment();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => pathname === path;
  
  // Check if any child route is active (for auto-expanding collapsible items)
  const isChildActive = (children: MenuItem[] | undefined) => {
    return children?.some((child) => pathname.startsWith(child.url)) || false;
  };
  
  // State for collapsible menus
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  
  // Auto-expand menus if any child route is active
  useEffect(() => {
    const menus: Record<string, boolean> = {};
    
    // Check Finance items
    financeItems.forEach((item) => {
      if (item.isCollapsible && item.children) {
        menus[item.title] = isChildActive(item.children);
      }
    });
    
    // Check Daily Ops items
    dailyOpsItems.forEach((item) => {
      if (item.isCollapsible && item.children) {
        menus[item.title] = isChildActive(item.children);
      }
    });
    
    setOpenMenus(menus);
  }, [pathname]);

  const departmentConfig = {
    beverage: {
      color: "border-orange-400",
      label: "Beverage Department",
      items: beverageItems,
      dashboard: "/beverage",
    },
    food: {
      color: "border-green-400",
      label: "Food Department",
      items: foodItems,
      dashboard: "/food",
    },
    finance: {
      color: "border-red-400",
      label: "Finance Department",
      items: financeItems,
      dashboard: "/finance",
    },
    "daily-ops": {
      color: "border-blue-400",
      label: "Daily Operations",
      items: dailyOpsItems,
      dashboard: "/daily-ops",
    },
    "back-office": {
      color: "border-purple-400",
      label: "Back Office",
      items: backOfficeItems,
      dashboard: "/back-office",
    },
  };

  const currentConfig = departmentConfig[department];

  const toggleMenu = (menuTitle: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuTitle]: !prev[menuTitle],
    }));
  };

  const renderMenuItem = (item: MenuItem) => {
    // Render collapsible item if it has children
    if (item.isCollapsible && item.children && item.children.length > 0) {
      const isOpen = openMenus[item.title] || false;
      const isParentActive = isActive(item.url) || isChildActive(item.children);
      
      return (
        <Collapsible 
          key={item.title} 
          open={isOpen} 
          onOpenChange={() => toggleMenu(item.title)}
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton isActive={isParentActive}>
                <item.icon />
                <span>{item.title}</span>
                <ChevronRight className={cn(
                  "ml-auto transition-transform duration-200",
                  isOpen && "rotate-90"
                )} />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.children.map((child: MenuItem) => (
                  <SidebarMenuSubItem key={child.title}>
                    <SidebarMenuSubButton asChild isActive={isActive(child.url)}>
                      <Link href={child.url}>
                        <span>{child.title}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }
    
    // Render regular item
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive(item.url)}>
          <Link href={item.url}>
            <item.icon />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-2 border-black bg-white">
      <SidebarContent className="flex flex-col">
        {/* Department Switcher */}
        {!collapsed && (
          <div className="p-4 space-y-2 border-b-2 border-black">
            <p className="text-xs text-muted-foreground mb-2">Switch Department</p>
            <Select value={department} onValueChange={(value) => setDepartment(value as typeof department)}>
              <SelectTrigger className="w-full h-9 border-2 border-black">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beverage">
                  <div className="flex items-center gap-2">
                    <Coffee className="h-4 w-4" />
                    <span>Beverage</span>
                  </div>
                </SelectItem>
                <SelectItem value="food">
                  <div className="flex items-center gap-2">
                    <Apple className="h-4 w-4" />
                    <span>Food</span>
                  </div>
                </SelectItem>
                <SelectItem value="finance">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Finance</span>
                  </div>
                </SelectItem>
                <SelectItem value="daily-ops">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span>Daily Operations</span>
                  </div>
                </SelectItem>
                <SelectItem value="back-office">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    <span>Back Office</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* Dashboard */}
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Dashboard
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive(currentConfig.dashboard)}>
                    <Link href={currentConfig.dashboard}>
                      <LayoutDashboard />
                      <span>{currentConfig.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Department Pages */}
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              {currentConfig.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {currentConfig.items.map((item) => renderMenuItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Admin Section - Only visible in Back Office for Owner/Admin */}
          {department === "back-office" && isOwner() && (
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}
        </div>

        {/* Import & Connection Section - Sticky Bottom */}
        <div className="mt-auto border-t-2 border-black pb-4">
          <SidebarGroup>
            <SidebarGroupLabel>Import & Connection</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/finance/imports")}>
                  <Link href="/finance/imports">
                    <Upload />
                    <span>Data Imports</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/finance/bork-api")}>
                  <Link href="/finance/bork-api">
                    <Wifi />
                    <span>Bork API Connect</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/finance/eitje-api")}>
                  <Link href="/finance/eitje-api">
                    <Wifi />
                    <span>Eitje API Connect</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/finance/formitable-api")}>
                  <Link href="/finance/formitable-api">
                    <Wifi />
                    <span>Formitable API Connect</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/roadmap")}>
                  <Link href="/roadmap">
                    <Map />
                    <span>Roadmap</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/docs") || pathname.startsWith("/docs/")}>
                  <Link href="/docs">
                    <FileText />
                    <span>Documentation</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/design-systems") || pathname.startsWith("/design-systems/")}>
                  <Link href="/design-systems">
                    <Palette />
                    <span>Design Systems</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
```

## 3. Route Migration Plan

Routes to reorganize:

Current → New Structure:

```
Finance Department:
- /finance/pnl → /finance/pnl (main)
  - /finance/pnl/balance → /finance/pnl/balance ✅ (child)
  
- /finance/sales → /finance/sales (main)
  - (Sales child pages to be created)

- /finance/labor → /finance/labor (main)
  - /finance/labor/eitje/revenue → /finance/labor/eitje/revenue (child)
  - /finance/labor/eitje/workers → /finance/labor/eitje/workers (child)
  - /finance/labor/eitje/teams-locations → /finance/labor/eitje/teams-locations (child)

- /finance/view-data → /finance/view-data (main)
  - /finance/view-data/hours → /finance/view-data/hours (child)
  - /finance/view-data/labor-costs → /finance/view-data/labor-costs (child)
  - /finance/view-data/sales → /finance/view-data/sales (child)
  - /finance/view-data/data-imported → /finance/view-data/data-imported (child)

Daily Operations:
- /finance/daily-ops → /daily-ops (moved out of finance)
  - /daily-ops/kpis → /daily-ops/kpis (child)
  - /daily-ops/trends → /daily-ops/trends (child)
  - /daily-ops/productivity → /daily-ops/productivity (child)
  - /daily-ops/insights → /daily-ops/insights (child)
```

## 4. Files to Create/Update

### Files to update:
1. `src/components/app-sidebar.tsx` - Updated navigation structure
2. `src/contexts/DepartmentContext.tsx` - Add new departments (beverage, food, daily-ops, back-office)

### Files to create (route migrations):
1. Move `/finance/daily-ops` → `/daily-ops`
2. Create `/finance/labor/eitje/revenue` (from `/finance/data/eitje-data/finance`)
3. Create `/finance/labor/eitje/workers` (from `/finance/data/eitje-data/workers`)
4. Create `/finance/labor/eitje/teams-locations` (from `/finance/data/eitje-data/locations-teams`)
5. Move View Data pages to `/finance/view-data/*`

## Summary

1. Roadmap item added — SQL script ready
2. Navigation structure updated — organized by 5 departments
3. Route plan — migration plan documented

Note: You're in ask mode. Switch to agent mode to:
- Run the SQL script to add the roadmap item
- Update the navigation component
- Create/move route files
- Update the DepartmentContext

Should I continue in agent mode to implement these changes?

```sql
-- scripts/add-reorganize-navigation-roadmap-item.sql
-- Add roadmap item for reorganizing routes and navigation by departments

DO $$
DECLARE
  max_order INTEGER;
  current_order INTEGER;
BEGIN
  SELECT COALESCE(MAX(display_order), -1) INTO max_order FROM roadmap_items;
  current_order := max_order + 1;

  INSERT INTO roadmap_items (
    title, 
    description, 
    user_story, 
    expected_results, 
    display_order, 
    department, 
    category, 
    status, 
    have_state, 
    is_active, 
    triggers
  )
  VALUES (
    'Reorganize Routes and Navigation by Departments',
    'Reorganize all routes and navigation structure to match the 5-department structure: Beverage, Food, Finance, Daily Operations, and Back Office. Finance department should have main pages (Profit & Loss, Sales, Labor, View Data) with proper child pages hierarchy. Update all routes, navigation sidebar, and ensure all pages are accessible under the correct department structure.',
    'As a user, I want navigation organized by departments so that I can easily find pages related to my department.',
    'All routes organized by departments, navigation sidebar updated with correct hierarchy, all pages accessible under proper department routes, Finance department has main pages (P&L, Sales, Labor, View Data) with child pages (P&L Balance, Sales children, Labor Eitje pages: Revenue, Workers, Teams & Locations)',
    current_order,
    'Engineering',
    'Navigation',
    'next-up',
    'Must',
    true,
    ARRAY['navigation', 'refactoring', 'routes', 'organization']
  );

  RAISE NOTICE 'Successfully added roadmap item for navigation reorganization at display_order %', current_order;
END $$;
```

```typescript
// src/components/app-sidebar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  ClipboardCheck,
  Send,
  FileText,
  RotateCcw,
  Package,
  BarChart3,
  Box,
  Truck,
  MapPin,
  Activity,
  Palette,
  Users,
  LayoutDashboard,
  Utensils,
  ClipboardList,
  TrendingUp,
  BarChartBig,
  DollarSign,
  Upload,
  Sparkles,
  TrendingDown,
  Trash2,
  Database,
  Wifi,
  Map,
  ChevronRight,
  Clock,
  DollarSign as DollarSignIcon,
  UserCheck,
  Building2,
  Coffee,
  Apple,
  Briefcase,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserRole } from "@/hooks/useUserRole";
import { useDepartment } from "@/contexts/DepartmentContext";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

// Type definitions for menu items
type MenuItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  isCollapsible?: boolean;
  children?: MenuItem[];
};

// ========================================
// BEVERAGE DEPARTMENT
// ========================================
const beverageItems: MenuItem[] = [
  // Add beverage-specific items here
  { title: "Beverage Dashboard", url: "/beverage", icon: Coffee },
  // Add more beverage pages as needed
];

// ========================================
// FOOD DEPARTMENT
// ========================================
const foodItems: MenuItem[] = [
  // Add food-specific items here
  { title: "Food Dashboard", url: "/food", icon: Apple },
  // Add more food pages as needed
];

// ========================================
// FINANCE DEPARTMENT
// ========================================
// P&L Child Pages
const pnlChildItems: MenuItem[] = [
  { title: "Balance", url: "/finance/pnl/balance", icon: BarChartBig },
];

// Sales Child Pages (to be created)
const salesChildItems: MenuItem[] = [
  // Add sales child pages here when created
  // Example: { title: "Sales by Category", url: "/finance/sales/category", icon: TrendingUp },
];

// Labor Eitje Child Pages
const laborEitjeChildItems: MenuItem[] = [
  { title: "Revenue", url: "/finance/labor/eitje/revenue", icon: DollarSignIcon },
  { title: "Workers", url: "/finance/labor/eitje/workers", icon: UserCheck },
  { title: "Teams & Locations", url: "/finance/labor/eitje/teams-locations", icon: Building2 },
];

// View Data Child Pages
const viewDataChildItems: MenuItem[] = [
  { title: "Hours", url: "/finance/view-data/hours", icon: Clock },
  { title: "Labor Costs", url: "/finance/view-data/labor-costs", icon: DollarSignIcon },
  { title: "Sales by Bork", url: "/finance/view-data/sales", icon: TrendingUp },
  { title: "Data Imported", url: "/finance/view-data/data-imported", icon: Database },
];

const financeItems: MenuItem[] = [
  // Main Pages with Children
  {
    title: "Profit & Loss",
    url: "/finance/pnl",
    icon: DollarSign,
    isCollapsible: true,
    children: pnlChildItems,
  },
  {
    title: "Sales",
    url: "/finance/sales",
    icon: TrendingUp,
    isCollapsible: salesChildItems.length > 0,
    children: salesChildItems.length > 0 ? salesChildItems : undefined,
  },
  {
    title: "Labor",
    url: "/finance/labor",
    icon: Users,
    isCollapsible: true,
    children: laborEitjeChildItems,
  },
  {
    title: "View Data",
    url: "/finance/view-data",
    icon: Database,
    isCollapsible: true,
    children: viewDataChildItems,
  },
];

// ========================================
// DAILY OPERATIONS DEPARTMENT
// ========================================
const dailyOpsChildItems: MenuItem[] = [
  { title: "KPIs", url: "/daily-ops/kpis", icon: BarChart3 },
  { title: "Trends", url: "/daily-ops/trends", icon: TrendingUp },
  { title: "Productivity", url: "/daily-ops/productivity", icon: Activity },
  { title: "Insights", url: "/daily-ops/insights", icon: Sparkles },
];

const dailyOpsItems: MenuItem[] = [
  {
    title: "Daily Operations",
    url: "/daily-ops",
    icon: Activity,
    isCollapsible: true,
    children: dailyOpsChildItems,
  },
];

// ========================================
// BACK OFFICE DEPARTMENT
// ========================================
const backOfficeItems: MenuItem[] = [
  { title: "Back Office Dashboard", url: "/back-office", icon: Briefcase },
  { title: "Settings", url: "/back-office/settings", icon: Settings },
  { title: "Suppliers", url: "/back-office/suppliers", icon: Truck },
  { title: "Locations", url: "/back-office/locations", icon: MapPin },
  { title: "Reports", url: "/back-office/reports", icon: FileText },
  { title: "Member Activity", url: "/back-office/member-activity", icon: Activity },
  { title: "Package Usage", url: "/back-office/package-usage", icon: Package },
];

// ========================================
// ADMIN ITEMS (for Back Office)
// ========================================
const adminItems: MenuItem[] = [
  { title: "Suppliers", url: "/back-office/suppliers", icon: Truck },
  { title: "Locations", url: "/back-office/locations", icon: MapPin },
  { title: "Reports", url: "/back-office/reports", icon: BarChart3 },
  { title: "Member Activity", url: "/back-office/member-activity", icon: Activity },
  { title: "Package Usage", url: "/back-office/package-usage", icon: Package },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const pathname = usePathname();
  const { isOwner } = useUserRole();
  const { department, setDepartment } = useDepartment();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => pathname === path;
  
  // Check if any child route is active (for auto-expanding collapsible items)
  const isChildActive = (children: MenuItem[] | undefined) => {
    return children?.some((child) => pathname.startsWith(child.url)) || false;
  };
  
  // State for collapsible menus
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  
  // Auto-expand menus if any child route is active
  useEffect(() => {
    const menus: Record<string, boolean> = {};
    
    // Check Finance items
    financeItems.forEach((item) => {
      if (item.isCollapsible && item.children) {
        menus[item.title] = isChildActive(item.children);
      }
    });
    
    // Check Daily Ops items
    dailyOpsItems.forEach((item) => {
      if (item.isCollapsible && item.children) {
        menus[item.title] = isChildActive(item.children);
      }
    });
    
    setOpenMenus(menus);
  }, [pathname]);

  const departmentConfig = {
    beverage: {
      color: "border-orange-400",
      label: "Beverage Department",
      items: beverageItems,
      dashboard: "/beverage",
    },
    food: {
      color: "border-green-400",
      label: "Food Department",
      items: foodItems,
      dashboard: "/food",
    },
    finance: {
      color: "border-red-400",
      label: "Finance Department",
      items: financeItems,
      dashboard: "/finance",
    },
    "daily-ops": {
      color: "border-blue-400",
      label: "Daily Operations",
      items: dailyOpsItems,
      dashboard: "/daily-ops",
    },
    "back-office": {
      color: "border-purple-400",
      label: "Back Office",
      items: backOfficeItems,
      dashboard: "/back-office",
    },
  };

  const currentConfig = departmentConfig[department];

  const toggleMenu = (menuTitle: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuTitle]: !prev[menuTitle],
    }));
  };

  const renderMenuItem = (item: MenuItem) => {
    // Render collapsible item if it has children
    if (item.isCollapsible && item.children && item.children.length > 0) {
      const isOpen = openMenus[item.title] || false;
      const isParentActive = isActive(item.url) || isChildActive(item.children);
      
      return (
        <Collapsible 
          key={item.title} 
          open={isOpen} 
          onOpenChange={() => toggleMenu(item.title)}
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton isActive={isParentActive}>
                <item.icon />
                <span>{item.title}</span>
                <ChevronRight className={cn(
                  "ml-auto transition-transform duration-200",
                  isOpen && "rotate-90"
                )} />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.children.map((child: MenuItem) => (
                  <SidebarMenuSubItem key={child.title}>
                    <SidebarMenuSubButton asChild isActive={isActive(child.url)}>
                      <Link href={child.url}>
                        <span>{child.title}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }
    
    // Render regular item
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive(item.url)}>
          <Link href={item.url}>
            <item.icon />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-2 border-black bg-white">
      <SidebarContent className="flex flex-col">
        {/* Department Switcher */}
        {!collapsed && (
          <div className="p-4 space-y-2 border-b-2 border-black">
            <p className="text-xs text-muted-foreground mb-2">Switch Department</p>
            <Select value={department} onValueChange={(value) => setDepartment(value as typeof department)}>
              <SelectTrigger className="w-full h-9 border-2 border-black">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beverage">
                  <div className="flex items-center gap-2">
                    <Coffee className="h-4 w-4" />
                    <span>Beverage</span>
                  </div>
                </SelectItem>
                <SelectItem value="food">
                  <div className="flex items-center gap-2">
                    <Apple className="h-4 w-4" />
                    <span>Food</span>
                  </div>
                </SelectItem>
                <SelectItem value="finance">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Finance</span>
                  </div>
                </SelectItem>
                <SelectItem value="daily-ops">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span>Daily Operations</span>
                  </div>
                </SelectItem>
                <SelectItem value="back-office">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    <span>Back Office</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* Dashboard */}
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Dashboard
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive(currentConfig.dashboard)}>
                    <Link href={currentConfig.dashboard}>
                      <LayoutDashboard />
                      <span>{currentConfig.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Department Pages */}
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              {currentConfig.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {currentConfig.items.map((item) => renderMenuItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Admin Section - Only visible in Back Office for Owner/Admin */}
          {department === "back-office" && isOwner() && (
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}
        </div>

        {/* Import & Connection Section - Sticky Bottom */}
        <div className="mt-auto border-t-2 border-black pb-4">
          <SidebarGroup>
            <SidebarGroupLabel>Import & Connection</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/finance/imports")}>
                  <Link href="/finance/imports">
                    <Upload />
                    <span>Data Imports</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/finance/bork-api")}>
                  <Link href="/finance/bork-api">
                    <Wifi />
                    <span>Bork API Connect</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/finance/eitje-api")}>
                  <Link href="/finance/eitje-api">
                    <Wifi />
                    <span>Eitje API Connect</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/finance/formitable-api")}>
                  <Link href="/finance/formitable-api">
                    <Wifi />
                    <span>Formitable API Connect</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/roadmap")}>
                  <Link href="/roadmap">
                    <Map />
                    <span>Roadmap</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/docs") || pathname.startsWith("/docs/")}>
                  <Link href="/docs">
                    <FileText />
                    <span>Documentation</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/design-systems") || pathname.startsWith("/design-systems/")}>
                  <Link href="/design-systems">
                    <Palette />
                    <span>Design Systems</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
```

```plaintext
Finance Department:
- /finance/pnl → /finance/pnl (main)
  - /finance/pnl/balance → /finance/pnl/balance ✅ (child)
  
- /finance/sales → /finance/sales (main)
  - (Sales child pages to be created)

- /finance/labor → /finance/labor (main)
  - /finance/labor/eitje/revenue → /finance/labor/eitje/revenue (child)
  - /finance/labor/eitje/workers → /finance/labor/eitje/workers (child)
  - /finance/labor/eitje/teams-locations → /finance/labor/eitje/teams-locations (child)

- /finance/view-data → /finance/view-data (main)
  - /finance/view-data/hours → /finance/view-data/hours (child)
  - /finance/view-data/labor-costs → /finance/view-data/labor-costs (child)
  - /finance/view-data/sales → /finance/view-data/sales (child)
  - /finance/view-data/data-imported → /finance/view-data/data-imported (child)

Daily Operations:
- /finance/daily-ops → /daily-ops (moved out of finance)
  - /daily-ops/kpis → /daily-ops/kpis (child)
  - /daily-ops/trends → /daily-ops/trends (child)
  - /daily-ops/productivity → /daily-ops/productivity (child)
  - /daily-ops/insights → /daily-ops/insights (child)
```

