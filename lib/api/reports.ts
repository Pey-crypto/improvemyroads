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
  district?: string;
  roadData?: {
    roadName: string;
    roadType: string;
    roadId?: string;
    district?: string;
    distanceFromRoad: number;
    matchConfidence: number;
    tileCoordinates: { z: number; x: number; y: number };
    matchedAt: string | Date;
  };
  upvotes: number;
  downvotes: number;
  createdAt?: string;
  myVote?: 'UP' | 'DOWN' | null;
};

export type Pagination = { page: number; limit: number; total: number; totalPages: number };

export type ReportStats = {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  topRoads: { name: string; count: number }[];
  topDistricts: { name: string; count: number }[];
};

export type ReportTimeseries = {
  bucket: 'day' | 'week' | 'month';
  range: { start: string; end: string };
  points: Array<{ date: string; total: number; byStatus: Record<string, number> }>;
};

export async function getReports(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) qs.set(k, String(v));
  });
  return api.get<{ reports: Report[]; pagination?: Pagination }>(`/api/reports?${qs.toString()}`);
}

export async function getReportStats(params: { lat?: number; lng?: number; radiusKm?: number; district?: string } = {}) {
  const qs = new URLSearchParams();
  if (typeof params.lat === 'number') qs.set('lat', String(params.lat));
  if (typeof params.lng === 'number') qs.set('lng', String(params.lng));
  if (typeof params.radiusKm === 'number') qs.set('radiusKm', String(params.radiusKm));
  if (params.district) qs.set('district', params.district);
  return api.get<ReportStats>(`/api/reports/stats?${qs.toString()}`);
}

export async function getReportTimeseries(params: {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  district?: string;
  bucket?: 'day' | 'week' | 'month';
  start?: string | Date;
  end?: string | Date;
} = {}) {
  const qs = new URLSearchParams();
  if (typeof params.lat === 'number') qs.set('lat', String(params.lat));
  if (typeof params.lng === 'number') qs.set('lng', String(params.lng));
  if (typeof params.radiusKm === 'number') qs.set('radiusKm', String(params.radiusKm));
  if (params.district) qs.set('district', params.district);
  if (params.bucket) qs.set('bucket', params.bucket);
  if (params.start) qs.set('start', typeof params.start === 'string' ? params.start : params.start.toISOString());
  if (params.end) qs.set('end', typeof params.end === 'string' ? params.end : params.end.toISOString());
  return api.get<ReportTimeseries>(`/api/reports/timeseries?${qs.toString()}`);
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
