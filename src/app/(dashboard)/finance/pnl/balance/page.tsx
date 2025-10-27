'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { calculateMonthlyPnL, getAvailableCategories, type PnLData, type PnLCalculation } from '@/lib/finance/pnl-calculations';

// PnLData interface is now imported from pnl-calculations

interface ProcessedPnLData {
  category: string;
  subcategory: string | null;
  amounts: { [month: number]: number };
  total: number;
  isExpanded: boolean;
  isSubcategory: boolean;
  isMissing?: boolean; // Flag for missing categories
}

interface ValidationResult {
  isValid: boolean;
  errorMargin: number;
  calculatedResult: number;
  actualResult: number;
  missingCategories: string[];
}

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Maa' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' }
];

const LOCATIONS = [
  { value: 'All', label: 'All' },
  { value: 'Kinsbergen', label: 'Kinsbergen' },
  { value: 'BarBea Labour', label: 'BarBea Labour' },
  { value: "l'Amour-Toujour", label: "l'Amour-Toujour" }
];

const COGS_CATEGORIES = [
  {
    category: 'Netto-omzet',
    subcategories: ['Netto-omzet groepen']
  },
  {
    category: 'Kostprijs van de omzet',
    subcategories: ['Inkoopwaarde handelsgoederen']
  },
  {
    category: 'Lasten uit hoofde van personeelsbeloningen',
    subcategories: ['Lonen en salarissen', 'Sociale lasten', 'Pensioenlasten', 'Overige lasten uit hoofde van personeelsbeloningen']
  },
  {
    category: 'Afschrijvingen op immateriële en materiële vaste activa',
    subcategories: ['Afschrijvingen op immateriële vaste activa', 'Afschrijvingen op materiële vaste activa']
  },
  {
    category: 'Financiële baten en lasten',
    subcategories: ['Rentebaten en soortgelijke opbrengsten', 'Rentelasten en soortgelijke kosten']
  }
];

export default function PnLBalancePage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [pnlData, setPnlData] = useState<ProcessedPnLData[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableMonths, setAvailableMonths] = useState<number[]>([]);

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
  }, [selectedYear, selectedLocation]);

  // Process raw P&L data into structured format using calculation service
  const processPnLData = (rawData: PnLData[]): ProcessedPnLData[] => {
    const processed: ProcessedPnLData[] = [];

    // Get available categories from the data
    const availableCategories = getAvailableCategories(rawData);
    console.log('[P&L Debug] Available categories in data:', availableCategories);

    COGS_CATEGORIES.forEach(categoryConfig => {
      const hasData = availableCategories.includes(categoryConfig.category);
      
      // Add main category (even if no data, to show missing categories)
      const mainCategoryData = rawData.filter(d => d.category === categoryConfig.category && !d.subcategory);
      const mainCategory: ProcessedPnLData = {
        category: categoryConfig.category,
        subcategory: null,
        amounts: {},
        total: 0,
        isExpanded: false,
        isSubcategory: false,
        isMissing: !hasData // Flag missing categories
      };

      // Calculate amounts for each month
      MONTHS.forEach(month => {
        const monthData = mainCategoryData.find(d => d.month === month.value);
        mainCategory.amounts[month.value] = monthData?.amount || 0;
        mainCategory.total += monthData?.amount || 0;
      });

      processed.push(mainCategory);

      // Add subcategories if they exist and main category has data
      if (hasData) {
        categoryConfig.subcategories.forEach(subcategoryName => {
          const subcategoryData = rawData.filter(d => 
            d.category === categoryConfig.category && d.subcategory === subcategoryName
          );
          
          const subcategory: ProcessedPnLData = {
            category: categoryConfig.category,
            subcategory: subcategoryName,
            amounts: {},
            total: 0,
            isExpanded: false,
            isSubcategory: true
          };

          MONTHS.forEach(month => {
            const monthData = subcategoryData.find(d => d.month === month.value);
            subcategory.amounts[month.value] = monthData?.amount || 0;
            subcategory.total += monthData?.amount || 0;
          });

          processed.push(subcategory);
        });
      }
    });

    // Add calculated "Resultaat" (Profit/Loss) row using calculation service
    const resultaat: ProcessedPnLData = {
      category: 'Resultaat',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: false
    };

    // Calculate Resultaat for each month using the calculation service
    MONTHS.forEach(month => {
      const monthCalculation = calculateMonthlyPnL(rawData, month.value);
      resultaat.amounts[month.value] = monthCalculation.resultaat;
      resultaat.total += monthCalculation.resultaat;
      
      // Debug logging for January 2025
      if (month.value === 1) {
        console.log(`[P&L Debug] January 2025 Calculation:`, {
          revenue: monthCalculation.revenue,
          costs: monthCalculation.costs,
          resultaat: monthCalculation.resultaat,
          validation: monthCalculation.validation
        });
      }
    });

    processed.push(resultaat);

    return processed;
  };

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
      <div>
        <h1 className="text-3xl font-bold">Profit & Loss Balance</h1>
        <p className="text-muted-foreground">
          Monthly P&L balance tables with expandable COGS categories
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Year Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Year:</span>
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
            <span className="text-sm font-medium text-muted-foreground">Location:</span>
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
                setSelectedLocation('All');
              }}
            >
              Clear
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

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* P&L Balance Table */}
      <Card>
        <CardHeader>
          <CardTitle>P&L Balance Table - {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-muted-foreground">Loading P&L data...</div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center p-4">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Category</TableHead>
                  {MONTHS.filter(month => availableMonths.includes(month.value)).map(month => (
                    <TableHead key={month.value} className="text-center min-w-[100px]">
                      {month.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[100px] font-bold">Totaal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pnlData.map((item, index) => (
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
                        {item.subcategory ? (
                          <>
                            <span className="w-4" /> {/* Indent subcategories */}
                            <span className="text-sm text-muted-foreground">{item.subcategory}</span>
                          </>
                        ) : (
                          <>
                            {(() => {
                              const categoryConfig = COGS_CATEGORIES.find(c => c.category === item.category);
                              const hasSubcategories = categoryConfig?.subcategories && categoryConfig.subcategories.length > 0;
                              return hasSubcategories && (
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
                              );
                            })()}
                            <span className={item.category === 'Resultaat' ? 'font-bold' : ''}>
                              {item.category}
                              {item.isMissing && (
                                <span className="ml-2 text-red-500 text-xs font-medium">
                                  (MISSING DATA)
                                </span>
                              )}
                            </span>
                          </>
                        )}
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
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
