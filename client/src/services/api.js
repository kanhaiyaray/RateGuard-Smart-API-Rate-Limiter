import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

console.log('🔧 API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ============ RESPONSE INTERCEPTOR ============
api.interceptors.response.use(
  (response) => response,
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

    return Promise.reject(error);
  }
);

export default api;