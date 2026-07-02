import React from 'react';

/**
 * A reusable loading spinner with customizable size and color.
 *
 * @param {string} size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} color - 'blue' | 'white' (default: 'blue')
 * @param {string} className - additional Tailwind classes
 */
const Spinner = ({ size = 'md', color = 'blue', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-4',
    lg: 'h-12 w-12 border-4',
  };

  const colorClasses = {
    blue: 'border-blue-600',
    white: 'border-white',
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div
        className={`
          animate-spin rounded-full
          ${sizeClasses[size]}
          ${colorClasses[color]}
          border-t-transparent
        `}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

export default Spinner;