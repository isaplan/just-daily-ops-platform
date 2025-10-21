export default function FinancePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Finance Dashboard</h1>
      <p className="text-gray-600">Financial insights and data management</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total Revenue</h3>
          <p className="text-3xl font-bold text-green-600">$45,231</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total Profit</h3>
          <p className="text-3xl font-bold text-blue-600">$12,450</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Transactions</h3>
          <p className="text-3xl font-bold text-purple-600">1,250</p>
        </div>
      </div>
    </div>
  );
}
