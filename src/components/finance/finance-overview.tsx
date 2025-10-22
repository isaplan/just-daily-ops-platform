import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, BarChart3 } from 'lucide-react'

export function FinanceOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Finance Overview
        </CardTitle>
        <CardDescription>
          Key financial metrics and performance indicators
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">$45,231</div>
            <div className="text-sm text-green-600">Total Revenue</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">$13,500</div>
            <div className="text-sm text-blue-600">Total Profit</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">29.8%</div>
            <div className="text-sm text-purple-600">Profit Margin</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
