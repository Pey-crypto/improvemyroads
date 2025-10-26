"use client";

import { useEffect, useMemo, useState } from 'react';
import { getReportTimeseries, type ReportTimeseries } from '@/lib/api/reports';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

type Props = {
  mode: 'public' | 'admin';
  radiusKm?: number;
};

const STATUS_KEYS = ['PENDING', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const;

const chartConfig = {
  PENDING: { label: 'Pending', color: '#f59e0b' },
  UNDER_REVIEW: { label: 'Under Review', color: '#06b6d4' },
  IN_PROGRESS: { label: 'In Progress', color: '#3b82f6' },
  RESOLVED: { label: 'Resolved', color: '#10b981' },
  REJECTED: { label: 'Rejected', color: '#ef4444' },
} satisfies ChartConfig;

export function IssuesTrend({ mode, radiusKm = 5 }: Props) {
  const [bucket, setBucket] = useState<'day' | 'week' | 'month'>('day');
  const [range, setRange] = useState<'30d' | '90d'>('30d');
  const [series, setSeries] = useState<ReportTimeseries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { startISO, endISO } = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (range === '90d' ? 89 : 29));
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }, [range]);

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
                  const data = await getReportTimeseries({ lat: pos.coords.latitude, lng: pos.coords.longitude, radiusKm, bucket, start: startISO, end: endISO });
                  if (!cancelled) setSeries(data);
                } catch (e) {
                  if (!cancelled) setError((e as Error).message || 'Failed to load trend');
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
          const data = await getReportTimeseries({ bucket, start: startISO, end: endISO });
          if (!cancelled) setSeries(data);
          if (!cancelled) setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message || 'Failed to load trend');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [mode, radiusKm, bucket, startISO, endISO]);

  const chartData = useMemo(() => {
    if (!series) return [] as Array<Record<string, number | string>>;
    return series.points.map((p) => {
      const row: Record<string, number | string> = { date: p.date, total: p.total };
      for (const k of STATUS_KEYS) {
        row[k] = p.byStatus[k] ?? 0;
      }
      return row;
    });
  }, [series]);

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Issues Over Time</CardTitle>
              <CardDescription>
                {mode === 'admin' ? 'All areas' : 'Near your location'} · {range === '90d' ? 'Last 90 days' : 'Last 30 days'} · {bucket}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <select className="border-input bg-background rounded-md border px-2 py-1" value={range} onChange={(e) => setRange(e.target.value as '30d' | '90d')}>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <select className="border-input bg-background rounded-md border px-2 py-1" value={bucket} onChange={(e) => setBucket(e.target.value as 'day' | 'week' | 'month')}>
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <div className="px-2 pb-6 sm:px-6">
          {loading ? (
            <div className="h-[260px] text-sm text-muted-foreground">Loading trend...</div>
          ) : error ? (
            <div className="h-[260px] text-sm text-destructive">{error}</div>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
              <AreaChart data={chartData}>
                <defs>
                  {STATUS_KEYS.map((k) => (
                    <linearGradient id={`fill-${k}`} key={k} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={`var(--color-${k})`} stopOpacity={0.9} />
                      <stop offset="95%" stopColor={`var(--color-${k})`} stopOpacity={0.1} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const d = new Date(value as string);
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => new Date(value as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      indicator="dot"
                    />
                  }
                />
                {STATUS_KEYS.map((k) => (
                  <Area key={k} dataKey={k} type="monotone" fill={`url(#fill-${k})`} stroke={`var(--color-${k})`} stackId="a" />
                ))}
              </AreaChart>
            </ChartContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
