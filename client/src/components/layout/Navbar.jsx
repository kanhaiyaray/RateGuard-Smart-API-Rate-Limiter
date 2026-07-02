import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-[#0b1120]/80 backdrop-blur sticky top-0 z-50">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
          <i className="fas fa-shield-halved text-white text-sm"></i>
        </div>
        <span className="text-xl font-bold tracking-tight text-white">
          Rate<span className="text-blue-400">Limiter</span>
        </span>
      </div>

      {/* Center: Navigation Links (only when logged in) */}
      {user && (
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-sm text-gray-300 hover:text-white transition"
          >
            <i className="fas fa-home mr-1"></i> Home
          </Link>
          <Link
            to="/dashboard"
            className="text-sm text-gray-300 hover:text-white transition"
          >
            <i className="fas fa-chart-pie mr-1"></i> Dashboard
          </Link>
          <Link
            to="/profile"
            className="text-sm text-gray-300 hover:text-white transition"
          >
            <i className="fas fa-user mr-1"></i> Profile
          </Link>
        </div>
      )}

      {/* Right: User info or Auth buttons */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-sm font-medium text-gray-300">
              <i className="fas fa-user-circle mr-2 text-blue-400"></i>
              {user.name}
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {user.plan || 'FREE'}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-red-400 transition"
            >
              <i className="fas fa-right-from-bracket"></i>
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 transition text-white shadow-lg shadow-blue-600/20"
            >
              <i className="fas fa-sign-in-alt mr-2"></i>Login
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 rounded-lg text-sm font-medium border border-white/20 hover:bg-white/10 transition"
            >
              <i className="fas fa-user-plus mr-2"></i>Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;