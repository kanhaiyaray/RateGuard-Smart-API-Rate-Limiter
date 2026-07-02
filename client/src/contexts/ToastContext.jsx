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
      const { message, retryAfter } = event.detail;
      showToast(
        `${message}. Please wait ${retryAfter} seconds.`,
        'error',
        5000
      );
    };

    window.addEventListener('rate:limited', handleRateLimited);
    
    return () => {
      window.removeEventListener('rate:limited', handleRateLimited);
    };
  }, []);

  // ============ LISTEN FOR OTHER EVENTS (Optional) ============
  useEffect(() => {
    const handleServerError = (event) => {
      showToast(
        'Server error occurred. Please try again.',
        'error',
        5000
      );
    };

    window.addEventListener('server:error', handleServerError);
    
    return () => {
      window.removeEventListener('server:error', handleServerError);
    };
  }, []);

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