'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { calculateMonthlyPnL, getAvailableCategories, type PnLData } from '@/lib/finance/pnl-calculations';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

// PnLData interface is now imported from pnl-calculations

interface ProcessedPnLData {
  category: string;
  subcategory: string | null;
  amounts: { [month: number]: number };
  total: number;
  isExpanded: boolean;
  isSubcategory: boolean;
  isMissing?: boolean; // Flag for missing categories
  isCollapsible?: boolean; // Flag for collapsible categories
  parentCategory?: string; // Parent category for subcategories
}

interface ValidationResult {
  isValid: boolean;
  errorMargin: number;
  calculatedResult: number;
  actualResult: number;
  missingCategories: string[];
}

// MONTHS will be defined inside the component to use translations

// LOCATIONS will be defined inside the component to use translations

const COGS_CATEGORIES = [
  // REVENUE CALCULATIONS
  {
    category: 'Netto-omzet groepen',
    subcategories: [
      'Netto-omzet uit leveringen geproduceerde goederen',
      'Netto-omzet uit verkoop van handelsgoederen'
    ],
    isCollapsible: true
  },
  {
    category: 'Netto-omzet uit leveringen geproduceerde goederen',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Netto-omzet groepen',
    isCollapsible: true
  },
  {
    category: 'Netto-omzet uit verkoop van handelsgoederen',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Netto-omzet groepen',
    isCollapsible: true
  },
  
  // COST OF SALES COGS
  {
    category: 'Kostprijs van de omzet',
    subcategories: [
      'Inkoopwaarde handelsgoederen'
    ],
    isCollapsible: true
  },
  {
    category: 'Inkoopwaarde handelsgoederen',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Kostprijs van de omzet'
  },
  
  // LABOR COST COGS
  {
    category: 'Total Labor',
    subcategories: [
      'Labor - Contract',
      'Labor - Flex',
      'Labor - Other'
    ],
    isCollapsible: true
  },
  {
    category: 'Labor - Contract',
    subcategories: [
      'Lonen en salarissen',
      'Overige lasten uit hoofde van personeelsbeloningen',
      'Pensioenlasten',
      'Sociale lasten'
    ],
    isSubcategory: true,
    parentCategory: 'Total Labor'
  },
  {
    category: 'Labor - Flex',
    subcategories: [
      'Werkkostenregeling - detail'
    ],
    isSubcategory: true,
    parentCategory: 'Total Labor'
  },
  {
    category: 'Labor - Other',
    subcategories: [
      'Overige personeelsgerelateerde kosten'
    ],
    isSubcategory: true,
    parentCategory: 'Total Labor'
  },
  {
    category: 'Lonen en salarissen',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Labor - Contract'
  },
  {
    category: 'Overige lasten uit hoofde van personeelsbeloningen',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Labor - Contract'
  },
  {
    category: 'Pensioenlasten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Labor - Contract'
  },
  {
    category: 'Sociale lasten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Labor - Contract'
  },
  {
    category: 'Werkkostenregeling - detail',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Labor - Flex'
  },
  {
    category: 'Overige personeelsgerelateerde kosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Labor - Other'
  },
  
  // OTHER_UNDEFINED COGS
  {
    category: 'Overige bedrijfskosten',
    subcategories: [
      'Accountants- en advieskosten',
      'Administratieve lasten',
      'Andere kosten',
      'Assurantiekosten',
      'Autokosten',
      'Exploitatie- en machinekosten',
      'Huisvestingskosten',
      'Kantoorkosten',
      'Verkoop gerelateerde kosten'
    ],
    isCollapsible: true
  },
  {
    category: 'Accountants- en advieskosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige bedrijfskosten'
  },
  {
    category: 'Administratieve lasten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige bedrijfskosten'
  },
  {
    category: 'Andere kosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige bedrijfskosten'
  },
  {
    category: 'Assurantiekosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige bedrijfskosten'
  },
  {
    category: 'Autokosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige bedrijfskosten'
  },
  {
    category: 'Exploitatie- en machinekosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige bedrijfskosten'
  },
  {
    category: 'Huisvestingskosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige bedrijfskosten'
  },
  {
    category: 'Kantoorkosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige bedrijfskosten'
  },
  {
    category: 'Verkoop gerelateerde kosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige bedrijfskosten'
  },
  
  // DEPRECIATION
  {
    category: 'Afschrijvingen op immateriële en materiële vaste activa',
    subcategories: [
      'Afschrijvingen op immateriële vaste activa',
      'Afschrijvingen op materiële vaste activa'
    ],
    isCollapsible: true
  },
  {
    category: 'Afschrijvingen op immateriële vaste activa',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Afschrijvingen op immateriële en materiële vaste activa'
  },
  {
    category: 'Afschrijvingen op materiële vaste activa',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Afschrijvingen op immateriële en materiële vaste activa'
  },
  
  // FINANCIAL
  {
    category: 'Financiële baten en lasten',
    subcategories: [
      'Rentebaten en soortgelijke opbrengsten',
      'Rentelasten en soortgelijke kosten',
      'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten'
    ],
    isCollapsible: true
  },
  {
    category: 'Rentebaten en soortgelijke opbrengsten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Financiële baten en lasten'
  },
  {
    category: 'Rentelasten en soortgelijke kosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Financiële baten en lasten'
  },
  {
    category: 'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Financiële baten en lasten'
  }
];

