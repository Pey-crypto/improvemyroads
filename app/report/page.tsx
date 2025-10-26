"use client";

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { CreateIssueDialog } from '@/components/dashboard/CreateIssueDialog';

export default function ReportPage() {
  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">Report an Issue</h1>
        <CreateIssueDialog />
        <p className="text-sm text-muted-foreground mt-4">Make sure to allow location permissions and attach a clear photo of the issue.</p>
      </div>
    </ProtectedRoute>
  );
}
