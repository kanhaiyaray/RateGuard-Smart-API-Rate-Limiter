import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import Spinner from '../common/Spinner';

const AdminPanel = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // ============ FETCH ADMIN DATA ============
  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users?limit=50')
      ]);

      setStats(statsRes.data.stats);
      setUsers(usersRes.data.data || []);
    } catch (err) {
      console.error('❌ Failed to fetch admin data:', err);
      showToast('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // ============ CHANGE USER PLAN ============
  const changeUserPlan = async (userId, plan) => {
    const validPlans = ['FREE', 'PREMIUM', 'ADMIN'];
    if (!validPlans.includes(plan)) {
      showToast('Invalid plan selected', 'error');
      return;
    }

    try {
      await api.post('/admin/change-plan', { userId, plan });
      showToast(`Plan changed to ${plan}`, 'success');
      fetchAdminData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change plan', 'error');
    }
  };

  // ============ CHANGE USER ROLE ============
  const changeUserRole = async (userId, role) => {
    try {
      await api.put('/admin/users/role', { userId, role });
      showToast(`Role changed to ${role}`, 'success');
      fetchAdminData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change role', 'error');
    }
  };

  // ============ DELETE USER ============
  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.delete(`/admin/users/${userId}`);
      showToast('User deleted successfully', 'success');
      fetchAdminData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  // ============ FILTER USERS ============
  const filteredUsers = users.filter((u) => {
    const name = u.name || u.email || '';
    const email = u.email || '';
    const search = searchTerm.toLowerCase();

    return name.toLowerCase().includes(search) || email.toLowerCase().includes(search);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-6 border border-white/5">
        <h1 className="text-2xl font-bold text-white">
          <i className="fas fa-user-shield mr-3 text-purple-400"></i>
          Admin Panel
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Manage users, plans, and monitor system health</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-4 border border-white/5">
            <p className="text-xs text-gray-400">Total Users</p>
            <p className="text-2xl font-bold text-white">{stats.users?.total || 0}</p>
          </div>
          <div className="glass rounded-xl p-4 border border-white/5">
            <p className="text-xs text-gray-400">Premium Users</p>
            <p className="text-2xl font-bold text-emerald-400">{stats.users?.premium || 0}</p>
          </div>
          <div className="glass rounded-xl p-4 border border-white/5">
            <p className="text-xs text-gray-400">Requests Today</p>
            <p className="text-2xl font-bold text-blue-400">{stats.requests?.today?.total || 0}</p>
          </div>
          <div className="glass rounded-xl p-4 border border-white/5">
            <p className="text-xs text-gray-400">Blocked Today</p>
            <p className="text-2xl font-bold text-red-400">{stats.requests?.today?.blocked || 0}</p>
          </div>
        </div>
      )}

      {/* System Health */}
      <div className="glass rounded-2xl p-5 border border-white/5">
        <h3 className="font-semibold text-white mb-3">
          <i className="fas fa-heartbeat mr-2 text-green-400"></i>
          System Health
        </h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-sm text-gray-300">MongoDB: <span className="text-green-400">Connected</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-sm text-gray-300">Redis: <span className="text-green-400">Connected</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">Uptime: <span className="text-white">{stats?.uptime?.formatted || 'N/A'}</span></span>
          </div>
        </div>
      </div>

      {/* User Management Table */}
      <div className="glass rounded-2xl p-5 border border-white/5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="font-semibold text-white">
            <i className="fas fa-users mr-2 text-blue-400"></i>
            User Management
            <span className="ml-2 text-sm text-gray-400">({filteredUsers.length})</span>
          </h3>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <button
              onClick={fetchAdminData}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm transition"
            >
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-3 text-gray-400 font-medium">User</th>
                <th className="text-left py-3 px-3 text-gray-400 font-medium">Plan</th>
                <th className="text-left py-3 px-3 text-gray-400 font-medium">Role</th>
                <th className="text-left py-3 px-3 text-gray-400 font-medium">Joined</th>
                <th className="text-left py-3 px-3 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u._id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="py-3 px-3">
                      <div>
                        <p className="text-white font-medium">{u.name}</p>
                        <p className="text-gray-400 text-xs">{u.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={u.plan}
                        onChange={(e) => changeUserPlan(u._id, e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="FREE">FREE</option>
                        <option value="PREMIUM">PREMIUM</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => changeUserRole(u._id, e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        disabled={u._id === user?._id}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => deleteUser(u._id)}
                        disabled={u._id === user?._id}
                        className="text-red-400 hover:text-red-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        title={u._id === user?._id ? "Cannot delete yourself" : "Delete user"}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;