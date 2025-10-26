"use client";

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { cn } from '@/lib/utils';

function NavbarInner() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith('/dashboard')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold">
            Improve My City
          </Link>
          <nav className="hidden items-center gap-4 md:flex text-sm">
            <Link href="/" className="hover:underline underline-offset-4">Home</Link>
            <Link href="/report" className="hover:underline underline-offset-4">Report Issue</Link>
            <Link href="/my-reports" className="hover:underline underline-offset-4">My Reports</Link>
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {!isAuthenticated ? (
            <div className="flex gap-2">
              <Link href="/login" className="rounded-md border px-3 py-1.5 text-sm">Login</Link>
              <Link href="/signup" className="rounded-md bg-foreground text-background px-3 py-1.5 text-sm">Register</Link>
            </div>
          ) : (
            <div className="relative">
              <details className="group">
                <summary className="list-none cursor-pointer rounded-md border px-3 py-1.5 text-sm">
                  {user?.name || user?.email}
                </summary>
                <div className="absolute right-0 mt-2 min-w-40 rounded-md border bg-background p-2 shadow-md">
                  <Link href="/dashboard" className="block rounded p-2 text-sm hover:bg-foreground/10">Dashboard</Link>
                  <Link href="/my-reports" className="block rounded p-2 text-sm hover:bg-foreground/10">My Reports</Link>
                  <Link href="/my-feed" className="block rounded p-2 text-sm hover:bg-foreground/10">My Feed</Link>
                  {user?.role === 'ADMIN' ? (
                    <Link href="/admin" className="block rounded p-2 text-sm hover:bg-foreground/10">Admin</Link>
                  ) : (
                    <span className="block rounded p-2 text-sm text-muted-foreground cursor-not-allowed opacity-60" aria-disabled="true">Admin</span>
                  )}
                  <button onClick={logout} className="block w-full rounded p-2 text-left text-sm hover:bg-foreground/10">Logout</button>
                </div>
              </details>
            </div>
          )}
        </div>

        <button
          className="md:hidden inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      <div className={cn("md:hidden border-t", open ? 'block' : 'hidden')}>
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-2 text-sm">
          <Link href="/" className="px-1 py-1.5">Home</Link>
          <Link href="/report" className="px-1 py-1.5">Report Issue</Link>
          <Link href="/my-reports" className="px-1 py-1.5">My Reports</Link>
          <Link href="/my-feed" className="px-1 py-1.5">My Feed</Link>
          {!isAuthenticated ? (
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="rounded-md border px-3 py-1.5">Login</Link>
              <Link href="/signup" className="rounded-md bg-foreground text-background px-3 py-1.5">Register</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-1 pt-2">
              <Link href="/dashboard" className="px-1 py-1.5">Dashboard</Link>
              {user?.role === 'ADMIN' ? (
                <Link href="/admin" className="px-1 py-1.5">Admin</Link>
              ) : (
                <span className="px-1 py-1.5 text-muted-foreground opacity-60 cursor-not-allowed" aria-disabled="true">Admin</span>
              )}
              <button onClick={logout} className="rounded-md border px-3 py-1.5 text-left">Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default dynamic(() => Promise.resolve(NavbarInner), { ssr: false });
