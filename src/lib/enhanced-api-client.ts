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
  }\n\n  throw lastError || new Error('All retry attempts failed');\n}\n\n/**\n * Enhanced API client with retry logic\n */\nexport async function apiRequest<T = any>(\n  url: string,\n  options: ApiRequestOptions = {}\n): Promise<ApiResponse<T>> {\n  const startTime = Date.now();\n  let attempts = 0;\n  \n  try {\n    const response = await fetchWithRetry(url, options);\n    attempts = (options.retries || 2) + 1; // Total attempts made\n    \n    const duration = Date.now() - startTime;\n    \n    let data: T | null = null;\n    let error: string | null = null;\n    \n    // Handle different response types\n    const contentType = response.headers.get('content-type');\n    if (contentType?.includes('application/json')) {\n      const jsonResponse = await response.json();\n      \n      if (response.ok) {\n        data = jsonResponse.data || jsonResponse;\n        error = jsonResponse.error || null;\n      } else {\n        error = jsonResponse.error || jsonResponse.message || `HTTP ${response.status}`;\n      }\n    } else {\n      if (response.ok) {\n        const text = await response.text();\n        data = (text as unknown) as T;\n      } else {\n        error = `HTTP ${response.status}: ${response.statusText}`;\n      }\n    }\n    \n    return {\n      data,\n      error,\n      status: response.status,\n      timing: { duration, attempts }\n    };\n    \n  } catch (err: any) {\n    const duration = Date.now() - startTime;\n    \n    console.error('[API Client] Request failed:', {\n      url,\n      error: err.message,\n      duration,\n      attempts\n    });\n    \n    let errorMessage = 'Request failed';\n    let status = 500;\n    \n    if (err.name === 'AbortError') {\n      errorMessage = 'Request timed out. Please check your connection.';\n      status = 408;\n    } else if (err.message?.includes('fetch failed')) {\n      errorMessage = 'Network error. Please check your connection and try again.';\n      status = 503;\n    } else {\n      errorMessage = err.message || 'Unknown error occurred';\n    }\n    \n    return {\n      data: null,\n      error: errorMessage,\n      status,\n      timing: { duration, attempts }\n    };\n  }\n}\n\n// Specific methods for common operations\nexport const api = {\n  get: <T = any>(url: string, options?: Omit<ApiRequestOptions, 'method'>) =>\n    apiRequest<T>(url, { ...options, method: 'GET' }),\n    \n  post: <T = any>(url: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>\n    apiRequest<T>(url, { ...options, method: 'POST', body }),\n    \n  put: <T = any>(url: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>\n    apiRequest<T>(url, { ...options, method: 'PUT', body }),\n    \n  delete: <T = any>(url: string, options?: Omit<ApiRequestOptions, 'method'>) =>\n    apiRequest<T>(url, { ...options, method: 'DELETE' }),\n};