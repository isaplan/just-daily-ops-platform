// BORK API CONNECT - Tabbed Interface
// Updated: 2025-01-20 - Added 3-tab structure: Manual Sync, Cronjob, Connect API

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedManualSync } from "@/components/finance/EnhancedManualSync";
import { BorkApiConnectionTest } from "@/components/finance/BorkApiConnectionTest";
import { BorkMasterSync } from "@/components/finance/BorkMasterSync";

export default function BorkApiConnect() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Bork API Connect</h1>
        <p className="text-gray-600 mt-2">
          Connect to Bork POS system for sales data synchronization.
        </p>
      </div>
      
      <Tabs defaultValue="manual" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="manual">📊 Manual Sync</TabsTrigger>
          <TabsTrigger value="master">🗂️ Master Sync</TabsTrigger>
          <TabsTrigger value="cronjob">⏰ Cronjob</TabsTrigger>
          <TabsTrigger value="connect">🔌 Connect API</TabsTrigger>
        </TabsList>

        {/* MANUAL SYNC TAB */}
        <TabsContent value="manual" className="space-y-6">
          <EnhancedManualSync />
        </TabsContent>

        {/* MASTER SYNC TAB - NEW */}
        <TabsContent value="master" className="space-y-6">
          <BorkMasterSync />
        </TabsContent>

        {/* CRONJOB TAB */}
        <TabsContent value="cronjob" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>⏰ Automated Cronjob Sync</CardTitle>
              <CardDescription>
                Configure and monitor automated data synchronization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-8 text-center text-muted-foreground">
                <p>Cronjob configuration coming soon...</p>
                <p className="text-sm mt-2">Automated scheduling and monitoring will be available here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONNECT API TAB - Standalone Test */}
        <TabsContent value="connect" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>🔌 API Connection Test</CardTitle>
              <CardDescription>
                Test Bork API connectivity without data processing or storage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BorkApiConnectionTest />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
