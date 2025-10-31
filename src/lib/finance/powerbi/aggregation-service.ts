/**
 * PowerBI P&L Aggregation Service
 * 
 * Implements the correct COGS hierarchy and calculation formula:
 * Result = Revenue - COST_OF_SALES - LABOR_COST - OTHER_UNDEFINED
 */

import { createClient } from '@/integrations/supabase/server';

export interface AggregatedPnLRecord {
  location_id: string;
  year: number;
  month: number;
  
  // Summary COGS Columns (for high-level analysis)
  revenue_food: number;
  revenue_beverage: number;
  revenue_total: number;
  
  cost_of_sales_food: number;
  cost_of_sales_beverage: number;
  cost_of_sales_total: number;
  
  labor_contract: number;
  labor_flex: number;
  labor_total: number;
  
  other_costs_total: number;
  opbrengst_vorderingen: number;
  resultaat: number;
  
  // Detailed COGS Columns (for granular analysis)
  netto_omzet_uit_levering_geproduceerd: number;
  netto_omzet_verkoop_handelsgoederen: number;
  inkoopwaarde_handelsgoederen: number;
  lonen_en_salarissen: number;
  huisvestingskosten: number;
  exploitatie_kosten: number;
  verkoop_kosten: number;
  autokosten: number;
  kantoorkosten: number;
  assurantiekosten: number;
  accountantskosten: number;
  administratieve_lasten: number;
  andere_kosten: number;
  afschrijvingen: number;
  financiele_baten_lasten: number;
  
  // Legacy totals (for compatibility)
  total_revenue: number;
  total_cost_of_sales: number;
  total_labor_costs: number;
  total_other_costs: number;
  total_costs: number;
  
  import_id?: string;
}

export interface RawPnLData {
  location_id: string;
  year: number;
  month: number;
  category: string;
  subcategory: string | null;
  gl_account: string;
  amount: number;
  import_id?: string;
}

/**
 * Revenue category mappings with VAT considerations
 */
const REVENUE_CATEGORIES = {
  // Netto Omzet Uit Levering Geproduceerd (Low VAT)
  // Includes both category-level and subcategory-level matches
  netto_omzet_uit_levering: [
    // Category-level (top-level category names from database)
    'Netto-omzet uit leveringen geproduceerde goederen',
    // Note: 'Netto-omzet groepen' is a parent category - don't include to avoid double counting
    // Subcategory-level (detailed GL accounts)
    'Omzet snacks (btw laag)',
    'Verkopen snacks (btw laag)', // Alternative naming in data
    'Omzet lunch (btw laag)', 
    'Omzet diner (btw laag)',
    'Omzet menu\'s (btw laag)',
    'Omzet keuken overig (btw laag)'
  ],
  
  // Netto Omzet Verkoop Handelsgoederen (Mixed VAT)
  // Includes both category-level and subcategory-level matches
  netto_omzet_verkoop_handelsgoederen: [
    // Category-level (top-level category names from database)
    'Netto-omzet uit verkoop van handelsgoederen',
    // Note: 'Netto-omzet groepen' is a parent category - don't include to avoid double counting
    // Subcategory-level (detailed GL accounts)
    'Omzet wijnen (btw hoog)',
    'Omzet gedestilleerd (btw hoog)',
    'Omzet cocktails (btw hoog)',
    'Omzet cider (btw hoog)',
    'Omzet hoog overig (btw hoog)',
    'Omzet hoog alcoholische warme dranken (btw hoog)', // Additional variant
    'Omzet speciaalbier fles (btw hoog)',
    'Omzet speciaalbier tap (btw hoog)',
    'Omzet tap pilsner (btw hoog)',
    'Omzet koffie / thee (btw laag)',
    'Verkopen koffie/thee(btw laag)', // Alternative naming in data
    'Omzet frisdranken (btw laag)',
    'Omzet frisdtranken (btw laag)', // Typo variant in data
    'Omzet alcohol vrij (btw laag)',
    'Omzet alcohol virj (btw laag)', // Typo variant in data
    'Omzet laag overig (btw laag)',
    'Omzet non food (btw hoog)'
  ]
};

/**
 * Cost category mappings - COMPLETE MAPPING INCLUDING ALL MISSING CATEGORIES
 */
