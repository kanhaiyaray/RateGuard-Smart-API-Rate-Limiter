import React, { useEffect } from 'react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  }[type] || 'bg-gray-700';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className={`${bgColor} text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[240px]`}>
        {type === 'success' && <i className="fas fa-check-circle"></i>}
        {type === 'error' && <i className="fas fa-exclamation-circle"></i>}
        {type === 'info' && <i className="fas fa-info-circle"></i>}
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-auto text-white/70 hover:text-white">
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
};

export default Toast;