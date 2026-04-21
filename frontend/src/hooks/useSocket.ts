'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

let globalSocket: Socket | null = null;

export const useSocket = () => {
  const { accessToken, isAuthenticated } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (!globalSocket || !globalSocket.connected) {
      globalSocket = io(
        process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000',
        {
          auth: { token: accessToken },
          transports: ['websocket'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
        }
      );

      globalSocket.on('connect', () => {
        console.log('[Socket] Connected:', globalSocket?.id);
        globalSocket?.emit('join:map');
      });

      globalSocket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
      });

      globalSocket.on('connect_error', (err) => {
        console.error('[Socket] Connection error:', err.message);
      });
    }

    socketRef.current = globalSocket;
  }, [isAuthenticated, accessToken]);

  // ✅ FIXED GENERIC HANDLER
  const on = useCallback(<T = any>(
    event: string,
    handler: (data: T) => void
  ) => {
    if (!globalSocket) return () => {};

    const wrappedHandler = (data: unknown) => {
      handler(data as T);
    };

    globalSocket.on(event, wrappedHandler);

    return () => {
      globalSocket?.off(event, wrappedHandler);
    };
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    globalSocket?.emit(event, data);
  }, []);

  return {
    socket: socketRef.current,
    on,
    emit,
    connected: globalSocket?.connected ?? false,
  };
};

// ─── Global real-time notifications hook ──────────────────────────────────────
export const useRealtimeNotifications = () => {
  const { on } = useSocket();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    const cleanups: Array<() => void> = [];

    // ✅ FIXED (NO INLINE TYPES)
    cleanups.push(
      on('task:new', (data) => {
        const d = data as { title: string; urgency: string };
        toast.success(`🆕 New task: ${d.title}`, { duration: 5000 });
      })
    );

    cleanups.push(
      on('task:updated', (data) => {
        const d = data as { id: string; status: string };
        toast(`📋 Task status → ${d.status}`, {
          icon: '🔄',
          duration: 3000,
        });
      })
    );

    if (user.role === 'volunteer') {
      cleanups.push(
        on('assignment:new', (data) => {
          const d = data as { taskTitle: string; aiReason?: string };

          toast.success(
            `🎯 New assignment: ${d.taskTitle}${
              d.aiReason ? `\n${d.aiReason.slice(0, 80)}...` : ''
            }`,
            { duration: 8000 }
          );
        })
      );
    }

    return () => cleanups.forEach((c) => c());
  }, [user, on]);
};