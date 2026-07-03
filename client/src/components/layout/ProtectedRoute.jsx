import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../common/Spinner';

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication. Redirects unauthenticated users to login.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The protected content to render
 * @param {string} props.redirectTo - Custom redirect path (default: '/login')
 * @param {string} props.requiredRole - Required user role (e.g., 'admin')
 * @param {string} props.requiredPlan - Required user plan (e.g., 'PREMIUM')
 * @param {React.ReactNode} props.fallback - Custom fallback component for unauthorized access
 * @param {boolean} props.showLoadingScreen - Show loading screen (default: true)
 * 
 * @example
 * // Basic usage
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 * 
 * // Admin-only route
 * <ProtectedRoute requiredRole="admin">
 *   <AdminPanel />
 * </ProtectedRoute>
 * 
 * // Premium-only route
 * <ProtectedRoute requiredPlan="PREMIUM">
 *   <PremiumContent />
 * </ProtectedRoute>
 */
const ProtectedRoute = ({ 
  children, 
  redirectTo = '/login',
  requiredRole = null,
  requiredPlan = null,
  fallback = null,
  showLoadingScreen = true,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // ============ AUTHENTICATION CHECKING ============
  if (loading) {
    return showLoadingScreen ? (
      <div className="flex flex-col justify-center items-center min-h-[400px] px-4">
        <div className="glass rounded-2xl p-8 border border-white/5 max-w-sm w-full">
          <div className="flex flex-col items-center">
            {/* Animated loading container */}
            <div className="relative">
              <Spinner 
                size="lg" 
                color="blue" 
                className="mb-4"
              />
              {/* Optional: Add a subtle ring animation */}
              <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping"></div>
            </div>
            
            <h3 className="text-white font-medium text-lg mt-2">
              Authenticating
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Please wait while we verify your session...
            </p>
            
            {/* Progress dots animation */}
            <div className="flex items-center gap-1 mt-3">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '200ms' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '400ms' }}></span>
            </div>
          </div>
        </div>
      </div>
    ) : null;
  }

  // ============ NOT AUTHENTICATED ============
  if (!user) {
    // Store the attempted location for redirect after login
    const state = { from: location.pathname };
    return <Navigate to={redirectTo} state={state} replace />;
  }

  // ============ ROLE-BASED ACCESS CONTROL ============
  if (requiredRole && user.role !== requiredRole) {
    if (fallback) {
      return fallback;
    }
    
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] px-4">
        <div className="glass rounded-2xl p-8 border border-red-500/20 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-lock text-red-400 text-2xl"></i>
          </div>
          <h3 className="text-white font-medium text-lg">Access Denied</h3>
          <p className="text-gray-400 text-sm mt-2">
            You don't have permission to access this page.
            {requiredRole && ` This content requires "${requiredRole}" role.`}
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm transition"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ============ PLAN-BASED ACCESS CONTROL ============
  if (requiredPlan && user.plan !== requiredPlan && user.plan !== 'ADMIN') {
    if (fallback) {
      return fallback;
    }
    
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] px-4">
        <div className="glass rounded-2xl p-8 border border-yellow-500/20 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-crown text-yellow-400 text-2xl"></i>
          </div>
          <h3 className="text-white font-medium text-lg">Upgrade Required</h3>
          <p className="text-gray-400 text-sm mt-2">
            This content requires a {requiredPlan} plan.
            Your current plan is {user.plan}.
          </p>
          <button
            onClick={() => window.location.href = '/profile'}
            className="mt-4 px-6 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-sm font-medium transition shadow-lg shadow-yellow-500/20"
          >
            <i className="fas fa-arrow-up mr-2"></i>
            Upgrade Plan
          </button>
        </div>
      </div>
    );
  }

  // ============ SESSION EXPIRY WARNING ============
  // Optional: Check if token is about to expire and show warning
  // This would require decoding the JWT and checking expiration

  // ============ RENDER PROTECTED CONTENT ============
  return children;
};

export default ProtectedRoute;