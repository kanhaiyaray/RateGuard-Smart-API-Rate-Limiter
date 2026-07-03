import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import StatsCard from './StatsCard';
import UsageChart from './UsageChart';
import BlockedChart from './BlockedChart';
import Spinner from '../common/Spinner';

const Dashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    requests: 0,
    remaining: 0,
    blocked: 0,
    limit: 20,
    hourlyRequests: Array(24).fill(0),
    hourlyBlocked: Array(24).fill(0),
    hours: Array.from({ length: 24 }, (_, i) => i),
  });
  const [topEndpoints, setTopEndpoints] = useState([]);
  const [topUsers, setTopUsers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/dashboard');
        setStats(res.data);
        setTopEndpoints(res.data.topEndpoints || []);
        setTopUsers(res.data.topUsers || []);
      } catch (err) {
        console.error('❌ Dashboard fetch error:', err);
        showToast('Failed to load dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [showToast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  // ✅ Prepare chart data from real stats
  const usageChartData = {
    labels: stats.hours.map(h => `${h}h`),
    datasets: [
      {
        label: 'Requests',
        data: stats.hourlyRequests,
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const blockedChartData = {
    labels: stats.hours.map(h => `${h}h`),
    datasets: [
      {
        label: 'Blocked',
        data: stats.hourlyBlocked,
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="glass rounded-2xl p-6 border border-white/5">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, <span className="text-blue-400">{user?.name}</span> 👋
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Here's your API usage summary for today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          title="Requests Today"
          value={stats.requests}
          icon="fa-arrow-right"
          color="blue"
          change="+12%"
        />
        <StatsCard
          title="Remaining"
          value={stats.remaining === Infinity ? '∞' : stats.remaining}
          icon="fa-clock"
          color="emerald"
          sub={`resets at ${stats.resetTime || '2:34'}`}
        />
        <StatsCard
          title="Blocked"
          value={stats.blocked}
          icon="fa-ban"
          color="red"
          sub="429 responses"
        />
        <StatsCard
          title="Rate Limit"
          value={stats.limit === Infinity ? '∞/min' : `${stats.limit}/min`}
          icon="fa-gauge-high"
          color="purple"
          sub="based on your plan"
        />
      </div>

      {/* Charts - Using enhanced components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <UsageChart 
          data={usageChartData}
          title="API Requests / Hour"
          color="blue"
          height="h-56"
        />
        <BlockedChart 
          data={blockedChartData}
          title="Blocked Requests / Hour"
          color="red"
          height="h-56"
        />
      </div>

      {/* Top Endpoints & Users */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass rounded-2xl p-5 border border-white/5">
          <h3 className="font-semibold text-white mb-3">
            <i className="fas fa-route mr-2 text-indigo-400"></i>Top Endpoints
          </h3>
          <div className="space-y-2">
            {topEndpoints.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No data yet</p>
            ) : (
              topEndpoints.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
                >
                  <span className="text-sm text-gray-300">
                    <span className="text-blue-400 font-mono">{item.method}</span> {item.path}
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-300">
                    {item.count} req
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="glass rounded-2xl p-5 border border-white/5">
          <h3 className="font-semibold text-white mb-3">
            <i className="fas fa-users mr-2 text-emerald-400"></i>Most Active Users
          </h3>
          <div className="space-y-2">
            {topUsers.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No data yet</p>
            ) : (
              topUsers.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
                >
                  <span className="text-sm text-gray-300">
                    <i className="fas fa-user-circle mr-2 text-blue-400"></i>{item.name}
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
                    {item.count} req
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;