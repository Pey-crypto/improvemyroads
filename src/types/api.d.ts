export interface ApiSuccess<T> { success: true; data: T; message?: string }
export interface ApiError { success: false; error: { code: string; message: string; details?: unknown } }
export type ApiResponse<T> = ApiSuccess<T> | ApiError