const COST_CATEGORIES = {
  // COST OF SALES
  // Includes both category-level and subcategory-level matches
  inkoopwaarde_handelsgoederen: [
    // Category-level (top-level category names from database)
    'Inkoopwaarde handelsgoederen',
    'Kostprijs van de omzet',
    // Subcategory-level (detailed GL accounts)
    'Inkopen bieren fles (btw hoog)',
    'Inkopen sterke dranken (btw hoog)',
    'Inkopen wijnen (btw hoog)',
    'Inkopen speciaalbier fles (btw hoog)',
    'Inkopen speciaalbier tap (btw hoog)',
    'Inkopen pilsner tap (btw hoog)',
    'Inkopen koffie (btw laag)',
    'Inkopen frisdrank (btw laag)',
    'Inkopen bieren (btw laag)',
    'Inkopen alcohol vrije drank (btw laag)',
    'Inkopen bar overige (btw laag)',
    'Statiegeld',
    'Inkopen keuken (btw hoog)',
    'Inkopen keuken (btw laag)',
    'Inkopen (geheel vrijgesteld van btw)'
  ],
  
  // LABOR COST COGS - COMPLETE MAPPING
  // Includes both category-level and subcategory-level matches
  lonen_en_salarissen: [
    // Category-level (top-level category names from database)
    'Lonen en salarissen',
    'Arbeidskosten',
    // Subcategory-level (detailed GL accounts)
    // Keuken Salaris Kosten
    'Bruto Salarissen Keuken',
    'Doorberekende loonkosten keuken',
    'Mutatie reservering vakantietoeslag keuken',
    'Mutatie reservering vakantiedagen keuken',
    'Werkgeversdeel overige fondsen keuken',
    'Werkgeversdeel pensioenen keuken',
    'Onkostenvergoeding keuken',
    
    // Bediening Salaris Kosten
    'Bruto Salarissen Bediening',
    'Doorberekende loonkosten bediening',
    'Mutatie reservering vakantietoeslag bediening',
    'Mutatie reservering vakantiedagen bediening',
    'Werkgeversdeel overige fondsen bediening',
    'Werkgeversdeel pensioenen bediening',
    'Onkostenvergoeding bediening',
    
    // Overhead Salaris Kosten
    'Bruto Salarissen overhead',
    'Doorberekende loonkosten Overhead',
    'Mutatie reservering vakantietoeslag overhead',
    'Mutatie reservering vakantiedagen overhead',
    'Werkgeversdeel pensioenen overhead',
    
    // Inhuur
    'Inhuur F&B',
    'Inhuur Afwas',
    'Inhuur keuken',
    'Inhuur overhead',
    'Loonkosten Overhead',
    
    // Overige Lonen & Salaris gerelateerd kosten
    'HOP premie',
    'Studie- en opleidsingskosten personeel',
    'Ziekengeldverzekering',
    'Arbodienst',
    'Bedrijfskleding',
    'Overige personeelskosten',
    'Waskosten uniformen',
    'Uitkering ziekengeld',
    'Onkostenvergoeding'
  ],
  
  // HOUSING COSTS - SEPARATE CATEGORY (€151,408 missing)
  // HOUSING COSTS - Includes both category-level and subcategory-level matches
  huisvestingskosten: [
    // Category-level (top-level category names from database)
    'Huisvestingskosten',
    // Subcategory-level (detailed GL accounts)
    'Elektra',
    'Huur gebouwen',
    'Huur',
    'Gas',
    'Water',
    'Onderhoud gebouwen',
    'Schoonmaakkosten',
    'Gemeentelijke lasten etc.',
    'Overige huisvestingskosten'
  ],
  
  // OPERATING COSTS - Includes both category-level and subcategory-level matches
  exploitatie_kosten: [
    // Category-level (top-level category names from database)
    'Exploitatie- en machinekosten',
    // Subcategory-level (detailed GL accounts)
    'Huur machines',
    'Kleine aanschaffingen',
    'Kleine aanschaffingen bar',
    'Kleine aanschaffingen keuken',
    'Waskosten Linnen',
    'Papierwaren',
    'Reparatie en onderhoud',
    'Reparatie en onderhoud keuken',
    'Glaswerk / bestek'
  ],
  
  // SALES COSTS - Includes both category-level and subcategory-level matches
  verkoop_kosten: [
    // Category-level (top-level category names from database)
    'Verkoop gerelateerde kosten',
    // Subcategory-level (detailed GL accounts)
    'Decoratie',
    'Advertenties',
    'Reclame',
    'Sponsoring',
    'Muziek en entertainment',
    'Representatiekosten',
    'Reis- en verblijfkosten',
    'Overige verkoopkosten'
  ],
  
  // CAR COSTS - Includes both category-level and subcategory-level matches
  autokosten: [
    // Category-level (top-level category names from database)
    'Autokosten',
    // Subcategory-level (detailed GL accounts)
    'Brandstoffen',
    'Onderhoud auto(`s)',
    'Leasekosten auto(`s)'
  ],
  
  // OFFICE COSTS - Includes both category-level and subcategory-level matches
  kantoorkosten: [
    // Category-level (top-level category names from database)
    'Kantoorkosten',
    // Subcategory-level (detailed GL accounts)
    'Kantoorbenodigdheden',
    'Kosten automatisering',
    'Telecommunicatie',
    'Drukwerk',
    'Bedrijfsschadeverzekering',
    'Contributies-abonnementen'
  ],
  
  // INSURANCE COSTS - Includes both category-level and subcategory-level matches
  assurantiekosten: [
    // Category-level (top-level category names from database)
    'Assurantiekosten',
    // Subcategory-level (detailed GL accounts)
    'Overige verzekeringen'
  ],
  
  // ACCOUNTING COSTS - Includes both category-level and subcategory-level matches
  accountantskosten: [
    // Category-level (top-level category names from database)
    'Accountants- en advieskosten',
    // Subcategory-level (detailed GL accounts)
    'Salarisadministratie',
    'Administratiekosten',
    'Advieskosten',
    'Juridische advieskosten'
  ],
  
  // ADMIN COSTS - Includes both category-level and subcategory-level matches
  administratieve_lasten: [
    // Category-level (top-level category names from database)
    'Administratieve lasten',
    // Subcategory-level (detailed GL accounts)
    'Boetes',
    'Kosten betalingsverkeer'
  ],
  
  // OTHER COSTS - Includes both category-level and subcategory-level matches
  andere_kosten: [
    // Category-level (top-level category names from database)
    'Andere kosten',
    // Subcategory-level (detailed GL accounts)
    'Kleine aanschaffingen',
    'Kosten betalingsverkeer Formitable B.V.'
  ],
  
  // DEPRECIATION - Includes both category-level and subcategory-level matches
  afschrijvingen: [
    // Category-level (top-level category names from database)
    'Afschrijvingen op immateriële en materiële vaste activa',
    'Afschrijvingen op immateriële vaste activa',
    'Afschrijvingen op materiële vaste activa',
    // Subcategory-level (detailed GL accounts)
    'Afschrijvingen op immateriële vaste activa',
    'Afschrijvingen op materiële vaste activa',
    'Afschrijvingskosten goodwill',
    'Afschrijvingskosten gebouw verbouwingen',
    'Afschrijvingskosten inventaris, machines',
    'Afschrijvingskosten transportmiddelen'
  ],
  
  // FINANCIAL COSTS - Includes both category-level and subcategory-level matches
  financiele_baten_lasten: [
    // Category-level (top-level category names from database)
    'Financiële baten en lasten',
    // Subcategory-level (detailed GL accounts)
    'Rentelasten en soortgelijke kosten',
    'Rentebaten en soortgelijke opbrengsten',
    'Rente Rabobank lening 0050083496',
    'Rente lening o/g Kluin Beheer',
    'Rente Lening o/g Floryn',
    'Rente lening Kluin Beheer B.V.',
    'Rente lening VOF Bar BEA',
    'Rente belastingen'
  ],
  
  // REVENUE FROM RECEIVABLES - Includes both category-level and subcategory-level matches
  opbrengst_vorderingen: [
    // Category-level (top-level category names from database)
    'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten',
    // Subcategory-level (same as category in this case)
    'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten'
  ]
};

