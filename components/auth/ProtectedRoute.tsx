"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function ProtectedRoute({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (adminOnly && user?.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, adminOnly, user, router]);

  if (isLoading || !isAuthenticated || (adminOnly && user?.role !== 'ADMIN')) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-sm text-foreground/70">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
