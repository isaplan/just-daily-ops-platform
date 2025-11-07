// API CLEAN SLATE - V1: Fresh Bork API Connection Test
// Step 1: Test API connectivity only
// No data processing, no storage, just connection test

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConnectionTestRequest {
  locationId: string;
  apiKey: string;
  baseUrl: string;
  testDate: string; // YYYYMMDD format
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { locationId, apiKey, baseUrl, testDate }: ConnectionTestRequest = await req.json();

    console.log('🔌 API CLEAN SLATE - V1: Testing Bork API Connection');
    console.log('📍 Location ID:', locationId);
    console.log('🔑 API Key:', apiKey);
    console.log('🌐 Base URL:', baseUrl);
    console.log('📅 Test Date:', testDate);

    // Build API URL using the working format from your tests
    const apiUrl = `${baseUrl}/ticket/day.json/${testDate}?appid=${apiKey}&IncOpen=True&IncInternal=True`;
    
    console.log('🔗 Full API URL:', apiUrl);

    // Make the API call
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('📡 API Response Status:', response.status);
    console.log('📡 API Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📊 Raw API Response (first 100 chars):', JSON.stringify(data).substring(0, 100));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'API connection successful',
        status: response.status,
        dataLength: Array.isArray(data) ? data.length : 'Not an array',
        sampleData: Array.isArray(data) && data.length > 0 ? data[0] : null,
        timestamp: new Date().toISOString(),
        version: 'API-CLEAN-SLATE-V1'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ API Connection Test Failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        version: 'API-CLEAN-SLATE-V1'
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
