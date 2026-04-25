'use client';

import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { reportsApi } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function CentralReportsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['central-reports-insights'],
    queryFn: () => reportsApi.centralInsights().then((r) => r.data.data),
    refetchInterval: 60_000,
  });

  const summary = data?.summary;
  const ai = data?.ai_insights;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Central Report System</h1>
          <p className="text-sm text-gray-500 dark:text-white/65">
            NGO-wide reporting with AI forecasting for future needs.
          </p>
        </div>

        {isLoading ? (
          <div className="card p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
        ) : isError ? (
          <div className="card p-6 text-red-600 dark:text-red-300">Failed to load central insights.</div>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-3">
              <Metric label="Total Reports" value={String(summary?.total_reports || 0)} />
              <Metric label="Pending Reports" value={String(summary?.pending_reports || 0)} />
              <Metric label="Last 30 Days" value={String(summary?.reports_last_30d || 0)} />
            </div>

            <div className="card p-4">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Top Report Cities</h2>
              <div className="space-y-2">
                {(summary?.top_cities || []).map((item: any) => (
                  <div key={item.city} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-white/80">{item.city}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">AI Forecast & Recommendations</h2>
              <p className="text-sm text-gray-700 dark:text-white/75">{ai?.headline || 'No AI insight available right now.'}</p>
              <ul className="mt-3 space-y-1">
                {(ai?.recommendations || []).map((r: string) => (
                  <li key={r} className="text-sm text-gray-600 dark:text-white/70">- {r}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 dark:text-white/60">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}
