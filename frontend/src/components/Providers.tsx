'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useRealtimeNotifications } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/authStore';

// Runs once on client mount — reads localStorage and hydrates the auth store.
// This pattern avoids server/client mismatch that causes React hydration errors.
function AuthBootstrap() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  useEffect(() => {
    fetchMe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function RealtimeLayer() {
  useRealtimeNotifications();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime:            60 * 1000,
            retry:                1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap />
      <RealtimeLayer />
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '10px',
            background:   '#1f2937',
            color:        '#f9fafb',
            fontSize:     '13px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}
