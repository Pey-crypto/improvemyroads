"use client";

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { getReports, voteReport, type Report } from '@/lib/api/reports';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RoadOfficials } from '@/components/reports/RoadOfficials';
import { IconThumbDown, IconThumbUp, IconChevronDown } from '@tabler/icons-react';

export default function MyFeedPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

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
              <li
                key={r._id}
                className="p-4"
                onClick={() => setOpenId((v) => (v === r._id ? null : r._id))}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <IconChevronDown className={openId === r._id ? 'size-4 rotate-180 transition-transform' : 'size-4 transition-transform'} />
                    {r.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.imageUrl} alt={r.title} className="hidden sm:block h-12 w-16 rounded object-cover border" />
                    )}
                    <div>
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-muted-foreground">{r.category}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:block text-xs text-muted-foreground mr-2">{r.status}</div>
                    <Button
                      variant={r.myVote === 'UP' ? 'default' : 'outline'}
                      size="sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const res = await voteReport(r._id, 'UP');
                          setReports((prev) => prev.map((x) => x._id === r._id ? { ...x, upvotes: res.report.upvotes, downvotes: res.report.downvotes, myVote: res.userVote } : x));
                        } catch (e) {
                          toast.error((e as Error).message || 'Failed to vote');
                        }
                      }}
                    >
                      <IconThumbUp className="mr-1 size-4" /> {r.upvotes}
                    </Button>
                    <Button
                      variant={r.myVote === 'DOWN' ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const res = await voteReport(r._id, 'DOWN');
                          setReports((prev) => prev.map((x) => x._id === r._id ? { ...x, upvotes: res.report.upvotes, downvotes: res.report.downvotes, myVote: res.userVote } : x));
                        } catch (e) {
                          toast.error((e as Error).message || 'Failed to vote');
                        }
                      }}
                    >
                      <IconThumbDown className="mr-1 size-4" /> {r.downvotes}
                    </Button>
                  </div>
                </div>
                {openId === r._id && (
                  <div className="mt-3 space-y-3">
                    {r.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.imageUrl} alt={r.title} className="max-h-72 w-full rounded-md object-cover border" />
                    )}
                    <div className="text-sm whitespace-pre-wrap">{r.description}</div>
                    <RoadOfficials data={r.roadData} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProtectedRoute>
  );
}
