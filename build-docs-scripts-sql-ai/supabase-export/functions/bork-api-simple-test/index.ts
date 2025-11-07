// Simple test function to debug the 500 error
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface SimpleTestRequest {
  locationId: string;
  apiKey?: string;
  baseUrl?: string;
  testDate?: string;
}

interface SimpleTestResponse {
  success: boolean;
  message: string;
  receivedParams: any;
  credentials: any;
  errorMessage?: string;
}

Deno.serve(async (req) => {
  console.log('🚀 Simple test function started');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Testing environment variables...');
    
    // Parse request body
    const body = await req.json() as SimpleTestRequest;
    console.log('🔧 Received request body:', body);
    
    const apiUsername = Deno.env.get('BORK_API_USERNAME');
    const apiPassword = Deno.env.get('BORK_API_PASSWORD');
    
    console.log(`🔧 API Username: ${apiUsername ? 'Set' : 'Not set'}`);
    console.log(`🔧 API Password: ${apiPassword ? 'Set' : 'Not set'}`);

    // Test API connection if credentials are provided
    let apiTestResult = null;
    if (body.apiKey && body.baseUrl) {
      try {
        const testDate = body.testDate || '20250918';
        const apiUrl = `${body.baseUrl}/ticket/day.json/${testDate}?appid=${body.apiKey}`;
        console.log(`🔧 Testing API URL: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          headers: { 'Content-Type': 'application/json' },
        });
        
        apiTestResult = {
          url: apiUrl,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        };
        
        if (response.ok) {
          const data = await response.json();
          apiTestResult.dataLength = Array.isArray(data) ? data.length : 'Not an array';
        }
      } catch (apiError) {
        apiTestResult = {
          error: apiError.message
        };
      }
    }

    const response: SimpleTestResponse = {
      success: true,
      message: 'Simple test successful',
      receivedParams: body,
      credentials: {
        username: apiUsername ? 'Set' : 'Not set',
        password: apiPassword ? 'Set' : 'Not set'
      }
    };

    if (apiTestResult) {
      response.apiTest = apiTestResult;
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Simple test error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        errorMessage: error.message,
        receivedParams: await req.json().catch(() => 'Failed to parse request body')
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});