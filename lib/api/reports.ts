import { api } from '@/lib/api/client';

export type Report = {
  _id: string;
  title: string;
  description: string;
  category: 'POTHOLE' | 'GARBAGE' | 'STREETLIGHT' | 'WATER' | 'ROAD' | 'OTHER';
  status: 'PENDING' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  upvotes: number;
  downvotes: number;
  createdAt?: string;
  myVote?: 'UP' | 'DOWN' | null;
};

export type Pagination = { page: number; limit: number; total: number; totalPages: number };

export async function getReports(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) qs.set(k, String(v));
  });
  return api.get<{ reports: Report[]; pagination?: Pagination }>(`/api/reports?${qs.toString()}`);
}

export async function getMyReports(page = 1, limit = 20) {
  return api.get<{ reports: Report[] }>(`/api/reports/my-reports?page=${page}&limit=${limit}`);
}

export async function getReportById(id: string) {
  return api.get<Report>(`/api/reports/${id}`);
}

export async function voteReport(id: string, voteType: 'UP' | 'DOWN') {
  return api.post<{ report: { id: string; upvotes: number; downvotes: number }; userVote: 'UP' | 'DOWN' | null }>(`/api/reports/${id}/vote`, { voteType });
}

export async function updateReport(id: string, data: Partial<Report> & { status?: Report['status'] }) {
  return api.put<Report>(`/api/reports/${id}`, data);
}

export async function deleteReport(id: string) {
  return api.delete<{ deleted: boolean }>(`/api/reports/${id}`);
}

export async function createReport(input: {
  category: Report['category'];
  title: string;
  description: string;
  image: File;
  latitude?: number;
  longitude?: number;
}) {
  const fd = new FormData();
  fd.set('category', input.category);
  fd.set('title', input.title);
  fd.set('description', input.description);
  if (typeof input.latitude === 'number') fd.set('latitude', String(input.latitude));
  if (typeof input.longitude === 'number') fd.set('longitude', String(input.longitude));
  fd.set('image', input.image);
  return api.uploadFile<{ report: Report }>(`/api/reports`, fd);
}
