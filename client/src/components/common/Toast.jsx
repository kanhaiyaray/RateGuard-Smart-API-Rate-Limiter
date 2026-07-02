import React, { useEffect } from 'react';

const Toast = ({ 
  message, 
  type = 'success', 
  onClose, 
  duration = 3000,
  position = 'bottom-right',
  dismissible = true,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const config = {
    success: {
      bg: 'bg-emerald-600',
      icon: 'fas fa-check-circle',
      border: 'border-emerald-400',
      textColor: 'text-emerald-100',
    },
    error: {
      bg: 'bg-red-600',
      icon: 'fas fa-exclamation-circle',
      border: 'border-red-400',
      textColor: 'text-red-100',
    },
    warning: {
      bg: 'bg-amber-600',
      icon: 'fas fa-exclamation-triangle',
      border: 'border-amber-400',
      textColor: 'text-amber-100',
    },
    info: {
      bg: 'bg-blue-600',
      icon: 'fas fa-info-circle',
      border: 'border-blue-400',
      textColor: 'text-blue-100',
    },
  };

  const { bg, icon, border, textColor } = config[type] || config.info;

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  const positionClass = positionClasses[position] || positionClasses['bottom-right'];

  return (
    <div className={`fixed ${positionClass} z-50 animate-slide-up`}>
      <div 
        className={`
          ${bg} ${textColor} 
          px-6 py-4 rounded-xl shadow-2xl 
          flex items-center gap-4 
          min-w-[280px] max-w-md
          border-l-4 ${border}
          backdrop-blur-sm bg-opacity-90
          transition-all duration-300 hover:scale-105
        `}
      >
        <div className="flex-shrink-0">
          <i className={`${icon} text-xl`}></i>
        </div>
        
        <span className="text-sm font-medium flex-1 leading-relaxed">
          {message}
        </span>
        
        {dismissible && (
          <button 
            onClick={onClose} 
            className="flex-shrink-0 text-white/60 hover:text-white transition-colors hover:rotate-90 duration-200"
            aria-label="Close notification"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;