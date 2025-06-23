import authService from './authService'; // Import auth service

// TODO: Consider a more specific default result type if AuthResult is not always applicable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DefaultResultType = any; 

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

interface FetchOptions extends RequestInit {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any; // Allow any type for the body before stringify
}

interface ApiError extends Error {
  status?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errorData?: any;
}

async function customFetch<T = DefaultResultType>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { headers: customHeaders, body, ...restOptions } = options;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Get token only on client-side using auth service
  if (typeof window !== 'undefined') {
    const token = authService.getToken();
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const headers = new Headers({
    ...defaultHeaders,
    ...(customHeaders || {}),
  });

  const config: RequestInit = {
    ...restOptions,
    headers,
  };

  if (body) {
    // Only stringify if the Content-Type is application/json and the body is not FormData
    if (headers.get('Content-Type') === 'application/json' && !(body instanceof FormData)) {
      config.body = JSON.stringify(body);
    } else {
      config.body = body; // Use the body as is (e.g., FormData)
    }
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error: ApiError = new Error('API request failed');
    error.status = response.status;
    try {
      error.errorData = await response.json();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) { 
      // If response is not JSON, use statusText
      error.errorData = { message: response.statusText };
    }
    // TODO: Consider a more structured error object or custom error classes
    throw error;
  }

  // Handle 204 No Content or non-JSON responses
  const contentType = response.headers.get('content-type');
  if (response.status === 204 || !contentType || !contentType.includes('application/json')) {
    return {} as T; // Or return null / undefined as per application's needs
  }

  return response.json() as Promise<T>;
}

const api = {
  get: <T = DefaultResultType>(endpoint: string, options?: FetchOptions) => 
    customFetch<T>(endpoint, { ...options, method: 'GET' }),
  
  post: <T = DefaultResultType>(endpoint: string, body?: unknown, options?: FetchOptions) => 
    customFetch<T>(endpoint, { ...options, method: 'POST', body }),
  
  put: <T = DefaultResultType>(endpoint: string, body?: unknown, options?: FetchOptions) => 
    customFetch<T>(endpoint, { ...options, method: 'PUT', body }),

  delete: <T = DefaultResultType>(endpoint: string, options?: FetchOptions) => 
    customFetch<T>(endpoint, { ...options, method: 'DELETE' }),
  
  patch: <T = DefaultResultType>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    customFetch<T>(endpoint, { ...options, method: 'PATCH', body }),
};

export default api;
