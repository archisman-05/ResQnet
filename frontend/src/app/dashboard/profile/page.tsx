'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { volunteersApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Loader2, MapPin, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const ALL_SKILLS = ['medical','driving','cooking','construction','teaching','counseling','logistics','translation','IT support','fundraising','first aid','social work','photography','carpentry','plumbing'];
const LANGUAGES  = ['English','Hindi','Bengali','Tamil','Telugu','Marathi','Gujarati','Urdu','Punjabi','Malayalam'];

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore();
  const profile = user?.profile;

  const [form, setForm] = useState({
    bio: '', skills: [] as string[], languages: [] as string[],
    availability: 'available', weekly_hours: 10,
    address: '', city: '', country: '',
    radius_km: 10, latitude: '', longitude: '',
  });

  useEffect(() => {
    if (profile) {
      setForm(f => ({
        ...f,
        bio:          '',
        skills:       profile.skills || [],
        availability: profile.availability || 'available',
        city:         profile.city || '',
        radius_km:    profile.radius_km || 10,
        latitude:     profile.lat?.toString() || '',
        longitude:    profile.lng?.toString() || '',
      }));
    }
  }, [profile]);

  const updateMut = useMutation({
    mutationFn: () => volunteersApi.updateProfile(form),
    onSuccess: () => { toast.success('Profile updated!'); fetchMe(); },
    onError:   () => toast.error('Update failed'),
  });

  const toggleArr = (key: 'skills' | 'languages', val: string) =>
    setForm(f => ({ ...f, [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val] }));

  const detectLocation = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setForm(f => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
      toast.success('Location set');
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500">Keep your profile updated to get better matches</p>
        </div>

        {/* User info (read-only) */}
        <div className="card p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xl">
            {user?.full_name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900">{user?.full_name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="badge bg-brand-100 text-brand-700 mt-1">Volunteer</span>
          </div>
        </div>

        {/* Edit form */}
        <div className="card p-5 space-y-4">
          <div>
            <label className="label">Bio</label>
            <textarea className="input min-h-[80px] resize-none" placeholder="Tell us about yourself and your experience…" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
          </div>

          <div>
            <label className="label">Skills</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {ALL_SKILLS.map(s => (
                <button key={s} type="button" onClick={() => toggleArr('skills', s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${form.skills.includes(s) ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Languages</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {LANGUAGES.map(l => (
                <button key={l} type="button" onClick={() => toggleArr('languages', l)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${form.languages.includes(l) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Availability</label>
              <select className="input" value={form.availability} onChange={e => setForm(f => ({ ...f, availability: e.target.value }))}>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </div>
            <div>
              <label className="label">Weekly Hours Available</label>
              <input type="number" className="input" min={1} max={80} value={form.weekly_hours} onChange={e => setForm(f => ({ ...f, weekly_hours: parseInt(e.target.value) }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">City</label>
              <input className="input" placeholder="Your city" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <label className="label">Service Radius (km)</label>
              <input type="number" className="input" min={1} max={200} value={form.radius_km} onChange={e => setForm(f => ({ ...f, radius_km: parseInt(e.target.value) }))} />
            </div>
          </div>

          <div>
            <label className="label">Location</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input className="input" placeholder="Latitude" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} />
              <input className="input" placeholder="Longitude" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} />
            </div>
            <button type="button" className="btn-secondary text-xs w-full" onClick={detectLocation}>
              <MapPin className="w-3.5 h-3.5" /> Auto-detect Location
            </button>
          </div>

          <button className="btn-primary w-full" onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
            {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {updateMut.isPending ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
