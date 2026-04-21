'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import MapPicker from '@/components/map/MapPicker';
import { tasksApi } from '@/lib/api';
import { Loader2 } from 'lucide-react';

const CATEGORIES = ['food', 'health', 'shelter', 'education', 'water', 'sanitation', 'mental_health', 'disaster_relief', 'other'] as const;
const URGENCIES = ['low', 'medium', 'high', 'critical'] as const;

export default function CreateTaskPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('other');
  const [urgency, setUrgency] = useState<(typeof URGENCIES)[number]>('medium');
  const [address, setAddress] = useState('');
  const [requiredSkillsRaw, setRequiredSkillsRaw] = useState('');
  const [requiredVolunteers, setRequiredVolunteers] = useState(1);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const required_skills = useMemo(
    () => requiredSkillsRaw.split(',').map(s => s.trim()).filter(Boolean),
    [requiredSkillsRaw]
  );

  const mut = useMutation({
    mutationFn: () => {
      if (!location) throw new Error('Pick a location on the map');
      return tasksApi.create({
        title,
        description,
        category,
        urgency,
        address: address || undefined,
        required_skills,
        required_volunteers: requiredVolunteers,
        latitude: location.lat,
        longitude: location.lng,
      });
    },
    onSuccess: () => {
      toast.success('Task created');
      setTitle('');
      setDescription('');
      setAddress('');
      setRequiredSkillsRaw('');
      setRequiredVolunteers(1);
      setLocation(null);
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to create task'),
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create resource need</h1>
          <p className="text-sm text-gray-500">Create a task and auto-assign nearby volunteers.</p>
        </div>

        <div className="card p-5 space-y-4">
          <div className="grid gap-3">
            <label className="text-xs font-semibold text-gray-600">Title</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Emergency food distribution" />
          </div>

          <div className="grid gap-3">
            <label className="text-xs font-semibold text-gray-600">Description</label>
            <textarea className="input min-h-[120px]" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the need, constraints, and timeline…" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-gray-600">Category</label>
              <select className="input" value={category} onChange={e => setCategory(e.target.value as any)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-gray-600">Urgency</label>
              <select className="input" value={urgency} onChange={e => setUrgency(e.target.value as any)}>
                {URGENCIES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-gray-600">Required skills (comma-separated)</label>
              <input className="input" value={requiredSkillsRaw} onChange={e => setRequiredSkillsRaw(e.target.value)} placeholder="medical, driving, logistics" />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-gray-600">Volunteers needed</label>
              <input
                className="input"
                type="number"
                min={1}
                max={50}
                value={requiredVolunteers}
                onChange={e => setRequiredVolunteers(parseInt(e.target.value || '1'))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-gray-600">Address / description (optional)</label>
            <input className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street / landmark / area" />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-gray-600">Location</label>
            <MapPicker value={location} onChange={setLocation} />
            <p className="text-xs text-gray-400">
              Click on the map to set the location{location ? ` (${location.lat.toFixed(5)}, ${location.lng.toFixed(5)})` : ''}.
            </p>
          </div>

          <button className="btn-primary w-full" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create task
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

