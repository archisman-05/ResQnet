'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Map, Users, Flame, Layers } from 'lucide-react';

const ResourceMap = dynamic(() => import('@/components/map/ResourceMap'), { ssr: false });

export default function MapPage() {
  const [showVolunteers, setShowVolunteers] = useState(true);
  const [showHeatmap,    setShowHeatmap]    = useState(true);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] lg:h-screen">
        {/* Map toolbar */}
        <div className="bg-white/90 dark:bg-ink-950/70 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 px-4 py-2 flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-white/80">
            <Map className="w-4 h-4 text-brand-600" /> Live Resource Map
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Toggle active={showVolunteers} onToggle={() => setShowVolunteers(v => !v)} icon={Users}    label="Volunteers" />
            <Toggle active={showHeatmap}    onToggle={() => setShowHeatmap(v => !v)}    icon={Flame}    label="Heatmap"    />
          </div>
        </div>

        {/* Map legend */}
        <div className="absolute bottom-6 left-4 z-10 bg-white/90 dark:bg-ink-950/75 backdrop-blur-xl rounded-xl shadow-lg p-3 text-xs space-y-1.5 border border-gray-100 dark:border-white/10">
          <p className="font-semibold text-gray-700 dark:text-white/80 flex items-center gap-1"><Layers className="w-3 h-3" /> Legend</p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600 dark:text-white/65">Needs (tasks)</span>
          </div>
          {showVolunteers && (
            <>
              <div className="border-t border-gray-100 dark:border-white/10 pt-1.5 mt-1.5" />
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-gray-600 dark:text-white/65">Volunteers</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-400" /><span className="text-gray-600 dark:text-white/65">Busy</span></div>
            </>
          )}
          <div className="border-t border-gray-100 dark:border-white/10 pt-1.5 mt-1.5" />
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-gray-600 dark:text-white/65">NGOs</span></div>
        </div>

        {/* Full-screen map */}
        <div className="flex-1 relative">
          <ResourceMap showVolunteers={showVolunteers} showHeatmap={showHeatmap} height="100%" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function Toggle({ active, onToggle, icon: Icon, label }: { active: boolean; onToggle: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
        active
          ? 'bg-brand-100 text-brand-700 dark:bg-white/10 dark:text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />{label}
    </button>
  );
}
