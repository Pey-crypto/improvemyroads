"use client";

import { useEffect, useState } from 'react';
import { getReports, type Report, updateReport } from '@/lib/api/reports';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const statusOptions = ['PENDING', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const;

export function AdminIssuesTable({ pageSize = 20 }: { pageSize?: number }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load(p: number) {
    setLoading(true);
    try {
      const { reports, pagination } = await getReports({ page: p, limit: pageSize, sort: 'date' });
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
                  <TableCell className="max-w-[24rem] truncate" title={r.title}>{r.title}</TableCell>
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
