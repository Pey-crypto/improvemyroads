import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosRequestHeaders } from 'axios';

class ApiClient {
  private baseUrl: string;
  private getToken: () => string | null;
  private instance: AxiosInstance;

  constructor(baseUrl: string, getToken: () => string | null) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.getToken = getToken;
    this.instance = axios.create({ baseURL: this.baseUrl });

    this.instance.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        const headers: AxiosRequestHeaders = (config.headers || {}) as AxiosRequestHeaders;
        headers.Authorization = `Bearer ${token}`;
        config.headers = headers;
      }
      return config;
    });

    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        const msg =
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          error?.message ||
          'Request failed';
        return Promise.reject(new Error(msg));
      }
    );
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    const res = await this.instance.request(config);
    const data = res.data;
    if (data && typeof data === 'object' && 'success' in data) {
      type ApiSuccess<U> = { success: true; data: U; message?: string };
      type ApiError = { success: false; error: { code: string; message: string; details?: unknown } };
      const resp = data as ApiSuccess<T> | ApiError;
      if (resp.success) return resp.data;
      throw new Error(resp.error?.message ?? 'Request failed');
    }
    return data as T;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>({ url: endpoint, method: 'GET' });
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>({ url: endpoint, method: 'POST', data });
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>({ url: endpoint, method: 'PUT', data });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>({ url: endpoint, method: 'DELETE' });
  }

  async uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>({
      url: endpoint,
      method: 'POST',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
}

export const api = new ApiClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
);

export default ApiClient;
