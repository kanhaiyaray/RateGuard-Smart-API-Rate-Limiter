import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AdminRoute from './components/layout/AdminRoute'; // ✅ NEW
import Navbar from './components/layout/Navbar';
import Spinner from './components/common/Spinner';

// ✅ Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel')); // ✅ NEW

// ============ ERROR BOUNDARY COMPONENT ============
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ App Error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // ✅ Send error to analytics or logging service
    if (window.analytics) {
      window.analytics.track('error', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  handleReload = () => {
    // ✅ Clear any error state and reload
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0b1120] p-4">
          <div className="text-center glass p-8 rounded-2xl max-w-md w-full border border-red-500/20">
            {/* ✅ Error Icon */}
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-exclamation-triangle text-3xl text-red-400"></i>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-gray-400 mb-2 text-sm">
              We're sorry, but something unexpected happened.
            </p>
            
            {/* ✅ Show error message in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-red-500/10 rounded-lg p-3 mb-4 text-left">
                <p className="text-xs text-red-400 font-mono break-all">
                  {this.state.error?.message || 'Unknown error'}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                      Component Stack
                    </summary>
                    <pre className="text-xs text-gray-500 mt-1 overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-2"
              >
                <i className="fas fa-sync-alt"></i>
                Refresh Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <i className="fas fa-home mr-2"></i>
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============ LOADING COMPONENT ============
const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center">
    <Spinner size="lg" color="blue" />
    <p className="text-gray-400 mt-4 text-sm">Loading...</p>
  </div>
);

// ============ MAIN APP COMPONENT ============
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <ToastProvider>
            {/* ✅ Navbar with smooth transitions */}
            <Navbar />
            
            {/* ✅ Main content with Suspense for lazy loading */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 min-h-[calc(100vh-80px)]">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* ✅ Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  {/* ✅ Protected Routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* ✅ NEW: Admin Route - Only accessible by admins */}
                  <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <AdminPanel />
                      </AdminRoute>
                    }
                  />
                  
                  {/* ✅ 404 Not Found */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </main>
            
            {/* ✅ Footer */}
            <footer className="border-t border-white/5 py-4 mt-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <p className="text-xs text-gray-500 text-center">
                  RateGuard &copy; {new Date().getFullYear()} — Smart API Rate Limiter
                </p>
              </div>
            </footer>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;