/**
 * Summary COGS category mappings for high-level analysis
 */
const SUMMARY_CATEGORIES = {
  // Revenue splits - Includes both category-level and subcategory-level matches
  revenue_food: [
    // Category-level (top-level category names from database)
    'Netto-omzet uit leveringen geproduceerde goederen',
    // Note: 'Netto-omzet groepen' is excluded to prevent double counting
    // Subcategory-level (detailed GL accounts)
    'Omzet snacks (btw laag)',
    'Verkopen snacks (btw laag)', // Alternative naming variant
    'Omzet lunch (btw laag)', 
    'Omzet diner (btw laag)',
    'Omzet menu\'s (btw laag)',
    'Omzet keuken overig (btw laag)'
  ],
  
  revenue_beverage: [
    // Category-level (top-level category names from database)
    'Netto-omzet uit verkoop van handelsgoederen',
    // Note: 'Netto-omzet groepen' is excluded to prevent double counting
    // Subcategory-level (detailed GL accounts)
    'Omzet wijnen (btw hoog)',
    'Omzet gedestilleerd (btw hoog)',
    'Omzet cocktails (btw hoog)',
    'Omzet cider (btw hoog)',
    'Omzet hoog overig (btw hoog)',
    'Omzet hoog alcoholische warme dranken (btw hoog)', // Additional variant
    'Omzet speciaalbier fles (btw hoog)',
    'Omzet speciaalbier tap (btw hoog)',
    'Omzet tap pilsner (btw hoog)',
    'Omzet koffie / thee (btw laag)',
    'Verkopen koffie/thee(btw laag)', // Alternative naming variant
    'Omzet frisdranken (btw laag)',
    'Omzet frisdtranken (btw laag)', // Typo variant in data
    'Omzet alcohol vrij (btw laag)',
    'Omzet alcohol virj (btw laag)', // Typo variant in data
    'Omzet laag overig (btw laag)',
    'Omzet non food (btw hoog)'
  ],
  
  // Cost of Sales splits
  cost_of_sales_food: [
    'Inkopen keuken (btw hoog)',
    'Inkopen keuken (btw laag)'
  ],
  
  cost_of_sales_beverage: [
    'Inkopen bieren fles (btw hoog)',
    'Inkopen sterke dranken (btw hoog)',
    'Inkopen wijnen (btw hoog)',
    'Inkopen bar overig hoog (btw hoog)',
    'Inkopen bar overig laag (btw laag)',
    'Inkopen speciaalbier fles (btw hoog)',
    'Inkopen speciaalbier tap (btw hoog)',
    'Inkopen pilsner tap (btw hoog)',
    'Inkopen koffie (btw laag)',
    'Inkopen frisdrank (btw laag)',
    'Inkopen bieren (btw laag)',
    'Inkopen alcohol vrije drank (btw laag)',
    'Inkopen bar overige (btw laag)',
    'Statiegeld'
  ],
  
  // Labor splits
  labor_contract: [
    'Bruto Salarissen Bediening',
    'Bruto Salarissen Keuken',
    'Bruto Salarissen overhead',
    'Doorberekende loonkosten keuken',
    'Doorberekende loonkosten bediening',
    'Doorberekende loonkosten Overhead',
    'Mutatie reservering vakantietoeslag keuken',
    'Mutatie reservering vakantietoeslag bediening',
    'Mutatie reservering vakantietoeslag overhead',
    'Mutatie reservering vakantiedagen keuken',
    'Mutatie reservering vakantiedagen bediening',
    'Mutatie reservering vakantiedagen overhead',
    'Werkgeversdeel overige fondsen keuken',
    'Werkgeversdeel overige fondsen bediening',
    'Werkgeversdeel pensioenen keuken',
    'Werkgeversdeel pensioenen bediening',
    'Werkgeversdeel pensioenen overhead',
    'Onkostenvergoeding keuken',
    'Onkostenvergoeding bediening',
    'HOP premie',
    'Studie- en opleidsingskosten personeel',
    'Ziekengeldverzekering',
    'Arbodienst',
    'Bedrijfskleding',
    'Overige personeelskosten',
    'Waskosten uniformen',
    'Uitkering ziekengeld',
    'Onkostenvergoeding',
    'Overige lasten uit hoofde van personeelsbeloningen',
    'Overige personeelsgerelateerde kosten',
    'Pensioenlasten',
    'Sociale lasten',
    'Werkkostenregeling - detail'
  ],
  
  labor_flex: [
    'Inhuur F&B',
    'Inhuur Afwas',
    'Inhuur keuken',
    'Inhuur overhead',
    'Loonkosten Overhead'
  ]
};

