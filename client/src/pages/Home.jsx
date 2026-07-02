import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { user } = useAuth();
  return (
    <div className="text-center py-20">
      <h1 className="text-5xl font-extrabold text-white mb-4">
        Smart API Rate Limiter
      </h1>
      <p className="text-gray-400 text-lg max-w-2xl mx-auto">
        Protect your API from abuse with JWT authentication, Redis-based rate limiting,
        and real-time analytics.
      </p>
      {user ? (
        <Link
          to="/dashboard"
          className="mt-8 inline-block px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition font-medium text-white shadow-lg shadow-blue-600/20"
        >
          Go to Dashboard
        </Link>
      ) : (
        <Link
          to="/register"
          className="mt-8 inline-block px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 transition font-medium text-white shadow-lg shadow-emerald-600/20"
        >
          Get Started
        </Link>
      )}
    </div>
  );
};

export default Home;