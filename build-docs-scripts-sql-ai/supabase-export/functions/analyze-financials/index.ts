import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, locationId, month } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch relevant financial data
    const [year, monthNum] = month.split('-').map(Number);
    
    let pnlQuery = supabase
      .from('pnl_reports')
      .select('*')
      .eq('year', year)
      .eq('month', monthNum);
    
    if (locationId) {
      pnlQuery = pnlQuery.eq('location_id', locationId);
    }

    const { data: pnlData, error: pnlError } = await pnlQuery;
    if (pnlError) throw pnlError;

    // Fetch waste data
    const { data: wasteData, error: wasteError } = await supabase
      .from('daily_waste')
      .select('*, products(product)')
      .gte('date', `${year}-${String(monthNum).padStart(2, '0')}-01`)
      .lt('date', `${year}-${String(monthNum + 1).padStart(2, '0')}-01`);

    // Fetch labor data
    const { data: laborData, error: laborError } = await supabase
      .from('eitje_labor_hours')
      .select('*')
      .gte('date', `${year}-${String(monthNum).padStart(2, '0')}-01`)
      .lt('date', `${year}-${String(monthNum + 1).padStart(2, '0')}-01`);

    // Build context for AI
    const context = {
      pnlSummary: pnlData?.reduce((acc, curr) => ({
        revenue: acc.revenue + (curr.total_revenue || 0),
        cogs: acc.cogs + (curr.total_cogs || 0),
        labor: acc.labor + (curr.total_labor_cost || 0),
        waste: acc.waste + (curr.waste_cost || 0),
        grossProfit: acc.grossProfit + (curr.gross_profit || 0),
        ebitda: acc.ebitda + (curr.ebitda || 0),
      }), { revenue: 0, cogs: 0, labor: 0, waste: 0, grossProfit: 0, ebitda: 0 }),
      wasteCount: wasteData?.length || 0,
      totalWasteCost: wasteData?.reduce((sum, w) => sum + (w.cost || 0), 0) || 0,
      laborHours: laborData?.reduce((sum, l) => sum + (l.hours || 0), 0) || 0,
      totalLaborCost: laborData?.reduce((sum, l) => sum + (l.labor_cost || 0), 0) || 0,
    };

    const systemPrompt = `You are a financial analyst for a restaurant chain. Analyze the provided financial data and answer the user's question.

Financial Data for ${month}:
- Total Revenue: €${context.pnlSummary.revenue.toFixed(2)}
- COGS: €${context.pnlSummary.cogs.toFixed(2)}
- Gross Profit: €${context.pnlSummary.grossProfit.toFixed(2)} (${((context.pnlSummary.grossProfit / context.pnlSummary.revenue) * 100).toFixed(1)}%)
- Labor Cost: €${context.pnlSummary.labor.toFixed(2)} (${((context.pnlSummary.labor / context.pnlSummary.revenue) * 100).toFixed(1)}%)
- Waste Cost: €${context.totalWasteCost.toFixed(2)} (${((context.totalWasteCost / context.pnlSummary.revenue) * 100).toFixed(1)}%)
- EBITDA: €${context.pnlSummary.ebitda.toFixed(2)} (${((context.pnlSummary.ebitda / context.pnlSummary.revenue) * 100).toFixed(1)}%)
- Total Labor Hours: ${context.laborHours.toFixed(1)}
- Waste Incidents: ${context.wasteCount}

Provide clear, actionable insights. Use bullet points for key findings. Be concise but specific.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const aiData = await response.json();
    const analysis = aiData.choices[0].message.content;

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-financials:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
