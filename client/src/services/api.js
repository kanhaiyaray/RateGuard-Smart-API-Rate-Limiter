// client/src/services/api.js
import axios from 'axios';

const isBrowser = typeof window !== 'undefined';
const isProduction = process.env.NODE_ENV === 'production';

const sensitiveFields = [
  'password',
  'confirmPassword',
  'oldPassword',
  'newPassword',
  'token',
  'refreshToken',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
];

const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') return data;

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  const redact = (obj) => {
    if (!obj || typeof obj !== 'object') return;

    Object.keys(obj).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        redact(obj[key]);
      }
    });
  };

  redact(sanitized);
  return sanitized;
};

// ============ ✅ FIXED: Get API URL with Port 5000 ============
const getApiUrl = () => {
  // If REACT_APP_API_URL is set in .env, use it (highest priority)
  if (process.env.REACT_APP_API_URL) {
    console.log('🔗 Using REACT_APP_API_URL from .env:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }

  // Check if running in Docker environment
  if (!isBrowser) {
    return 'http://localhost:5000/api';
  }

  const hostname = window.location.hostname;
  const isDocker = process.env.REACT_APP_DOCKER_ENV === 'true' ||
    hostname === 'client' ||
    hostname === 'server' ||
    hostname.includes('client') ||
    hostname.includes('server');

  // ✅ If running in Docker, use port 5000
  if (isDocker) {
    return process.env.REACT_APP_DOCKER_API_URL || 'http://server:5000/api';
  }

  // ✅ For development (outside Docker), use port 5000
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000/api';
  }

  // Fallback
  return process.env.REACT_APP_LOCAL_API_URL || 'http://localhost:5000/api';
};

const API_URL = getApiUrl();

console.log(`🔗 API URL: ${API_URL}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
console.log(`📦 Is Production: ${isProduction}`);

const safeLog = (level, ...args) => {
  if (!isProduction) {
    console[level](...args);
  }
};

// ✅ Create default API client with 30 second timeout
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000, // 30 seconds timeout
});

// ✅ Create a separate client for tester with longer timeout
export const testApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 120000, // 2 minutes for tester
});

// ============ REQUEST INTERCEPTOR ============
api.interceptors.request.use(
  (config) => {
    safeLog('log', `📤 ${config.method.toUpperCase()} ${config.url}`);
    if (config.data) {
      safeLog('log', '📦 Request data:', sanitizeData(config.data));
    }
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// ============ RESPONSE INTERCEPTOR ============
api.interceptors.response.use(
  (response) => {
    safeLog('log', `📥 ${response.status} ${response.config.url}`);
    if (!isProduction && response.data) {
      safeLog('log', '📦 Response data:', sanitizeData(response.data));
    }
    return response;
  },
  (error) => {
    // ✅ BETTER ERROR HANDLING
    console.group('🔴 API Error Details');
    
    // Check if it's a timeout error
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      console.error('⏱️ Request Timeout:', error.message);
      console.error('   The server took too long to respond.');
      console.error('   Make sure the backend server is running.');
      console.error(`   → Attempted URL: ${error.config?.baseURL}${error.config?.url}`);
      
      // Dispatch a custom timeout event
      window.dispatchEvent(new CustomEvent('api:timeout', {
        detail: { url: error.config?.url }
      }));
    }
    // Handle Network Errors
    else if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      console.error('🌐 Network Error:');
      console.error('   The server is not reachable.');
      console.error('   Make sure the backend server is running.');
      console.error(`   → Attempted URL: ${error.config?.baseURL}${error.config?.url}`);
      
      window.dispatchEvent(new CustomEvent('network:error'));
    }
    // Handle 401 Unauthorized
    else if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      console.debug('🔒 401 Unauthorized - Session expired or invalid');
    }
    // Handle 429 Rate Limited
    else if (error.response?.status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'] ||
        error.response?.data?.retryAfter ||
        60;

      window.dispatchEvent(new CustomEvent('rate:limited', {
        detail: {
          message: error.response?.data?.message || 'Too many requests. Please slow down.',
          retryAfter: retryAfter,
          status: error.response?.status,
          data: error.response?.data,
        }
      }));

      console.warn('⏳ Rate limit exceeded:', error.response?.data?.message || 'Too many requests');
    }
    // Handle 403 Forbidden
    else if (error.response?.status === 403) {
      console.warn('🚫 Forbidden - Insufficient permissions');
      window.dispatchEvent(new CustomEvent('auth:forbidden'));
    }
    // Handle 500 Server Error
    else if (error.response?.status === 500) {
      console.error('💥 Server error:', error.response?.data?.message);
      window.dispatchEvent(new CustomEvent('server:error', {
        detail: error.response?.data
      }));
    }
    // Handle other errors with response
    else if (error.response) {
      console.error(`❌ HTTP ${error.response.status}:`, error.response.data?.message || error.message);
    }
    // Handle request setup errors
    else if (error.request) {
      console.error('❌ No response received:', error.message);
      console.error('   Check your network connection.');
    }
    // Handle other errors
    else {
      console.error('❌ Error:', error.message);
    }
    
    console.groupEnd();

    return Promise.reject(error);
  }
);

// ✅ Apply the same interceptors to testApi
testApi.interceptors.request.use(
  (config) => {
    safeLog('log', `📤 [TESTER] ${config.method.toUpperCase()} ${config.url}`);
    if (config.data) {
      safeLog('log', '📦 [TESTER] Request data:', sanitizeData(config.data));
    }
    return config;
  },
  (error) => {
    console.error('❌ [TESTER] Request error:', error);
    return Promise.reject(error);
  }
);

testApi.interceptors.response.use(
  (response) => {
    safeLog('log', `📥 [TESTER] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.group('🔴 [TESTER] API Error Details');
    
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      console.error('⏱️ [TESTER] Request Timeout:', error.message);
      console.error('   The tester is taking too long. Try reducing requests or duration.');
      console.error(`   → Attempted URL: ${error.config?.baseURL}${error.config?.url}`);
    } else {
      console.error('❌ [TESTER] Error:', error.message);
    }
    
    console.groupEnd();
    return Promise.reject(error);
  }
);

export default api;