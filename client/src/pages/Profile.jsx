import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import Spinner from '../components/common/Spinner';

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    requests: 0,
    blocked: 0,
    limit: 0,
    remaining: 0,
    resetTime: '--:--'
  });

  // ============ FETCH USER STATS ============
  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error('❌ Failed to load stats:', err);
      showToast('Failed to load usage statistics', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // ============ LOAD STATS ON MOUNT ============
  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ============ CHANGE PLAN ============
  const changePlan = async (plan) => {
    // Prevent changing to the same plan
    if (plan === user?.plan) {
      showToast(`You are already on the ${plan} plan`, 'info');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/admin/change-plan', { plan });

      // ✅ FIXED: Access data property from standardized response
      updateUser(res.data.data);

      // Refresh stats to reflect new limit
      await fetchStats();

      showToast(`Plan successfully changed to ${plan}`, 'success');
    } catch (err) {
      console.error('❌ Failed to change plan:', err);

      // Handle specific error cases
      if (err.response?.status === 403) {
        showToast('You do not have permission to change plans', 'error');
      } else if (err.response?.status === 400) {
        showToast(err.response?.data?.message || 'Invalid plan selected', 'error');
      } else {
        showToast(
          err.response?.data?.message || 'Failed to change plan. Please try again.',
          'error'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ============ FORMAT DATE ============
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // ============ GET PLAN COLOR ============
  const getPlanColor = (plan) => {
    switch (plan) {
      case 'FREE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'PREMIUM':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'ADMIN':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  // ============ GET PLAN ICON ============
  const getPlanIcon = (plan) => {
    switch (plan) {
      case 'FREE':
        return 'fa-crown';
      case 'PREMIUM':
        return 'fa-gem';
      case 'ADMIN':
        return 'fa-shield-halved';
      default:
        return 'fa-user';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass rounded-2xl p-8 border border-white/5">
        {/* ============ USER HEADER ============ */}
        <div className="flex items-center gap-5 mb-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-blue-500/20">
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </div>

          {/* User Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{user?.name || 'User'}</h2>
                <p className="text-gray-400 text-sm">{user?.email || 'No email'}</p>
              </div>
              <button
                onClick={logout}
                className="px-3 py-2 rounded-lg bg-red-500/15 text-red-300 border border-red-500/20 hover:bg-red-500/20 transition text-sm font-medium"
                title="Logout"
              >
                <i className="fas fa-right-from-bracket mr-2"></i>
                Logout
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className={`inline-block text-xs px-3 py-1 rounded-full border ${getPlanColor(user?.plan)}`}>
                <i className={`fas ${getPlanIcon(user?.plan)} mr-1.5`}></i>
                {user?.plan || 'FREE'}
              </span>
              {user?.role === 'admin' && (
                <span className="inline-block text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <i className="fas fa-user-shield mr-1.5"></i>
                  Admin
                </span>
              )}
              <button
                onClick={fetchStats}
                disabled={refreshing}
                className="ml-auto text-xs text-gray-400 hover:text-white transition disabled:opacity-50"
                title="Refresh stats"
              >
                <i className={`fas fa-sync-alt ${refreshing ? 'animate-spin' : ''}`}></i>
              </button>
            </div>
          </div>
        </div>

        {/* ============ STATS GRID ============ */}
        <div className="border-t border-white/10 pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition">
              <p className="text-xs text-gray-400">Rate Limit</p>
              <p className="text-lg font-bold text-white">
                {stats.limit === Infinity ? '∞ / min' : `${stats.limit} / min`}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition">
              <p className="text-xs text-gray-400">Requests Today</p>
              <p className="text-lg font-bold text-white">{stats.requests || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition">
              <p className="text-xs text-gray-400">Blocked Today</p>
              <p className="text-lg font-bold text-white">{stats.blocked || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition">
              <p className="text-xs text-gray-400">Remaining</p>
              <p className="text-lg font-bold text-white">
                {stats.remaining === Infinity ? '∞' : stats.remaining || 0}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Resets at {stats.resetTime || '--:--'}</p>
            </div>
          </div>
        </div>

        {/* ============ ADDITIONAL INFO ============ */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-white/5">
            <p className="text-xs text-gray-400">Member Since</p>
            <p className="text-sm font-medium text-white">
              {formatDate(user?.createdAt)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/5">
            <p className="text-xs text-gray-400">User ID</p>
            <p className="text-sm font-mono text-white truncate">
              {user?._id || 'N/A'}
            </p>
          </div>
        </div>

        {/* ============ ADMIN PLAN MANAGEMENT ============ */}
        {user?.role === 'admin' && (
          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-400">
                <i className="fas fa-sliders-h mr-2"></i>
                Plan Management (Admin)
              </h4>
              <span className="text-xs text-gray-500">
                Current: <span className="text-white font-medium">{user?.plan}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {['FREE', 'PREMIUM', 'ADMIN'].map((plan) => {
                const isActive = user?.plan === plan;
                const isLoading = loading && !isActive;

                return (
                  <button
                    key={plan}
                    onClick={() => changePlan(plan)}
                    disabled={loading || isActive}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      flex items-center gap-2
                      ${isActive
                        ? 'bg-blue-600 text-white cursor-default shadow-lg shadow-blue-600/20'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white'
                      }
                      ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {isLoading ? (
                      <Spinner size="sm" color="white" className="!w-4 !h-4" />
                    ) : (
                      <>
                        <i className={`fas ${getPlanIcon(plan)} text-xs`}></i>
                        {plan}
                        {isActive && (
                          <i className="fas fa-check-circle text-xs ml-1"></i>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              <i className="fas fa-info-circle mr-1"></i>
              Changing plans takes effect immediately. Admin plan has unlimited requests.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;