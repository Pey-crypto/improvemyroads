"use client";

import { useEffect, useState } from 'react';
import { getReportStats, type ReportStats } from '@/lib/api/reports';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

type Props = {
  mode: 'public' | 'admin';
  radiusKm?: number;
};

export function StatsCards({ mode, radiusKm = 5 }: Props) {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (mode === 'public') {
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                try {
                  const data = await getReportStats({ lat: pos.coords.latitude, lng: pos.coords.longitude, radiusKm });
                  if (!cancelled) setStats(data);
                } catch (e) {
                  if (!cancelled) setError((e as Error).message || 'Failed to load stats');
                } finally {
                  if (!cancelled) setLoading(false);
                }
              },
              () => {
                setError('Location permission denied');
                setLoading(false);
              }
            );
          } else {
            setError('Location not available');
            setLoading(false);
          }
        } else {
          const data = await getReportStats();
          if (!cancelled) setStats(data);
          if (!cancelled) setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message || 'Failed to load stats');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [mode, radiusKm]);

  if (loading) {
    return <div className="px-4 lg:px-6 text-sm text-muted-foreground">Loading stats...</div>;
  }

  if (error) {
    return <div className="px-4 lg:px-6 text-sm text-destructive">{error}</div>;
  }

  if (!stats) return null;

  const statusList = [
    { key: 'PENDING', label: 'Pending' },
    { key: 'UNDER_REVIEW', label: 'Under Review' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'RESOLVED', label: 'Resolved' },
    { key: 'REJECTED', label: 'Rejected' },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription>Total Issues</CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums">{stats.total}</CardTitle>
        </CardHeader>
      </Card>

      {statusList.map((s) => (
        <Card key={s.key}>
          <CardHeader>
            <CardDescription>{s.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{stats.byStatus[s.key] ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      ))}

      <div className="@xl/main:col-span-2 @5xl/main:col-span-2">
        <Card>
          <CardHeader>
            <CardDescription>By Category</CardDescription>
            <div className="grid grid-cols-2 gap-2 pt-2 text-sm text-muted-foreground">
              {Object.entries(stats.byCategory).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span>{k}</span>
                  <span className="tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="@xl/main:col-span-2 @5xl/main:col-span-2">
        <Card>
          <CardHeader>
            <CardDescription>{mode === 'admin' ? 'Top Districts' : 'Top Roads Nearby'}</CardDescription>
            <div className="flex flex-col gap-2 pt-2 text-sm text-muted-foreground">
              {(mode === 'admin' ? stats.topDistricts : stats.topRoads).map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="truncate pr-4" title={item.name}>{item.name}</span>
                  <span className="tabular-nums">{item.count}</span>
                </div>
              ))}
            </div>
            {mode === 'admin' && (
              <>
                <Separator className="my-3" />
                <CardDescription>Top Roads</CardDescription>
                <div className="flex flex-col gap-2 pt-2 text-sm text-muted-foreground">
                  {stats.topRoads.map((r) => (
                    <div key={r.name} className="flex items-center justify-between">
                      <span className="truncate pr-4" title={r.name}>{r.name}</span>
                      <span className="tabular-nums">{r.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
