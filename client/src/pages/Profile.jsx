import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Toast from '../components/common/Toast';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [stats, setStats] = useState({ requests: 0, blocked: 0, limit: 0 });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard');
        setStats(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  const changePlan = async (plan) => {
    try {
      const res = await api.post('/admin/change-plan', { plan });
      updateUser(res.data.user);
      // Show toast instead of alert
      setToast({
        show: true,
        message: `Plan changed to ${plan}`,
        type: 'success',
      });
    } catch (err) {
      setToast({
        show: true,
        message: err.response?.data?.message || 'Error changing plan',
        type: 'error',
      });
    }
  };

  const closeToast = () => {
    setToast((prev) => ({ ...prev, show: false }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass rounded-2xl p-8 border border-white/5">
        <div className="flex items-center gap-5 mb-6">
          {/* Unique icon – user’s initial with gradient */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-blue-500/20">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
            <p className="text-gray-400">{user?.email}</p>
            <span className="inline-block mt-1 text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {user?.plan || 'FREE'}
            </span>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-xs text-gray-400">Rate Limit</p>
              <p className="text-lg font-bold text-white">
                {stats.limit === Infinity ? '∞ / min' : `${stats.limit} / min`}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-xs text-gray-400">Requests Today</p>
              <p className="text-lg font-bold text-white">{stats.requests}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-xs text-gray-400">Blocked Today</p>
              <p className="text-lg font-bold text-white">{stats.blocked}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-xs text-gray-400">Member Since</p>
              <p className="text-lg font-bold text-white">
                {new Date(user?.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 border-t border-white/10 pt-6">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Change Plan (Admin)</h4>
          <div className="flex flex-wrap gap-3">
            {['FREE', 'PREMIUM', 'ADMIN'].map((plan) => (
              <button
                key={plan}
                onClick={() => changePlan(plan)}
                className="px-4 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 border border-white/10 transition text-gray-300"
              >
                {plan}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
          duration={3000}
        />
      )}
    </div>
  );
};

export default Profile;