'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Activity, Loader2, Eye, EyeOff, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const DEMO_ACCOUNTS = [
  { label: 'Admin',     email: 'admin@ngo.org',     password: 'admin123', role: 'Full dashboard access' },
  { label: 'Volunteer', email: 'volunteer@ngo.org',  password: 'vol123',  role: 'Task assignments view' },
];

export default function LoginPage() {
  const router          = useRouter();
  const { login }       = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email: string, password: string) => {
    setForm({ email, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">NGO Resource</h1>
          <p className="text-sm text-gray-500">Smart Allocation System</p>
        </div>

        {/* Demo accounts banner */}
        <div className="card p-4 mb-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">Demo Mode — No backend needed</p>
          </div>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.email}
                type="button"
                onClick={() => fillDemo(acc.email, acc.password)}
                className="w-full flex items-center justify-between px-3 py-2 bg-white border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors text-left group"
              >
                <div>
                  <p className="text-xs font-semibold text-gray-800 group-hover:text-brand-700">
                    {acc.label} — {acc.email}
                  </p>
                  <p className="text-xs text-gray-400">{acc.role} · password: {acc.password}</p>
                </div>
                <span className="text-xs text-brand-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Fill →
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Login form */}
        <div className="card p-6 shadow-md">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Sign in</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPass(s => !s)}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-sm text-center text-gray-500 mt-4">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-brand-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
