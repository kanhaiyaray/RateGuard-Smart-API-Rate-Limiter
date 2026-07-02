import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import StatsCard from './StatsCard';
import UsageChart from './UsageChart';
import BlockedChart from './BlockedChart';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    requests: 0,
    remaining: 0,
    blocked: 0,
    limit: 20,
  });
  const [topEndpoints, setTopEndpoints] = useState([]);
  const [topUsers, setTopUsers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/dashboard');
        setStats(res.data);
        setTopEndpoints(res.data.topEndpoints || []);
        setTopUsers(res.data.topUsers || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 border border-white/5">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, <span className="text-blue-400">{user?.name}</span> 👋
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Here's your API usage summary for today.</p>
      </div>

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
          sub={`resets in ${stats.resetTime || '2:34'}`}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <UsageChart />
        <BlockedChart />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass rounded-2xl p-5 border border-white/5">
          <h3 className="font-semibold text-white mb-3">
            <i className="fas fa-route mr-2 text-indigo-400"></i>Top Endpoints
          </h3>
          <div className="space-y-2">
            {topEndpoints.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-white/5"
              >
                <span className="text-sm text-gray-300">
                  <span className="text-blue-400 font-mono">{item.method}</span> {item.path}
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-300">
                  {item.count} req
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-5 border border-white/5">
          <h3 className="font-semibold text-white mb-3">
            <i className="fas fa-users mr-2 text-emerald-400"></i>Most Active Users
          </h3>
          <div className="space-y-2">
            {topUsers.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-white/5"
              >
                <span className="text-sm text-gray-300">
                  <i className="fas fa-user-circle mr-2 text-blue-400"></i>{item.name}
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
                  {item.count} req
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;