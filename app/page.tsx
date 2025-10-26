"use client";

import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";
import { CreateIssueDialog } from "@/components/dashboard/CreateIssueDialog";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold">Improve My City</h1>
        <p className="text-muted-foreground">Report local issues and track their status.</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/dashboard" className="rounded-md border px-3 py-1.5 text-sm">Dashboard</Link>
        <Link href="/my-reports" className="rounded-md border px-3 py-1.5 text-sm">My Reports</Link>
        <Link href="/my-feed" className="rounded-md border px-3 py-1.5 text-sm">My Feed</Link>
      </div>

      <div className="mt-10">
        {isAuthenticated && user?.role === 'CITIZEN' ? (
          <CreateIssueDialog />
        ) : (
          <div className="text-sm text-muted-foreground">
            Please <Link href="/login" className="underline">login</Link> or <Link href="/signup" className="underline">create an account</Link> to report an issue.
          </div>
        )}
      </div>
    </div>
  );
}
