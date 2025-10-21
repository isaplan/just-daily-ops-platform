import Link from "next/link";
import { Home, DollarSign, ShoppingCart, Package } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="w-64 bg-gray-800 text-white p-6 flex flex-col">
      <h2 className="text-2xl font-bold mb-6">Just Daily Ops</h2>
      <nav className="space-y-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg hover:text-gray-300">
          <Home className="w-5 h-5" />
          Dashboard
        </Link>
        <Link href="/finance" className="flex items-center gap-2 text-lg hover:text-gray-300">
          <DollarSign className="w-5 h-5" />
          Finance
        </Link>
        <Link href="/orders" className="flex items-center gap-2 text-lg hover:text-gray-300">
          <ShoppingCart className="w-5 h-5" />
          Orders
        </Link>
        <Link href="/stock" className="flex items-center gap-2 text-lg hover:text-gray-300">
          <Package className="w-5 h-5" />
          Stock
        </Link>
      </nav>
    </aside>
  );
}