/**
 * Calculate summary revenue splits from raw data
 * Handles "Netto-omzet groepen" parent category by checking subcategories
 */
function calculateRevenueSplit(data: RawPnLData[]): {
  revenue_food: number;
  revenue_beverage: number;
  revenue_total: number;
} {
  // Sum from specific categories (excludes "Netto-omzet groepen" parent)
  let revenue_food = sumBySubcategories(
    data.filter(d => d.category !== 'Netto-omzet groepen'),
    SUMMARY_CATEGORIES.revenue_food
  );
  let revenue_beverage = sumBySubcategories(
    data.filter(d => d.category !== 'Netto-omzet groepen'),
    SUMMARY_CATEGORIES.revenue_beverage
  );
  
  // Handle "Netto-omzet groepen" parent category - split by subcategory
  const nettoOmzetGroepen = data.filter(d => d.category === 'Netto-omzet groepen' && d.amount > 0);
  
  nettoOmzetGroepen.forEach(record => {
    const subcat = record.subcategory || '';
    // Check if subcategory matches food patterns
    if (SUMMARY_CATEGORIES.revenue_food.some(foodCat => 
      subcat.includes(foodCat) || 
      subcat.includes('snacks') || 
      subcat.includes('lunch') || 
      subcat.includes('diner') || 
      subcat.includes('menu') || 
      subcat.includes('keuken')
    )) {
      revenue_food += record.amount;
    } 
    // Otherwise it's beverage
    else {
      revenue_beverage += record.amount;
    }
  });
  
  const revenue_total = revenue_food + revenue_beverage;
  
  return {
    revenue_food,
    revenue_beverage,
    revenue_total
  };
}

