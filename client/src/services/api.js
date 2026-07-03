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

const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  if (!isBrowser) {
    return 'http://localhost:5000/api';
  }

  const hostname = window.location.hostname;
  const isDocker = process.env.REACT_APP_DOCKER_ENV === 'true' ||
    hostname === 'client' ||
    hostname === 'server' ||
    hostname.includes('client') ||
    hostname.includes('server');

  if (isDocker) {
    return process.env.REACT_APP_DOCKER_API_URL || 'http://server:5001/api';
  }

  return process.env.REACT_APP_LOCAL_API_URL || 'http://localhost:5000/api';
};

const API_URL = getApiUrl();

const safeLog = (level, ...args) => {
  if (!isProduction) {
    console[level](...args);
  }
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
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
    // Handle 401 Unauthorized (session expired)
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      console.debug('🔒 401 Unauthorized - Session expired or invalid');
    }

    // Handle 429 Rate Limited
    if (error.response?.status === 429) {
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
    if (error.response?.status === 403) {
      console.warn('🚫 Forbidden - Insufficient permissions');
      window.dispatchEvent(new CustomEvent('auth:forbidden'));
    }

    // Handle 500 Server Error
    if (error.response?.status === 500) {
      console.error('💥 Server error:', error.response?.data?.message);
      window.dispatchEvent(new CustomEvent('server:error', {
        detail: error.response?.data
      }));
    }

    // Handle network errors
    if (error.message === 'Network Error') {
      console.error('🌐 Network error - check your connection');
      window.dispatchEvent(new CustomEvent('network:error'));
    }

    // ✅ Log detailed error information
    console.error('🔴 API Error Details');
    console.error('Message:', error.message);
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Config:', error.config);

    return Promise.reject(error);
  }
);

export default api;