/**
 * Typed HTTP client for FastAPI backend.
 * Handles JWT token management, auto-refresh, and error interceptors.
 */

import { toast } from '@/components/ui/sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.loadTokens();
  }

  private loadTokens() {
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  setTokens(tokens: TokenPair) {
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data: TokenPair = await response.json();
      this.setTokens(data);
    } catch {
      this.clearTokens();
      window.location.href = '/auth';
      throw new Error('Session expired');
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(url, { ...options, headers });

    // Auto-refresh on 401
    if (response.status === 401 && this.refreshToken) {
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshAccessToken().finally(() => {
          this.refreshPromise = null;
        });
      }
      await this.refreshPromise;

      // Retry with new token
      headers['Authorization'] = `Bearer ${this.accessToken}`;
      response = await fetch(url, { ...options, headers });
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));

      // Handle different error types with appropriate messaging
      let errorMessage = errorBody.detail || errorBody.message || 'Request failed';

      if (response.status === 422) {
        // Validation error - parse details
        if (errorBody.detail && Array.isArray(errorBody.detail)) {
          const fieldErrors = errorBody.detail
            .map((err: any) => `${err.loc?.join('.') || 'field'}: ${err.msg}`)
            .join(', ');
          errorMessage = `Validation error: ${fieldErrors}`;
        }
        toast.error('Validation Error', { description: errorMessage });
      } else if (response.status === 500) {
        // Server error - generic message
        errorMessage = 'An internal server error occurred. Please try again later.';
        toast.error('Server Error', { description: errorMessage });
      } else if (response.status === 401) {
        // Auth error - handled by auto-refresh, only toast if refresh failed
        if (!this.refreshToken) {
          toast.error('Authentication Required', { description: 'Please log in to continue.' });
        }
      } else if (response.status >= 400 && response.status < 500) {
        // Other client errors
        toast.error('Request Failed', { description: errorMessage });
      }

      const error = new ApiError(response.status, errorMessage, errorBody);
      throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T> {
    let url = path;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export const api = new ApiClient(API_BASE_URL);
export type { TokenPair };
