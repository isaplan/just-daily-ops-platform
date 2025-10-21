import { FinanceOverview } from "@/components/finance/finance-overview";
import { OrdersOverview } from "@/components/orders/orders-overview";
import { StockOverview } from "@/components/stock/stock-overview";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Daily Operations Dashboard</h1>
      <p className="text-gray-500 dark:text-gray-400">
        Get a quick overview of your key business metrics.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FinanceOverview />
        <OrdersOverview />
        <StockOverview />
      </div>
    </div>
  );
}
