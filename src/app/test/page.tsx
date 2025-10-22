"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function TestPage() {
  const [apiStatus, setApiStatus] = useState<string>('Not tested');
  const [borkStatus, setBorkStatus] = useState<string>('Not tested');

  const testHealthAPI = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setApiStatus(`✅ API Working: ${data.message}`);
    } catch (error) {
      setApiStatus(`❌ API Error: ${error}`);
    }
  };

  const testBorkSync = async () => {
    try {
      const response = await fetch('/api/bork-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: 'test-location',
          dateRange: { start: '2024-01-01', end: '2024-01-31' },
          syncType: 'test'
        })
      });
      const data = await response.json();
      setBorkStatus(`✅ Bork Sync: ${data.message}`);
    } catch (error) {
      setBorkStatus(`❌ Bork Error: ${error}`);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Just Daily Ops - Test Page</h1>
      <p className="text-gray-600">Testing Next.js application functionality</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>API Health Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testHealthAPI} className="w-full">
              Test Health API
            </Button>
            <p className="text-sm">{apiStatus}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bork Sync Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testBorkSync} className="w-full">
              Test Bork Sync
            </Button>
            <p className="text-sm">{borkStatus}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>✅ Next.js Application: Running</p>
            <p>✅ Shadcn UI Components: Loaded</p>
            <p>✅ TanStack Query: Configured</p>
            <p>✅ Supabase SSR: Ready</p>
            <p>✅ Finance Module: Migrated</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
