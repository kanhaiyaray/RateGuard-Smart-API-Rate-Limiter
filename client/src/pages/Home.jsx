import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center py-20">
      {/* ✅ Hero Icon */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-6">
        <i className="fas fa-shield-halved text-3xl text-white"></i>
      </div>
      
      <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-4">
        Smart API Rate Limiter
      </h1>
      
      <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
        Protect your API from abuse with JWT authentication, Redis-based rate limiting,
        and real-time analytics.
      </p>
      
      {/* ✅ Feature badges */}
      <div className="flex flex-wrap gap-3 justify-center mt-6">
        <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs border border-blue-500/30">
          <i className="fas fa-bolt mr-1"></i> Fast
        </span>
        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30">
          <i className="fas fa-shield mr-1"></i> Secure
        </span>
        <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs border border-purple-500/30">
          <i className="fas fa-chart-line mr-1"></i> Real-time
        </span>
        <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs border border-indigo-500/30">
          <i className="fas fa-database mr-1"></i> Redis
        </span>
      </div>
      
      {/* ✅ Call to Action */}
      {user ? (
        <Link
          to="/dashboard"
          className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 transition font-medium text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:scale-105 transition-all duration-200"
        >
          <i className="fas fa-chart-pie"></i>
          Go to Dashboard
          <i className="fas fa-arrow-right text-sm"></i>
        </Link>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 transition font-medium text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 transform hover:scale-105 transition-all duration-200"
          >
            <i className="fas fa-user-plus"></i>
            Get Started Free
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 transition font-medium text-white border border-white/10"
          >
            <i className="fas fa-sign-in-alt"></i>
            Sign In
          </Link>
        </div>
      )}
      
      {/* ✅ Stats section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 w-full max-w-3xl">
        <div className="glass p-4 rounded-xl text-center border border-white/5">
          <p className="text-2xl font-bold text-blue-400">20</p>
          <p className="text-xs text-gray-400">Free tier requests/min</p>
        </div>
        <div className="glass p-4 rounded-xl text-center border border-white/5">
          <p className="text-2xl font-bold text-emerald-400">200</p>
          <p className="text-xs text-gray-400">Premium tier requests/min</p>
        </div>
        <div className="glass p-4 rounded-xl text-center border border-white/5">
          <p className="text-2xl font-bold text-purple-400">∞</p>
          <p className="text-xs text-gray-400">Admin tier unlimited</p>
        </div>
      </div>
    </div>
  );
};

export default Home;