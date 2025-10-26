"use client";

import React from 'react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/lib/contexts/AuthContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