/**
 * Calculate summary cost of sales splits from raw data
 */
function calculateCostOfSalesSplit(data: RawPnLData[]): {
  cost_of_sales_food: number;
  cost_of_sales_beverage: number;
  cost_of_sales_total: number;
} {
  const cost_of_sales_food = sumBySubcategories(data, SUMMARY_CATEGORIES.cost_of_sales_food);
  const cost_of_sales_beverage = sumBySubcategories(data, SUMMARY_CATEGORIES.cost_of_sales_beverage);
  const cost_of_sales_total = cost_of_sales_food + cost_of_sales_beverage;
  
  return {
    cost_of_sales_food,
    cost_of_sales_beverage,
    cost_of_sales_total
  };
}

/**
 * Calculate summary labor splits from raw data
 */
function calculateLaborSplit(data: RawPnLData[]): {
  labor_contract: number;
  labor_flex: number;
  labor_total: number;
} {
  const labor_contract = sumBySubcategories(data, SUMMARY_CATEGORIES.labor_contract);
  const labor_flex = sumBySubcategories(data, SUMMARY_CATEGORIES.labor_flex);
  const labor_total = labor_contract + labor_flex;
  
  return {
    labor_contract,
    labor_flex,
    labor_total
  };
}

/**
 * Calculate revenue from raw data
 */
function calculateRevenue(data: RawPnLData[]): {
  netto_omzet_uit_levering_geproduceerd: number;
  netto_omzet_verkoop_handelsgoederen: number;
  total_revenue: number;
} {
  // Sum from specific categories (excludes "Netto-omzet groepen" parent)
  let netto_omzet_uit_levering_geproduceerd = sumBySubcategories(
    data.filter(d => d.category !== 'Netto-omzet groepen'),
    REVENUE_CATEGORIES.netto_omzet_uit_levering
  );
  
  let netto_omzet_verkoop_handelsgoederen = sumBySubcategories(
    data.filter(d => d.category !== 'Netto-omzet groepen'),
    REVENUE_CATEGORIES.netto_omzet_verkoop_handelsgoederen
  );
  
  // Handle "Netto-omzet groepen" parent category - split by subcategory
  const nettoOmzetGroepen = data.filter(d => d.category === 'Netto-omzet groepen' && d.amount > 0);
  
  nettoOmzetGroepen.forEach(record => {
    const subcat = record.subcategory || '';
    // Check if subcategory matches leveringen patterns
    if (REVENUE_CATEGORIES.netto_omzet_uit_levering.some(leverCat => 
      subcat.includes(leverCat) || 
      subcat.includes('snacks') || 
      subcat.includes('lunch') || 
      subcat.includes('diner') || 
      subcat.includes('menu') || 
      subcat.includes('keuken')
    )) {
      netto_omzet_uit_levering_geproduceerd += record.amount;
    } 
    // Otherwise it's handelsgoederen
    else {
      netto_omzet_verkoop_handelsgoederen += record.amount;
    }
  });
  
  const total_revenue = netto_omzet_uit_levering_geproduceerd + netto_omzet_verkoop_handelsgoederen;
  
  return {
    netto_omzet_uit_levering_geproduceerd,
    netto_omzet_verkoop_handelsgoederen,
    total_revenue
  };
}

