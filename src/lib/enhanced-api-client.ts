/**
 * Enhanced API Client with Retry Logic and Better Error Handling
 * Handles network timeouts and Supabase connectivity issues
 */

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  status: number;
  timing?: {
    duration: number;
    attempts: number;
  };
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Enhanced fetch with timeout and retry logic
 */
async function fetchWithRetry(
  url: string,
  options: ApiRequestOptions = {}
): Promise<Response> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 15000,
    retries = 2,
    retryDelay = 1000,
  } = options;

  const controller = new AbortController();
  let timeoutId: NodeJS.Timeout | null = null;

  if (timeout > 0) {
    timeoutId = setTimeout(() => controller.abort(), timeout);
  }

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    signal: controller.signal,
    credentials: 'include', // Include cookies
  };

  if (body && method !== 'GET') {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`[API Client] Attempt ${attempt + 1}/${retries + 1} for ${method} ${url}`);

      const response = await fetch(url, fetchOptions);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      return response;
    } catch (error: any) {
      lastError = error;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      console.warn(`[API Client] Attempt ${attempt + 1} failed:`, error.message);

      // Don't retry on last attempt
      if (attempt === retries) {
        break;
      }

      // Only retry on network/timeout errors
      if (
        error.name === 'AbortError' ||
        error.message.includes('fetch failed') ||
        error.message.includes('timeout') ||
        error.code === 'UND_ERR_CONNECT_TIMEOUT'
      ) {
        console.log(`[API Client] Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      // Don't retry on other errors
      break;
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

/**
 * Enhanced API client with retry logic
 */
export async function apiRequest<T = any>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const startTime = Date.now();
  let attempts = 0;

  try {
    const response = await fetchWithRetry(url, options);
    attempts = (options.retries || 2) + 1; // Total attempts made

    const duration = Date.now() - startTime;

    let data: T | null = null;
    let error: string | null = null;

    // Handle different response types
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const jsonResponse = await response.json();

      if (response.ok) {
        data = jsonResponse.data || jsonResponse;
        error = jsonResponse.error || null;
      } else {
        error = jsonResponse.error || jsonResponse.message || `HTTP ${response.status}`;
      }
    } else {
      if (response.ok) {
        const text = await response.text();
        data = (text as unknown) as T;
      } else {
        error = `HTTP ${response.status}: ${response.statusText}`;
      }
    }

    return {
      data,
      error,
      status: response.status,
      timing: { duration, attempts }
    };

  } catch (err: any) {
    const duration = Date.now() - startTime;

    console.error('[API Client] Request failed:', {
      url,
      error: err.message,
      duration,
      attempts
    });

    let errorMessage = 'Request failed';
    let status = 500;

    if (err.name === 'AbortError') {
      errorMessage = 'Request timed out. Please check your connection.';
      status = 408;
    } else if (err.message?.includes('fetch failed')) {
      errorMessage = 'Network error. Please check your connection and try again.';
      status = 503;
    } else {
      errorMessage = err.message || 'Unknown error occurred';
    }

    return {
      data: null,
      error: errorMessage,
      status,
      timing: { duration, attempts }
    };
  }
}