import React from 'react';

/**
 * A reusable loading spinner with customizable size, color, variant, and style.
 * 
 * @param {string} size - 'xs' | 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
 * @param {string} color - 'blue' | 'white' | 'gray' | 'emerald' | 'purple' | 'red' (default: 'blue')
 * @param {string} variant - 'circle' | 'dots' | 'pulse' | 'ring' (default: 'circle')
 * @param {string} className - additional Tailwind classes
 * @param {boolean} overlay - whether to show as full-screen overlay
 * @param {string} label - custom accessibility label and text below spinner
 * @param {React.ReactNode} children - optional content to display below spinner
 * @param {string} labelPosition - 'top' | 'bottom' | 'left' | 'right' (default: 'bottom')
 * @param {number} speed - animation speed multiplier (default: 1, range: 0.5-2)
 * 
 * @example
 * // Basic usage
 * <Spinner size="lg" color="blue" label="Loading..." />
 * 
 * // Full page overlay
 * <Spinner overlay={true} label="Please wait..." />
 * 
 * // Dots variant
 * <Spinner variant="dots" color="purple" />
 * 
 * // With custom children
 * <Spinner label="Processing">
 *   <p className="text-gray-400">This may take a few seconds</p>
 * </Spinner>
 */
const Spinner = ({ 
  size = 'md', 
  color = 'blue', 
  variant = 'circle',
  className = '',
  overlay = false,
  label = null,
  children = null,
  labelPosition = 'bottom',
  speed = 1,
}) => {
  
  // ============ SIZE CONFIGURATION ============
  const sizeClasses = {
    xs: 'h-3 w-3 border-2',
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-4',
    lg: 'h-12 w-12 border-4',
    xl: 'h-16 w-16 border-4',
  };

  // ============ COLOR CONFIGURATION ============
  const colorClasses = {
    blue: 'border-blue-600',
    white: 'border-white',
    gray: 'border-gray-400',
    emerald: 'border-emerald-500',
    purple: 'border-purple-500',
    red: 'border-red-500',
  };

  const colorBgClasses = {
    blue: 'bg-blue-500',
    white: 'bg-white',
    gray: 'bg-gray-400',
    emerald: 'bg-emerald-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
  };

  const colorBgLightClasses = {
    blue: 'bg-blue-500/20',
    white: 'bg-white/20',
    gray: 'bg-gray-400/20',
    emerald: 'bg-emerald-500/20',
    purple: 'bg-purple-500/20',
    red: 'bg-red-500/20',
  };

  const colorTextClasses = {
    blue: 'text-blue-400',
    white: 'text-white',
    gray: 'text-gray-400',
    emerald: 'text-emerald-400',
    purple: 'text-purple-400',
    red: 'text-red-400',
  };

  // ============ LABEL POSITION ============
  const labelPositions = {
    top: 'flex-col-reverse',
    bottom: 'flex-col',
    left: 'flex-row',
    right: 'flex-row-reverse',
  };

  // ============ ANIMATION SPEED ============
  const animationSpeed = {
    0.5: 'duration-500',
    0.75: 'duration-350',
    1: 'duration-300',
    1.25: 'duration-250',
    1.5: 'duration-200',
    2: 'duration-150',
  };

  const getSpeedClass = () => {
    const speeds = Object.keys(animationSpeed).map(Number);
    const closest = speeds.reduce((prev, curr) => {
      return Math.abs(curr - speed) < Math.abs(prev - speed) ? curr : prev;
    });
    return animationSpeed[closest] || animationSpeed[1];
  };

  // ============ RENDER SPINNER BY VARIANT ============
  const renderSpinner = () => {
    const baseSize = sizeClasses[size] || sizeClasses.md;
    const baseColor = colorClasses[color] || colorClasses.blue;
    const speedClass = getSpeedClass();

    switch (variant) {
      case 'dots':
        return (
          <div className="flex items-center space-x-2">
            <div 
              className={`${baseSize.replace('border', '')} rounded-full ${colorBgClasses[color] || colorBgClasses.blue} animate-bounce`} 
              style={{ animationDelay: '0ms', animationDuration: '600ms' }}
            ></div>
            <div 
              className={`${baseSize.replace('border', '')} rounded-full ${colorBgClasses[color] || colorBgClasses.blue} animate-bounce`} 
              style={{ animationDelay: '150ms', animationDuration: '600ms' }}
            ></div>
            <div 
              className={`${baseSize.replace('border', '')} rounded-full ${colorBgClasses[color] || colorBgClasses.blue} animate-bounce`} 
              style={{ animationDelay: '300ms', animationDuration: '600ms' }}
            ></div>
          </div>
        );
      
      case 'pulse':
        return (
          <div className="relative">
            <div 
              className={`${baseSize} rounded-full ${colorBgLightClasses[color] || colorBgLightClasses.blue} animate-ping`}
            ></div>
            <div 
              className={`${baseSize} rounded-full ${colorBgClasses[color] || colorBgClasses.blue}/50 animate-pulse absolute inset-0`}
            ></div>
          </div>
        );
      
      case 'ring':
        return (
          <div className="relative">
            <div 
              className={`${baseSize} rounded-full border-4 ${colorClasses[color] || colorClasses.blue} border-t-transparent animate-spin ${speedClass}`}
              role="status"
            ></div>
            <div 
              className={`absolute inset-0 rounded-full border-4 ${colorClasses[color] || colorClasses.blue} border-opacity-20`}
            ></div>
          </div>
        );
      
      case 'circle':
      default:
        return (
          <div
            className={`
              animate-spin rounded-full
              ${baseSize}
              ${baseColor}
              border-t-transparent
              ${variant === 'circle' ? 'border-solid' : 'border-dashed'}
              ${speedClass}
              shadow-lg shadow-blue-500/10
            `}
            role="status"
            aria-label={label || 'Loading'}
          >
            <span className="sr-only">{label || 'Loading...'}</span>
          </div>
        );
    }
  };

  // ============ OVERLAY WRAPPER ============
  if (overlay) {
    return (
      <div 
        className={`
          fixed inset-0 z-50 
          flex flex-col items-center justify-center
          bg-black/60 backdrop-blur-sm
          transition-all duration-300
          ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-label={label || 'Loading overlay'}
      >
        <div className="flex flex-col items-center space-y-4">
          {renderSpinner()}
          {children && (
            <div className="text-white/80 text-sm font-medium">
              {children}
            </div>
          )}
          {!children && label && (
            <p className="text-white/60 text-sm animate-pulse">
              {label}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ============ INLINE SPINNER ============
  const labelPositionClass = labelPositions[labelPosition] || labelPositions.bottom;

  return (
    <div className={`flex ${labelPositionClass} items-center justify-center gap-3 ${className}`}>
      {renderSpinner()}
      
      {(label || children) && (
        <div className={`flex flex-col ${labelPosition === 'left' || labelPosition === 'right' ? 'items-start' : 'items-center'}`}>
          {label && (
            <p className={`${colorTextClasses[color] || colorTextClasses.blue} text-sm font-medium`}>
              {label}
            </p>
          )}
          {children && (
            <div className={label ? 'mt-1' : ''}>
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============ SPECIALIZED SPINNER VARIANTS ============

/**
 * Spinner with text below
 * @example
 * <SpinnerWithText text="Loading dashboard..." size="lg" />
 */
export const SpinnerWithText = ({ text, ...props }) => {
  return (
    <Spinner {...props} label={text} />
  );
};

/**
 * Full page spinner with overlay
 * @example
 * <FullPageSpinner text="Please wait..." />
 */
export const FullPageSpinner = ({ text = 'Loading...', variant = 'circle' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1120]">
      <Spinner 
        overlay={false} 
        size="lg" 
        color="blue" 
        variant={variant}
        label={text}
      />
    </div>
  );
};

/**
 * Small spinner for buttons
 * @example
 * <ButtonSpinner color="white" />
 */
export const ButtonSpinner = ({ size = 'sm', color = 'white', variant = 'circle' }) => {
  return (
    <Spinner size={size} color={color} variant={variant} className="inline-flex" />
  );
};

/**
 * Card loading spinner with container
 * @example
 * <CardSpinner text="Loading content..." />
 */
export const CardSpinner = ({ text = 'Loading...', size = 'lg' }) => {
  return (
    <div className="glass rounded-2xl p-8 border border-white/5 flex flex-col items-center justify-center min-h-[200px]">
      <Spinner size={size} color="blue" variant="circle" label={text} />
    </div>
  );
};

/**
 * Minimal inline spinner (no text, minimal styling)
 * @example
 * <InlineSpinner size="sm" />
 */
export const InlineSpinner = ({ size = 'sm', color = 'blue' }) => {
  return (
    <Spinner size={size} color={color} variant="circle" className="inline-flex" />
  );
};

/**
 * Skeleton loading spinner (pulse variant with placeholder text)
 * @example
 * <SkeletonSpinner text="Loading data..." />
 */
export const SkeletonSpinner = ({ text = 'Loading...', lines = 3 }) => {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Spinner variant="pulse" size="lg" color="blue" />
        <p className="text-gray-400 animate-pulse">{text}</p>
        {lines > 0 && (
          <div className="w-full space-y-2 mt-2">
            {Array.from({ length: lines }).map((_, i) => (
              <div 
                key={i}
                className="h-3 rounded-full bg-white/5 animate-pulse"
                style={{ 
                  width: `${60 + Math.random() * 30}%`,
                  animationDelay: `${i * 100}ms`
                }}
              ></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Spinner;