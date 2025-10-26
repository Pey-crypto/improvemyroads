"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getReportById, type Report, refreshReportOfficials } from '@/lib/api/reports';
import { Button } from '@/components/ui/button';
import { RoadOfficials } from '@/components/reports/RoadOfficials';
import { toast } from 'sonner';

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const r = await getReportById(id);
        setReport(r);
      } catch (e) {
        toast.error((e as Error).message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (!id) return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-muted-foreground">Invalid report id.</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : !report ? (
        <div className="text-sm text-muted-foreground">Report not found.</div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">{report.title}</h1>
              <div className="text-xs text-muted-foreground">{report.category} · {report.status}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!report) return;
                  setRefreshing(true);
                  try {
                    const res = await refreshReportOfficials(report._id);
                    setReport(res.report);
                    toast.success('Officials updated');
                  } catch (e) {
                    toast.error((e as Error).message || 'Failed to refresh officials');
                  } finally {
                    setRefreshing(false);
                  }
                }}
                disabled={refreshing}
              >
                Refresh Officials
              </Button>
            </div>
          </div>

          {report.imageUrl && (
            <div className="overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={report.imageUrl} alt={report.title} className="h-auto w-full object-cover" />
            </div>
          )}

          <div className="rounded-md border p-4">
            <div className="mb-2 text-sm font-medium">Description</div>
            <div className="whitespace-pre-wrap text-sm">{report.description}</div>
          </div>

          <RoadOfficials data={report.roadData} />
        </div>
      )}
    </div>
  );
}