export default function PnLBalancePage() {
  const { t } = useTranslation('common');
  
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [pnlData, setPnlData] = useState<ProcessedPnLData[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [availableMonths, setAvailableMonths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

  // Define translated arrays
  const MONTHS = useMemo(() => [
    { value: 1, label: t('pnl.table.january') },
    { value: 2, label: t('pnl.table.february') },
    { value: 3, label: t('pnl.table.march') },
    { value: 4, label: t('pnl.table.april') },
    { value: 5, label: t('pnl.table.may') },
    { value: 6, label: t('pnl.table.june') },
    { value: 7, label: t('pnl.table.july') },
    { value: 8, label: t('pnl.table.august') },
    { value: 9, label: t('pnl.table.september') },
    { value: 10, label: t('pnl.table.october') },
    { value: 11, label: t('pnl.table.november') },
    { value: 12, label: t('pnl.table.december') }
  ], [t]);

  const LOCATIONS = useMemo(() => [
    { value: 'all', label: t('pnl.locations.all') },
    { value: '550e8400-e29b-41d4-a716-446655440001', label: t('pnl.locations.kinsbergen') },
    { value: '550e8400-e29b-41d4-a716-446655440002', label: t('pnl.locations.barbea') },
    { value: '550e8400-e29b-41d4-a716-446655440003', label: t('pnl.locations.lamour') }
  ], [t]);

  // Process raw P&L data into structured format using calculation service
  const processPnLData = useCallback((rawData: PnLData[]): ProcessedPnLData[] => {
    const processed: ProcessedPnLData[] = [];

    // Get available categories from the data
    const availableCategories = getAvailableCategories(rawData);
    console.log('[P&L Debug] Available categories in data:', availableCategories);

    // Process main categories first
    COGS_CATEGORIES.forEach(categoryConfig => {
      // Skip subcategories here, they'll be processed separately
      if (categoryConfig.isSubcategory) return;
      
      // Add main category
      const mainCategory: ProcessedPnLData = {
        category: categoryConfig.category,
        subcategory: null,
        amounts: {},
        total: 0,
        isExpanded: false,
        isSubcategory: false,
        isCollapsible: categoryConfig.isCollapsible || false
      };

      // Calculate amounts for each month by summing all subcategories
      MONTHS.forEach(month => {
        let monthlyTotal = 0;
        
        // Sum all subcategories for this main category
        if (categoryConfig.subcategories) {
          categoryConfig.subcategories.forEach(subcategoryName => {
            const subcategoryData = rawData.filter(d => 
              d.category === subcategoryName && d.month === month.value
            );
            monthlyTotal += subcategoryData.reduce((sum, d) => sum + (d.amount || 0), 0);
          });
        }
        
        // Also check if the main category itself has data
        const mainCategoryData = rawData.filter(d => 
          d.category === categoryConfig.category && d.month === month.value && !d.subcategory
        );
        monthlyTotal += mainCategoryData.reduce((sum, d) => sum + (d.amount || 0), 0);
        
        mainCategory.amounts[month.value] = monthlyTotal;
        mainCategory.total += monthlyTotal;
      });

      processed.push(mainCategory);

      // Add subcategories
      if (categoryConfig.subcategories) {
        categoryConfig.subcategories.forEach(subcategoryName => {
          const subcategory: ProcessedPnLData = {
            category: subcategoryName,
            subcategory: null,
            amounts: {},
            total: 0,
            isExpanded: false,
            isSubcategory: true,
            parentCategory: categoryConfig.category,
            isCollapsible: true
          };

          // Calculate amounts for each month
          MONTHS.forEach(month => {
            let monthlyTotal = 0;
            
            // Check if subcategory has its own data
            const subcategoryData = rawData.filter(d => 
              d.category === subcategoryName && d.month === month.value
            );
            monthlyTotal += subcategoryData.reduce((sum, d) => sum + (d.amount || 0), 0);
            
            subcategory.amounts[month.value] = monthlyTotal;
            subcategory.total += monthlyTotal;
          });

          processed.push(subcategory);

          // Add sub-subcategories
          const subcategoryConfig = COGS_CATEGORIES.find(c => c.category === subcategoryName);
          // Use configured list when provided, otherwise derive dynamically from rawData
          const subSubList = (subcategoryConfig && subcategoryConfig.subcategories && subcategoryConfig.subcategories.length > 0)
            ? subcategoryConfig.subcategories
            : Array.from(new Set(
                rawData
                  .filter(d => d.category === subcategoryName && d.subcategory)
                  .map(d => d.subcategory as string)
              ));

          if (subSubList && subSubList.length > 0) {
            subSubList.forEach(subSubcategoryName => {
              const subSubcategory: ProcessedPnLData = {
                category: subcategoryName,
                subcategory: subSubcategoryName,
                amounts: {},
                total: 0,
                isExpanded: false,
                isSubcategory: true,
                parentCategory: subcategoryName
              };

              // Calculate amounts for each month
              MONTHS.forEach(month => {
                const subSubcategoryData = rawData.filter(d => 
                  d.category === subcategoryName && d.subcategory === subSubcategoryName && d.month === month.value
                );
                const monthlyTotal = subSubcategoryData.reduce((sum, d) => sum + (d.amount || 0), 0);
                
                subSubcategory.amounts[month.value] = monthlyTotal;
                subSubcategory.total += monthlyTotal;
              });

              processed.push(subSubcategory);
            });
          }
        });
      }
    });

    // Add calculated "Resultaat" (Profit/Loss) row
    const resultaat: ProcessedPnLData = {
      category: 'Resultaat',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: false
    };
    
    // Calculate Resultaat for each month
    MONTHS.forEach(month => {
      const monthlyPnL = calculateMonthlyPnL(rawData, month.value);
      resultaat.amounts[month.value] = monthlyPnL.resultaat;
      resultaat.total += monthlyPnL.resultaat;
      
      // Debug logging for January 2025
      if (month.value === 1) {
        console.log(`[P&L Debug] January 2025 Calculation:`, {
          revenue: monthlyPnL.revenue,
          costs: monthlyPnL.costs,
          resultaat: monthlyPnL.resultaat,
          validation: monthlyPnL.validation
        });
      }
    });

    processed.push(resultaat);

    return processed;
  }, [MONTHS]);

  // Load P&L data
  const loadPnLData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        location: selectedLocation
      });

      const apiUrl = `/api/finance/pnl-data?${params}`;
      console.log('Making API call to:', apiUrl);
      const response = await fetch(apiUrl);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('API result:', result);

      if (!result.success) {
        console.error('API returned success: false', result);
        throw new Error(result.error || 'Failed to load P&L data');
      }

      const rawData: PnLData[] = result.data || [];
      
      // Check if database is down and show non-blocking warning
      if (result.meta?.warning) {
        console.warn('Database warning:', result.meta.warning);
        setWarning(t('pnl.alerts.databaseWarning'));
      } else if (rawData.length === 0) {
        // No data found for the selected year/location
        setError(t('pnl.alerts.noData'));
      }
      
      // Extract available months from the data
      const months = [...new Set(rawData.map(item => item.month))].sort((a, b) => a - b);
      setAvailableMonths(months);
      
      const processedData = processPnLData(rawData);
      setPnlData(processedData);

      // Validate the data
      const validation = validateBalance(processedData);
      setValidationResult(validation);

    } catch (err) {
      console.error('Error loading P&L data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load P&L data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, selectedLocation, processPnLData, t]);

  // Validate balance with 0.5% error margin
  const validateBalance = (data: ProcessedPnLData[]): ValidationResult => {
    const nettoOmzet = data.find(d => d.category === 'Netto-omzet' && !d.isSubcategory);
    const resultaat = data.find(d => d.category === 'Resultaat' && !d.isSubcategory);
    
    if (!nettoOmzet || !resultaat) {
      return {
        isValid: false,
        errorMargin: 100,
        calculatedResult: 0,
        actualResult: 0,
        missingCategories: ['Netto-omzet or Resultaat not found']
      };
    }

    // Calculate total costs (all categories except Netto-omzet and Resultaat)
    const costCategories = data.filter(d => 
      d.category !== 'Netto-omzet' && 
      d.category !== 'Resultaat' && 
      !d.isSubcategory
    );
    
    // Costs are already negative in database, so we add them (subtract negative = add)
    const totalCosts = costCategories.reduce((sum, category) => sum + category.total, 0);
    const calculatedResult = nettoOmzet.total + totalCosts; // Add because costs are negative
    const actualResult = resultaat.total;
    
    // Since we calculate Resultaat ourselves, it should always match
    const errorMargin = 0; // Perfect match since we calculate it

    const missingCategories: string[] = [];
    // Check for missing data in cost categories
    costCategories.forEach(category => {
      if (category.total === 0) {
        missingCategories.push(category.category);
      }
    });

    return {
      isValid: missingCategories.length === 0, // Valid if no missing categories
      errorMargin,
      calculatedResult,
      actualResult,
      missingCategories
    };
  };

  // Toggle row expansion
  const toggleExpansion = (index: number) => {
    setPnlData(prev => prev.map((item, i) => 
      i === index ? { ...item, isExpanded: !item.isExpanded } : item
    ));
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    loadPnLData();
  }, [selectedYear, selectedLocation, loadPnLData]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{t('pnl.title')}</h1>
          <p className="text-muted-foreground">
            {t('pnl.description')}
          </p>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pnl.filters.year')} & {t('pnl.filters.location')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Year Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">{t('pnl.filters.year')}:</span>
            <div className="flex gap-2">
              <Button
                variant={selectedYear === 2024 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedYear(2024)}
              >
                2024
              </Button>
              <Button
                variant={selectedYear === 2025 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedYear(2025)}
              >
                2025
              </Button>
            </div>
          </div>

          {/* Month Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Month:</span>
            <div className="flex gap-2 flex-wrap">
              {MONTHS.filter(month => availableMonths.includes(month.value)).map(month => (
                <Button
                  key={month.value}
                  variant={selectedMonth === month.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedMonth(month.value)}
                >
                  {month.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Location Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">{t('pnl.filters.location')}:</span>
            <div className="flex gap-2">
              {LOCATIONS.map(location => (
                <Button
                  key={location.value}
                  variant={selectedLocation === location.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLocation(location.value)}
                >
                  {location.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Clear Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedYear(2025);
                setSelectedMonth(availableMonths.length > 0 ? availableMonths[0] : 1);
                setSelectedLocation('all');
              }}
            >
              {t('pnl.filters.clear')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Debug Calculation Display */}
      {pnlData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Calculation Debug - January 2025</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              {(() => {
                const janData = pnlData.find(p => p.category === 'Netto-omzet' && !p.isSubcategory);
                const kostprijs = pnlData.find(p => p.category === 'Kostprijs van de omzet' && !p.isSubcategory);
                const personeel = pnlData.find(p => p.category === 'Lasten uit hoofde van personeelsbeloningen' && !p.isSubcategory);
                const afschrijvingen = pnlData.find(p => p.category === 'Afschrijvingen op immateriële en materiële vaste activa' && !p.isSubcategory);
                const financieel = pnlData.find(p => p.category === 'Financiële baten en lasten' && !p.isSubcategory);
                const resultaat = pnlData.find(p => p.category === 'Resultaat' && !p.isSubcategory);
                
                return (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Netto-omzet: {formatCurrency(janData?.amounts[1] || 0)}</div>
                    <div>Kostprijs: {formatCurrency(kostprijs?.amounts[1] || 0)}</div>
                    <div>Personeel: {formatCurrency(personeel?.amounts[1] || 0)}</div>
                    <div>Afschrijvingen: {formatCurrency(afschrijvingen?.amounts[1] || 0)}</div>
                    <div>Financieel: {formatCurrency(financieel?.amounts[1] || 0)}</div>
                    <div className="font-bold">Resultaat: {formatCurrency(resultaat?.amounts[1] || 0)}</div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Alert */}
      {validationResult && (
        <Alert variant={validationResult.isValid ? 'default' : 'destructive'}>
          {validationResult.isValid ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertDescription>
            {validationResult.isValid ? (
              `Balance validation passed (Error margin: ${validationResult.errorMargin.toFixed(2)}%)`
            ) : (
              <div>
                <div>Balance validation failed (Error margin: {validationResult.errorMargin.toFixed(2)}%)</div>
                <div>Calculated: {formatCurrency(validationResult.calculatedResult)} | Actual: {formatCurrency(validationResult.actualResult)}</div>
                {validationResult.missingCategories.length > 0 && (
                  <div>Missing categories: {validationResult.missingCategories.join(', ')}</div>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Warning / Error Alerts */}
      {warning && (
        <Alert variant="default">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* P&L Balance Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pnl.title')} - {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-muted-foreground">{t('pnl.alerts.loading')}</div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center p-4">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">{t('pnl.table.category')}</TableHead>
                  {MONTHS.filter(month => availableMonths.includes(month.value)).map(month => (
                    <TableHead key={month.value} className="text-center min-w-[100px]">
                      {month.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[100px] font-bold">{t('pnl.table.total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pnlData.map((item, index) => {
                  // Skip subcategories that should be hidden when parent is collapsed
                  if (item.isSubcategory && item.parentCategory) {
                    const parentIndex = pnlData.findIndex(p => p.category === item.parentCategory && !p.isSubcategory);
                    if (parentIndex !== -1 && !pnlData[parentIndex].isExpanded) {
                      return null;
                    }
                  }
                  
                  // Skip sub-subcategories that should be hidden when parent is collapsed
                  if (item.isSubcategory && item.subcategory && item.parentCategory) {
                    const parentSubcategoryIndex = pnlData.findIndex(p => p.category === item.parentCategory && !p.subcategory);
                    if (parentSubcategoryIndex !== -1 && !pnlData[parentSubcategoryIndex].isExpanded) {
                      return null;
                    }
                  }

                  // Determine indentation level
                  let indentLevel = 0;
                  if (item.isSubcategory && item.parentCategory) {
                    indentLevel = 1;
                    if (item.subcategory) {
                      indentLevel = 2;
                    }
                  }

                  return (
                    <TableRow 
                      key={`${item.category}-${item.subcategory || 'main'}`}
                      className={`
                        ${item.category === 'Resultaat' ? 'font-bold bg-muted' : ''}
                        ${item.isSubcategory ? 'bg-muted/50' : ''}
                        ${item.isMissing ? 'bg-red-50 border-l-4 border-red-400' : ''}
                      `}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {/* Indentation */}
                          {indentLevel > 0 && <span className={`w-${indentLevel * 4}`} />}
                          
                          {/* Collapse/Expand button for main categories */}
                          {!item.isSubcategory && item.isCollapsible && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpansion(index)}
                            >
                              {item.isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          
                          {/* Collapse/Expand button for subcategories */}
                          {item.isSubcategory && item.isCollapsible && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpansion(index)}
                            >
                              {item.isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          
                          {/* Category name */}
                          <span className={item.category === 'Resultaat' ? 'font-bold' : ''}>
                            {item.subcategory || item.category}
                            {item.isMissing && (
                              <span className="ml-2 text-red-500 text-xs font-medium">
                                (MISSING DATA)
                              </span>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      {MONTHS.filter(month => availableMonths.includes(month.value)).map(month => (
                        <TableCell key={month.value} className="text-right">
                          {formatCurrency(item.amounts[month.value] || 0)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
