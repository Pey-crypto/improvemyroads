"use client";

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { getReports, type Report } from '@/lib/api/reports';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function MyFeedPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      toast.error('Location not available');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { reports } = await getReports({ lat: pos.coords.latitude, lng: pos.coords.longitude, sort: 'distance', page: 1, limit: 50 });
        setReports(reports);
      } catch (e) {
        toast.error((e as Error).message || 'Failed to load feed');
      } finally {
        setLoading(false);
      }
    }, () => {
      toast.error('Location permission denied');
      setLoading(false);
    });
  }, []);

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">Nearby Issues</h1>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="text-sm text-muted-foreground">No issues found near you.</div>
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProtectedRoute>
  );
}
