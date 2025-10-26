"use client";

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useEffect, useState } from 'react';
import { getMyReports, type Report } from '@/lib/api/reports';
import { toast } from 'sonner';
import { RoadOfficials } from '@/components/reports/RoadOfficials';

export default function MyReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { reports } = await getMyReports(1, 50);
        setReports(reports);
      } catch (e) {
        toast.error((e as Error).message || 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">My Reports</h1>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="text-sm text-muted-foreground">No reports yet.</div>
        ) : (
          <ul className="divide-y rounded-md border">
            {reports.map((r) => (
              <li key={r._id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.category}</div>
                  </div>
                  <div className="text-sm">{r.status}</div>
                </div>
                <RoadOfficials data={r.roadData} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProtectedRoute>
  );
}
