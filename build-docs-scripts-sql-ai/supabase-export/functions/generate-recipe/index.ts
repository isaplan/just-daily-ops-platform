import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { prompt, category } = await req.json();
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured');

    const systemPrompt = `You are a professional chef. Create a detailed recipe based on the user's request. Include name, description, ingredients (with quantities), instructions, estimated cost price, and suggested selling price with 70% gross profit margin. Return as JSON with: {name, description, category, ingredients: [{name, quantity, unit}], instructions, prepTime, cookTime, costPrice, suggestedPrice}`;

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
          { role: 'user', content: `Create a recipe for: ${prompt}${category ? ` (Category: ${category})` : ''}` }
        ],
      }),
    });

    if (!response.ok) throw new Error('AI request failed');

    const data = await response.json();
    const recipeText = data.choices[0].message.content;
    
    // Parse JSON from response
    const recipe = JSON.parse(recipeText);

    return new Response(JSON.stringify({ recipe }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