/**
 * Calculate costs from raw data - COMPLETE MAPPING
 */
function calculateCosts(data: RawPnLData[]): {
  inkoopwaarde_handelsgoederen: number;
  lonen_en_salarissen: number;
  huisvestingskosten: number;
  exploitatie_kosten: number;
  verkoop_kosten: number;
  autokosten: number;
  kantoorkosten: number;
  assurantiekosten: number;
  accountantskosten: number;
  administratieve_lasten: number;
  andere_kosten: number;
  afschrijvingen: number;
  financiele_baten_lasten: number;
  opbrengst_vorderingen: number;
} {
  return {
    inkoopwaarde_handelsgoederen: sumBySubcategories(data, COST_CATEGORIES.inkoopwaarde_handelsgoederen),
    lonen_en_salarissen: sumBySubcategories(data, COST_CATEGORIES.lonen_en_salarissen),
    huisvestingskosten: sumBySubcategories(data, COST_CATEGORIES.huisvestingskosten),
    exploitatie_kosten: sumBySubcategories(data, COST_CATEGORIES.exploitatie_kosten),
    verkoop_kosten: sumBySubcategories(data, COST_CATEGORIES.verkoop_kosten),
    autokosten: sumBySubcategories(data, COST_CATEGORIES.autokosten),
    kantoorkosten: sumBySubcategories(data, COST_CATEGORIES.kantoorkosten),
    assurantiekosten: sumBySubcategories(data, COST_CATEGORIES.assurantiekosten),
    accountantskosten: sumBySubcategories(data, COST_CATEGORIES.accountantskosten),
    administratieve_lasten: sumBySubcategories(data, COST_CATEGORIES.administratieve_lasten),
    andere_kosten: sumBySubcategories(data, COST_CATEGORIES.andere_kosten),
    afschrijvingen: sumBySubcategories(data, COST_CATEGORIES.afschrijvingen),
    financiele_baten_lasten: sumBySubcategories(data, COST_CATEGORIES.financiele_baten_lasten),
    opbrengst_vorderingen: sumBySubcategories(data, COST_CATEGORIES.opbrengst_vorderingen)
  };
}

/**
 * Sum amounts by subcategory names OR category names
 * Handles both category-level and subcategory-level data
 */
function sumBySubcategories(data: RawPnLData[], subcategories: string[]): number {
  return data
    .filter(d => {
      // Match subcategory if it exists
      if (d.subcategory && subcategories.includes(d.subcategory)) {
        return true;
      }
      // Match category if it exists (for top-level category amounts)
      if (d.category && subcategories.includes(d.category)) {
        return true;
      }
      return false;
    })
    .reduce((sum, d) => sum + d.amount, 0);
}

/**
 * Aggregate P&L data for a specific location, year, and month
 */
