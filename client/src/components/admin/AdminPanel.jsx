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
  const [auditLogs, setAuditLogs] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [loadTest, setLoadTest] = useState(null);
  const [loadTestUrl, setLoadTestUrl] = useState('https://example.com');
  const [apiKeyName, setApiKeyName] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, auditRes, apiKeysRes, twoFactorRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users?limit=50'),
        api.get('/admin/audit-logs'),
        api.get('/admin/api-keys'),
        api.get('/admin/2fa/status'),
      ]);

      setStats(statsRes.data.stats || statsRes.data.data || null);
      setUsers(usersRes.data.data || []);
      setAuditLogs(auditRes.data.data || []);
      setApiKeys(apiKeysRes.data.data || []);
      setTwoFactorEnabled(Boolean(twoFactorRes.data.data?.enabled));
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

  const changeUserRole = async (userId, role) => {
    try {
      await api.put('/admin/users/role', { userId, role });
      showToast(`Role changed to ${role}`, 'success');
      fetchAdminData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change role', 'error');
    }
  };

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

  const exportReport = async () => {
    try {
      const res = await api.get('/admin/export-report', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'rateguard-report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Report downloaded', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to export report', 'error');
    }
  };

  const createApiKey = async (event) => {
    event.preventDefault();
    try {
      const res = await api.post('/admin/api-keys', { appName: apiKeyName, permissions: ['read'], rateLimit: 100 });
      setApiKeys([res.data.data, ...apiKeys]);
      setApiKeyName('');
      showToast('API key created', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create API key', 'error');
    }
  };

  const toggleTwoFactor = async () => {
    try {
      const res = await api.post('/admin/2fa/toggle', { enabled: !twoFactorEnabled });
      setTwoFactorEnabled(Boolean(res.data.data?.enabled));
      showToast('Two-factor authentication updated', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update 2FA', 'error');
    }
  };

  const runLoadTest = async () => {
    try {
      const res = await api.post('/admin/load-test', { url: loadTestUrl, requests: 25, concurrency: 5 });
      setLoadTest(res.data.data);
      showToast('Load test completed', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to run load test', 'error');
    }
  };

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
      <div className="glass rounded-2xl p-6 border border-white/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              <i className="fas fa-user-shield mr-3 text-purple-400"></i>
              Unified Admin Panel
            </h1>
            <p className="text-gray-400 mt-1 text-sm">Monitor activity, manage users, secure access, and export analytics.</p>
          </div>
          <button onClick={exportReport} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm transition">
            <i className="fas fa-file-csv mr-2"></i>Export CSV
          </button>
        </div>
      </div>

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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-5 border border-white/5 xl:col-span-2">
          <h3 className="font-semibold text-white mb-3"><i className="fas fa-bell mr-2 text-yellow-400"></i>Alerts & Insights</h3>
          <div className="grid gap-3">
            {(stats?.alerts || []).map((alert) => (
              <div key={alert.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium">{alert.title}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${alert.severity === 'critical' ? 'bg-red-500/20 text-red-300' : alert.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-blue-500/20 text-blue-300'}`}>{alert.severity}</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{alert.message}</p>
              </div>
            ))}
            {!stats?.alerts?.length && <p className="text-sm text-gray-500">No alerts at the moment.</p>}
          </div>
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <p className="text-white font-medium">Predictive Insights</p>
              <span className="text-xs text-blue-300">Peak hour: {stats?.insights?.peakHour ?? 0}:00</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
              <div>
                <p className="text-gray-400">Forecasted requests</p>
                <p className="text-xl font-bold text-white">{stats?.insights?.predictedRequests || 0}</p>
              </div>
              <div>
                <p className="text-gray-400">Recommended limit</p>
                <p className="text-xl font-bold text-white">{stats?.insights?.recommendedLimit || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-white/5">
          <h3 className="font-semibold text-white mb-3"><i className="fas fa-shield-alt mr-2 text-green-400"></i>Security Controls</h3>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Two-factor authentication</p>
                <p className="text-xs text-gray-400">Protect admin logins with 2FA</p>
              </div>
              <button onClick={toggleTwoFactor} className={`px-3 py-2 rounded-lg text-sm ${twoFactorEnabled ? 'bg-green-600' : 'bg-white/10'}`}>{twoFactorEnabled ? 'Enabled' : 'Disabled'}</button>
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <p className="text-xs text-gray-400 mb-2">Create an API key for connected apps</p>
              <form onSubmit={createApiKey} className="space-y-2">
                <input value={apiKeyName} onChange={(e) => setApiKeyName(e.target.value)} placeholder="App name" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm" required />
                <button type="submit" className="w-full px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm">Create API Key</button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5 border border-white/5">
          <h3 className="font-semibold text-white mb-3"><i className="fas fa-history mr-2 text-blue-400"></i>Recent Activity</h3>
          <div className="space-y-2">
            {(stats?.recentActivity || []).map((entry) => (
              <div key={entry._id} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="text-white">{entry.userId?.name || 'Unknown user'}</p>
                  <span className="text-gray-400 text-xs">{new Date(entry.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-gray-400">{entry.method} {entry.endpoint} • {entry.status}</p>
              </div>
            ))}
            {!stats?.recentActivity?.length && <p className="text-sm text-gray-500">No recent activity yet.</p>}
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-white/5">
          <h3 className="font-semibold text-white mb-3"><i className="fas fa-terminal mr-2 text-purple-400"></i>Load Testing</h3>
          <div className="space-y-3">
            <input value={loadTestUrl} onChange={(e) => setLoadTestUrl(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm" />
            <button onClick={runLoadTest} className="w-full px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm">Run Test</button>
            {loadTest && <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-gray-300"><p>Success rate: {loadTest.summary?.successRate}%</p><p>Average response time: {loadTest.summary?.avgResponseTime?.toFixed(0)}ms</p></div>}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 border border-white/5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="font-semibold text-white"><i className="fas fa-users mr-2 text-blue-400"></i>User Management <span className="ml-2 text-sm text-gray-400">({filteredUsers.length})</span></h3>
          <div className="flex items-center gap-3">
            <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            <button onClick={fetchAdminData} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm transition"><i className="fas fa-sync-alt"></i></button>
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
                <tr><td colSpan="5" className="text-center py-8 text-gray-500">No users found</td></tr>
              ) : filteredUsers.map((u) => (
                <tr key={u._id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="py-3 px-3"><div><p className="text-white font-medium">{u.name}</p><p className="text-gray-400 text-xs">{u.email}</p></div></td>
                  <td className="py-3 px-3"><select value={u.plan} onChange={(e) => changeUserPlan(u._id, e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"><option value="FREE">FREE</option><option value="PREMIUM">PREMIUM</option><option value="ADMIN">ADMIN</option></select></td>
                  <td className="py-3 px-3"><select value={u.role} onChange={(e) => changeUserRole(u._id, e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" disabled={u._id === user?._id}><option value="user">User</option><option value="admin">Admin</option></select></td>
                  <td className="py-3 px-3 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-3"><button onClick={() => deleteUser(u._id)} disabled={u._id === user?._id} className="text-red-400 hover:text-red-300 transition disabled:opacity-50 disabled:cursor-not-allowed" title={u._id === user?._id ? 'Cannot delete yourself' : 'Delete user'}><i className="fas fa-trash"></i></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5 border border-white/5">
          <h3 className="font-semibold text-white mb-3"><i className="fas fa-file-alt mr-2 text-emerald-400"></i>Audit Log</h3>
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log._id} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="text-white">{log.action}</p>
                  <span className="text-gray-400 text-xs">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-gray-400">{log.resource} • {log.adminId?.email || 'System'}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-5 border border-white/5">
          <h3 className="font-semibold text-white mb-3"><i className="fas fa-key mr-2 text-cyan-400"></i>API Keys</h3>
          <div className="space-y-2">
            {apiKeys.map((key) => (
              <div key={key._id} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                <p className="text-white font-medium">{key.appName}</p>
                <p className="text-gray-400 break-all">{key.key}</p>
              </div>
            ))}
            {!apiKeys.length && <p className="text-sm text-gray-500">No API keys yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;