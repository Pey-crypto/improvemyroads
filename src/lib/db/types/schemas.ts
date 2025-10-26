import { z } from 'zod';

// Shared
export const ObjectIdString = z.string().min(1);

// Auth
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(100),
  phone: z.string().min(7).max(20),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type LoginInput = z.infer<typeof LoginSchema>;

// Reports
export const CreateReportSchema = z.object({
  category: z.enum(['POTHOLE', 'GARBAGE', 'STREETLIGHT', 'WATER', 'ROAD', 'OTHER']),
  title: z.string().min(10).max(200),
  description: z.string().min(50).max(1000),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
export type CreateReportInput = z.infer<typeof CreateReportSchema>;

export const UpdateReportSchema = z.object({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']).optional(),
  adminComment: z.string().max(1000).optional(),
});
export type UpdateReportInput = z.infer<typeof UpdateReportSchema>;

export const VoteSchema = z.object({
  voteType: z.enum(['UP', 'DOWN'])
});
export type VoteInput = z.infer<typeof VoteSchema>;

// Filters
export const ReportFiltersSchema = z.object({
  category: z.enum(['POTHOLE', 'GARBAGE', 'STREETLIGHT', 'WATER', 'ROAD', 'OTHER']).optional(),
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']).optional(),
  district: z.string().optional(),
  userId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['date', 'upvotes', 'distance']).optional().default('date'),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});
export type ReportFilters = z.infer<typeof ReportFiltersSchema>;