export async function aggregatePnLData(
  locationId: string,
  year: number,
  month: number
): Promise<AggregatedPnLRecord> {
  const supabase = await createClient();
  
  // Fetch raw data
  const { data: rawData, error } = await supabase
    .from('powerbi_pnl_data')
    .select('location_id, year, month, category, subcategory, gl_account, amount, import_id')
    .eq('location_id', locationId)
    .eq('year', year)
    .eq('month', month);
    
  if (error) {
    throw new Error(`Failed to fetch raw data: ${error.message}`);
  }
  
  if (!rawData || rawData.length === 0) {
    throw new Error(`No data found for location ${locationId}, year ${year}, month ${month}`);
  }
  
  // Calculate summary COGS (for high-level analysis)
  const revenueSplit = calculateRevenueSplit(rawData);
  const costOfSalesSplit = calculateCostOfSalesSplit(rawData);
  const laborSplit = calculateLaborSplit(rawData);
  
  // Calculate detailed COGS (for granular analysis)
  const revenue = calculateRevenue(rawData);
  const costs = calculateCosts(rawData);
  
  // Calculate totals
  // Note: costs.sumBySubcategories already sums all amounts (positive corrections reduce costs)
  const total_cost_of_sales = costs.inkoopwaarde_handelsgoederen;
  const total_labor_costs = costs.lonen_en_salarissen;
  const total_other_costs = 
    costs.huisvestingskosten +
    costs.exploitatie_kosten +
    costs.verkoop_kosten +
    costs.autokosten +
    costs.kantoorkosten +
    costs.assurantiekosten +
    costs.accountantskosten +
    costs.administratieve_lasten +
    costs.andere_kosten +
    costs.afschrijvingen +
    costs.financiele_baten_lasten;
  
  const total_costs = total_cost_of_sales + total_labor_costs + total_other_costs;
  
  // Calculate resultaat using correct formula
  // Formula: Resultaat = Revenue + Costs + Opbrengst_vorderingen
  // Note: costs are already negative in the database, so we add them instead of subtracting
  // Include opbrengst_vorderingen (positive revenue from receivables)
  const resultaat = revenue.total_revenue + total_cost_of_sales + total_labor_costs + total_other_costs + (costs.opbrengst_vorderingen || 0);
  
  const aggregatedRecord = {
    location_id: locationId,
    year,
    month,
    
    // Summary COGS Columns (for high-level analysis)
    revenue_food: revenueSplit.revenue_food,
    revenue_beverage: revenueSplit.revenue_beverage,
    revenue_total: revenueSplit.revenue_total,
    
    cost_of_sales_food: costOfSalesSplit.cost_of_sales_food,
    cost_of_sales_beverage: costOfSalesSplit.cost_of_sales_beverage,
    cost_of_sales_total: costOfSalesSplit.cost_of_sales_total,
    
    labor_contract: laborSplit.labor_contract,
    labor_flex: laborSplit.labor_flex,
    labor_total: laborSplit.labor_total,
    
    other_costs_total: total_other_costs,
    opbrengst_vorderingen: costs.opbrengst_vorderingen,
    resultaat,
    
    // Detailed COGS Columns (for granular analysis)
    netto_omzet_uit_levering_geproduceerd: revenue.netto_omzet_uit_levering_geproduceerd,
    netto_omzet_verkoop_handelsgoederen: revenue.netto_omzet_verkoop_handelsgoederen,
    inkoopwaarde_handelsgoederen: costs.inkoopwaarde_handelsgoederen,
    lonen_en_salarissen: costs.lonen_en_salarissen,
    huisvestingskosten: costs.huisvestingskosten,
    exploitatie_kosten: costs.exploitatie_kosten,
    verkoop_kosten: costs.verkoop_kosten,
    autokosten: costs.autokosten,
    kantoorkosten: costs.kantoorkosten,
    assurantiekosten: costs.assurantiekosten,
    accountantskosten: costs.accountantskosten,
    administratieve_lasten: costs.administratieve_lasten,
    andere_kosten: costs.andere_kosten,
    afschrijvingen: costs.afschrijvingen,
    financiele_baten_lasten: costs.financiele_baten_lasten,
    
    // Legacy totals (for compatibility)
    total_revenue: revenue.total_revenue,
    total_cost_of_sales,
    total_labor_costs,
    total_other_costs,
    total_costs,
    
    import_id: undefined
  };
  
  // Store the aggregated data
  await storeAggregatedData(aggregatedRecord);
  
  // Get the stored record ID for subcategory storage
  const { data: storedRecord } = await supabase
    .from('powerbi_pnl_aggregated')
    .select('id')
    .eq('location_id', locationId)
    .eq('year', year)
    .eq('month', month)
    .single();
  
  if (storedRecord?.id) {
    // Store subcategory breakdown
    await storeSubcategories(storedRecord.id, rawData);
  }
  
  return aggregatedRecord;
}

/**
 * Store aggregated data in the database
 */
export async function storeAggregatedData(record: AggregatedPnLRecord): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('powerbi_pnl_aggregated')
    .upsert(record, {
      onConflict: 'location_id,year,month'
    });
    
  if (error) {
    throw new Error(`Failed to store aggregated data: ${error.message}`);
  }
}

/**
 * Store subcategory breakdown in the database
 */
