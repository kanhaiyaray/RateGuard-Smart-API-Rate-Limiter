import React, { createContext, useState, useContext, useEffect } from 'react';
import Toast from '../components/common/Toast'; // ✅ Import Toast component

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'info',
    duration: 3000,
  });

  // ============ SHOW TOAST ============
  const showToast = (message, type = 'info', duration = 3000) => {
    setToast({ 
      show: true, 
      message, 
      type, 
      duration 
    });
  };

  // ============ HIDE TOAST ============
  const hideToast = () => {
    setToast((prev) => ({ ...prev, show: false }));
  };

  // ============ LISTEN FOR RATE LIMIT EVENTS ============
  useEffect(() => {
    const handleRateLimited = (event) => {
      const { message, retryAfter } = event.detail || {};
      showToast(
        message || `Rate limit exceeded. Please wait ${retryAfter || 60} seconds.`,
        'error',
        5000
      );
    };

    window.addEventListener('rate:limited', handleRateLimited);
    
    return () => {
      window.removeEventListener('rate:limited', handleRateLimited);
    };
  }, []);

  // ============ LISTEN FOR UNAUTHORIZED EVENTS ============
  useEffect(() => {
    const handleUnauthorized = () => {
      showToast('Your session has expired. Please log in again.', 'error', 5000);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  // ============ LISTEN FOR SERVER ERROR EVENTS ============
  useEffect(() => {
    const handleServerError = (event) => {
      const detail = event.detail || {};
      showToast(
        detail.message || 'Server error occurred. Please try again.',
        'error',
        5000
      );
    };

    window.addEventListener('server:error', handleServerError);
    
    return () => {
      window.removeEventListener('server:error', handleServerError);
    };
  }, []);

  // ============ LISTEN FOR NETWORK ERROR EVENTS ============
  useEffect(() => {
    const handleNetworkError = () => {
      showToast('Network error. Please check your connection.', 'error', 5000);
    };

    window.addEventListener('network:error', handleNetworkError);
    
    return () => {
      window.removeEventListener('network:error', handleNetworkError);
    };
  }, []);

  // ============ LISTEN FOR FORBIDDEN EVENTS ============
  useEffect(() => {
    const handleForbidden = () => {
      showToast('You do not have permission to perform this action.', 'error', 4000);
    };

    window.addEventListener('auth:forbidden', handleForbidden);
    
    return () => {
      window.removeEventListener('auth:forbidden', handleForbidden);
    };
  }, []);

  // ============ LISTEN FOR SUCCESS EVENTS (Optional) ============
  useEffect(() => {
    const handleSuccess = (event) => {
      const { message } = event.detail || {};
      if (message) {
        showToast(message, 'success', 3000);
      }
    };

    window.addEventListener('app:success', handleSuccess);
    
    return () => {
      window.removeEventListener('app:success', handleSuccess);
    };
  }, []);

  // ============ COMBINED CLEANUP ============
  // Note: The individual useEffect cleanups above handle each event listener
  // This is just for demonstration of combined approach if needed

  return (
    <ToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
          duration={toast.duration || 3000}
          position="bottom-right"
          dismissible={true}
        />
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};