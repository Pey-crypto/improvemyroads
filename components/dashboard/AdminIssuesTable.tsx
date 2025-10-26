"use client";

import { useEffect, useState } from 'react';
import { getReports, type Report, updateReport, refreshReportOfficials } from '@/lib/api/reports';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { IconMail, IconPhone, IconRefresh } from '@tabler/icons-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

const statusOptions = ['PENDING', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const;

export function AdminIssuesTable({ pageSize = 20 }: { pageSize?: number }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [division, setDivision] = useState<string>('');
  const [section, setSection] = useState<string>('');

  async function load(p: number) {
    setLoading(true);
    try {
      const { reports, pagination } = await getReports({ page: p, limit: pageSize, sort: 'date', division: division || undefined, section: section || undefined });
      setReports(reports);
      if (pagination) setTotalPages(pagination.totalPages);
      setPage(p);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onChangeStatus(id: string, status: Report['status']) {
    setUpdatingId(id);
    try {
      const updated = await updateReport(id, { status });
      setReports((prev) => prev.map((r) => (r._id === id ? { ...r, status: updated.status } : r)));
      toast.success('Status updated');
    } catch (e) {
      toast.error((e as Error).message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm font-medium">All Issues</div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Division"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            className="h-8 w-[12rem]"
          />
          <Input
            placeholder="Section"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="h-8 w-[12rem]"
          />
          <Button variant="outline" size="sm" onClick={() => load(1)} disabled={loading}>
            Apply
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setDivision(''); setSection(''); load(1); }} disabled={loading}>
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={() => load(page)} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>District</TableHead>
              <TableHead>Road</TableHead>
              <TableHead>Officials</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No issues found.
                </TableCell>
              </TableRow>
            ) : (
              reports.map((r) => (
                <TableRow key={r._id}>
                  <TableCell className="max-w-[24rem] truncate" title={r.title}>
                    <Link href={`/reports/${r._id}`} className="hover:underline">
                      {r.title}
                    </Link>
                  </TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell>
                    <Label htmlFor={`status-${r._id}`} className="sr-only">Status</Label>
                    <Select defaultValue={r.status} onValueChange={(v) => onChangeStatus(r._id, v as Report['status'])}>
                      <SelectTrigger id={`status-${r._id}`} className="w-[12rem]" disabled={updatingId === r._id}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((s) => (
                          <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{r.district || '-'}</TableCell>
                  <TableCell className="max-w-[16rem] truncate" title={r.roadData?.roadName || ''}>{r.roadData?.roadName || '-'}</TableCell>
                  <TableCell>
                    {r.roadData?.officials ? (
                      <div className="flex items-center gap-2">
                        {r.roadData.officials.ee?.mobile && (
                          <a href={`tel:${r.roadData.officials.ee.mobile}`} title="Call EE" className="text-blue-600" aria-label="Call EE">
                            <IconPhone className="size-4" />
                          </a>
                        )}
                        {r.roadData.officials.ee?.email && (
                          <a href={`mailto:${r.roadData.officials.ee.email}`} title="Email EE" className="text-blue-600" aria-label="Email EE">
                            <IconMail className="size-4" />
                          </a>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            setRefreshingId(r._id);
                            try {
                              const res = await refreshReportOfficials(r._id);
                              setReports((prev) => prev.map((x) => x._id === r._id ? res.report : x));
                              toast.success('Officials refreshed');
                            } catch (e) {
                              toast.error((e as Error).message || 'Failed to refresh');
                            } finally {
                              setRefreshingId(null);
                            }
                          }}
                          disabled={refreshingId === r._id}
                          title="Refresh official contacts"
                        >
                          <IconRefresh className="mr-1 size-4" /> Refresh
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setRefreshingId(r._id);
                          try {
                            const res = await refreshReportOfficials(r._id);
                            setReports((prev) => prev.map((x) => x._id === r._id ? res.report : x));
                            toast.success('Officials fetched');
                          } catch (e) {
                            toast.error((e as Error).message || 'Failed to fetch');
                          } finally {
                            setRefreshingId(null);
                          }
                        }}
                        disabled={refreshingId === r._id}
                        title="Fetch official contacts"
                      >
                        <IconRefresh className="mr-1 size-4" /> Fetch
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <div>
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load(1)} disabled={loading || page === 1}>
            First
          </Button>
          <Button variant="outline" size="sm" onClick={() => load(page - 1)} disabled={loading || page <= 1}>
            Prev
          </Button>
          <Button variant="outline" size="sm" onClick={() => load(page + 1)} disabled={loading || page >= totalPages}>
            Next
          </Button>
          <Button variant="outline" size="sm" onClick={() => load(totalPages)} disabled={loading || page >= totalPages}>
            Last
          </Button>
        </div>
      </div>
    </div>
  );
}