export async function storeSubcategories(
  aggregatedId: string,
  rawData: RawPnLData[]
): Promise<void> {
  const supabase = await createClient();
  
  // Create subcategory records
  const subcategoryRecords: Array<{
    aggregated_id: string;
    main_category: string;
    subcategory: string;
    gl_account: string;
    amount: number;
  }> = [];
  
  // Revenue subcategories
  SUMMARY_CATEGORIES.revenue_food.forEach(subcategory => {
    const amount = rawData
      .filter(d => d.subcategory === subcategory)
      .reduce((sum, d) => sum + d.amount, 0);
    
    if (amount !== 0) {
      subcategoryRecords.push({
        aggregated_id: aggregatedId,
        main_category: 'Revenue Food',
        subcategory,
        gl_account: 'Overige bedrijfskosten',
        amount
      });
    }
  });
  
  SUMMARY_CATEGORIES.revenue_beverage.forEach(subcategory => {
    const amount = rawData
      .filter(d => d.subcategory === subcategory)
      .reduce((sum, d) => sum + d.amount, 0);
    
    if (amount !== 0) {
      subcategoryRecords.push({
        aggregated_id: aggregatedId,
        main_category: 'Revenue Beverage',
        subcategory,
        gl_account: 'Overige bedrijfskosten',
        amount
      });
    }
  });
  
  // Cost of Sales subcategories
  SUMMARY_CATEGORIES.cost_of_sales_food.forEach(subcategory => {
    const amount = rawData
      .filter(d => d.subcategory === subcategory)
      .reduce((sum, d) => sum + d.amount, 0);
    
    if (amount !== 0) {
      subcategoryRecords.push({
        aggregated_id: aggregatedId,
        main_category: 'Cost of Sales Food',
        subcategory,
        gl_account: 'Kostprijs van de omzet',
        amount
      });
    }
  });
  
  SUMMARY_CATEGORIES.cost_of_sales_beverage.forEach(subcategory => {
    const amount = rawData
      .filter(d => d.subcategory === subcategory)
      .reduce((sum, d) => sum + d.amount, 0);
    
    if (amount !== 0) {
      subcategoryRecords.push({
        aggregated_id: aggregatedId,
        main_category: 'Cost of Sales Beverage',
        subcategory,
        gl_account: 'Kostprijs van de omzet',
        amount
      });
    }
  });
  
  // Labor subcategories
  SUMMARY_CATEGORIES.labor_contract.forEach(subcategory => {
    const amount = rawData
      .filter(d => d.subcategory === subcategory)
      .reduce((sum, d) => sum + d.amount, 0);
    
    if (amount !== 0) {
      subcategoryRecords.push({
        aggregated_id: aggregatedId,
        main_category: 'Labor Contract',
        subcategory,
        gl_account: 'Lasten uit hoofde van personeelsbeloningen',
        amount
      });
    }
  });
  
  SUMMARY_CATEGORIES.labor_flex.forEach(subcategory => {
    const amount = rawData
      .filter(d => d.subcategory === subcategory)
      .reduce((sum, d) => sum + d.amount, 0);
    
    if (amount !== 0) {
      subcategoryRecords.push({
        aggregated_id: aggregatedId,
        main_category: 'Labor Flex',
        subcategory,
        gl_account: 'Lasten uit hoofde van personeelsbeloningen',
        amount
      });
    }
  });
  
  // Insert subcategory records
  if (subcategoryRecords.length > 0) {
    const { error } = await supabase
      .from('powerbi_pnl_aggregated_subcategories')
      .upsert(subcategoryRecords, {
        onConflict: 'aggregated_id,subcategory'
      });
      
    if (error) {
      throw new Error(`Failed to store subcategories: ${error.message}`);
    }
  }
}

/**
 * Get aggregated data for a specific location, year, and month
 */
export async function getAggregatedData(
  locationId: string,
  year: number,
  month: number
): Promise<AggregatedPnLRecord | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('powerbi_pnl_aggregated_data')
    .select('*')
    .eq('location_id', locationId)
    .eq('year', year)
    .eq('month', month)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No data found
    }
    throw new Error(`Failed to fetch aggregated data: ${error.message}`);
  }
  
  return data;
}

/**
 * Aggregate all available data for a location and year
 */
export async function aggregateAllDataForLocation(
  locationId: string,
  year: number
): Promise<AggregatedPnLRecord[]> {
  const supabase = await createClient();
  
  // Get all available months for this location and year
  const { data: rawData, error } = await supabase
    .from('powerbi_pnl_data')
    .select('month')
    .eq('location_id', locationId)
    .eq('year', year);
    
  if (error) {
    throw new Error(`Failed to fetch available months: ${error.message}`);
  }
  
  const months = [...new Set(rawData.map(d => d.month))].sort();
  const results: AggregatedPnLRecord[] = [];
  
  for (const month of months) {
    try {
      const aggregated = await aggregatePnLData(locationId, year, month);
      await storeAggregatedData(aggregated);
      results.push(aggregated);
    } catch (error) {
      console.error(`Failed to aggregate data for ${locationId}, ${year}, ${month}:`, error);
    }
  }
  
  return results;
}
