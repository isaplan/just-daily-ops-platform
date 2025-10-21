import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50 dark:bg-gray-900">
      <main className="flex flex-col items-center justify-center flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white">
          Welcome to <span className="text-blue-600">Just Daily Ops</span>
        </h1>

        <p className="mt-3 text-2xl text-gray-600 dark:text-gray-300">
          Your comprehensive platform for daily operations management and business intelligence.
        </p>

        <div className="flex items-center justify-center mt-6">
          <Link href="/dashboard" passHref>
            <Button className="px-6 py-3 text-lg">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}