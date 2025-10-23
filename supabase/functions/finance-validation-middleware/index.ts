import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { importType, records } = await req.json();
    
    console.log('[Edge] Validating records:', { importType, recordCount: records.length });
    
    const validationRules: Record<string, string[]> = {
      bork_sales: ['date', 'product_name', 'quantity', 'revenue'],
      eitje_labor: ['date', 'employee_name', 'hours', 'labor_cost'],
      eitje_productivity: ['date', 'team_name', 'revenue', 'labor_cost'],
      powerbi_pnl: ['year', 'month', 'gl_account', 'amount']
    };

    const requiredFields = validationRules[importType] || [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      for (const field of requiredFields) {
        if (!record[field]) {
          errors.push({
            rowIndex: i,
            field,
            reason: `Missing required field: ${field}`,
            record
          });
        }
      }
    }

    console.log('[Edge] Validation completed:', {
      valid: errors.length === 0,
      errorCount: errors.length,
      validCount: records.length - errors.length
    });

    return new Response(JSON.stringify({ 
      valid: errors.length === 0,
      errors,
      validCount: records.length - errors.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[Edge] Validation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
