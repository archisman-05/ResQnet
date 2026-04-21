'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Activity } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
    else router.push('/login');
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50">
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    </div>
  );
}
