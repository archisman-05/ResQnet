'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { tasksApi, dashboardApi } from '@/lib/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Sparkles, MapPin, Loader2, TrendingUp, AlertTriangle, CheckCircle2, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InsightsPage() {
  const [areaName,  setAreaName]  = useState('');
  const [lat,       setLat]       = useState('');
  const [lng,       setLng]       = useState('');
  const [radius,    setRadius]    = useState('10');
  const [insight,   setInsight]   = useState<Record<string, unknown> | null>(null);
  const [summary,   setSummary]   = useState<Record<string, unknown> | null>(null);

  const areaInsightMut = useMutation({
    mutationFn: () => tasksApi.getInsights({ lat, lng, radius_km: radius, area_name: areaName || 'Selected Area' }).then(r => r.data.data),
    onSuccess: (data) => setInsight(data.insight),
    onError:   () => toast.error('Failed to generate insights'),
  });

  const summaryMut = useMutation({
    mutationFn: () => dashboardApi.getWeeklySummary().then(r => r.data.data),
    onSuccess: (data) => setSummary(data.summary),
    onError:   () => toast.error('Failed to generate weekly summary'),
  });

  const detectLocation = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude.toFixed(6));
      setLng(pos.coords.longitude.toFixed(6));
      toast.success('Location set');
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Insights</h1>
            <p className="text-sm text-gray-500 dark:text-white/65">Gemini-powered analysis and recommendations</p>
          </div>
        </div>

        {/* Area Analysis */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Area Analysis</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Area Name</label>
              <input className="input" placeholder="e.g. North Kolkata" value={areaName} onChange={e => setAreaName(e.target.value)} />
            </div>
            <div>
              <label className="label">Latitude</label>
              <input className="input" placeholder="22.5726" value={lat} onChange={e => setLat(e.target.value)} />
            </div>
            <div>
              <label className="label">Longitude</label>
              <input className="input" placeholder="88.3639" value={lng} onChange={e => setLng(e.target.value)} />
            </div>
            <div>
              <label className="label">Radius (km)</label>
              <input className="input" type="number" value={radius} onChange={e => setRadius(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button className="btn-secondary w-full text-sm" onClick={detectLocation}>
                <MapPin className="w-4 h-4" /> Use My Location
              </button>
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={() => areaInsightMut.mutate()}
            disabled={areaInsightMut.isPending || !lat || !lng}
          >
            {areaInsightMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {areaInsightMut.isPending ? 'Analysing with Gemini…' : 'Generate Area Insights'}
          </button>

          {insight && (
            <div className="space-y-4 animate-fade-in border-t border-gray-100 pt-4">
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <p className="text-sm font-bold text-purple-900">{insight.headline as string}</p>
              </div>

              {(insight.alerts as string[])?.length > 0 && (
                <div className="space-y-2">
                  {(insight.alerts as string[]).map((a, i) => (
                    <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3">
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{a}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                {(insight.trends as string[])?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2"><TrendingUp className="w-4 h-4 text-blue-600" /><p className="text-sm font-semibold">Trends</p></div>
                    <ul className="space-y-1.5">
                      {(insight.trends as string[]).map((t, i) => <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5"><span className="text-blue-400 font-bold mt-0.5">›</span>{t}</li>)}
                    </ul>
                  </div>
                )}
                {(insight.recommendations as string[])?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><p className="text-sm font-semibold">Recommendations</p></div>
                    <ul className="space-y-1.5">
                      {(insight.recommendations as string[]).map((r, i) => <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5"><span className="text-green-400 font-bold mt-0.5">✓</span>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {typeof insight.full_insight === 'string' && insight.full_insight.trim().length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2"><BookOpen className="w-4 h-4 text-gray-500" /><p className="text-sm font-semibold">Detailed Analysis</p></div>
                  <p className="text-sm text-gray-700 dark:text-white/80 whitespace-pre-line leading-relaxed">{insight.full_insight}</p>
                </div>
              )}

              {Boolean(insight.resource_needs) && typeof insight.resource_needs === 'object' && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-800 mb-2">Resource Requirements</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div><p className="text-2xl font-bold text-amber-900">{(insight.resource_needs as Record<string, unknown>).volunteers_needed as number}</p><p className="text-xs text-amber-700">Volunteers Needed</p></div>
                    <div className="col-span-2"><p className="text-xs text-amber-700 mb-1">Key Skills</p><div className="flex flex-wrap gap-1 justify-center">{((insight.resource_needs as Record<string, unknown>).key_skills as string[] || []).map((s, i) => <span key={i} className="badge bg-amber-100 text-amber-800">{s}</span>)}</div></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Weekly Summary */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Weekly AI Summary</h2>
            <button className="btn-secondary text-xs" onClick={() => summaryMut.mutate()} disabled={summaryMut.isPending}>
              {summaryMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Generate
            </button>
          </div>

          {summary ? (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm text-gray-700 dark:text-white/80">{summary.executive_summary as string}</p>
              {(summary.highlights as string[])?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-white/60 uppercase mb-1.5">Highlights</p>
                  <ul className="space-y-1">{(summary.highlights as string[]).map((h, i) => <li key={i} className="text-sm text-gray-600 dark:text-white/75 flex items-start gap-1.5"><span className="text-brand-500">✓</span>{h}</li>)}</ul>
                </div>
              )}
              {typeof summary.impact_statement === 'string' && summary.impact_statement.trim().length > 0 && (
                <p className="text-sm text-brand-700 bg-brand-50 rounded-xl px-4 py-3 italic">"{summary.impact_statement}"</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-white/60">Click Generate to produce a Gemini-powered weekly summary.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
