import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const TestResults = ({ results }) => {
  const { summary, performance, statusCodes, timeline, target } = results;

  const chartData = {
    labels: timeline.map((_, idx) => `${idx + 1}`),
    datasets: [
      {
        label: 'Response Time (ms)',
        data: timeline.map((t) => t.responseTime),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointBackgroundColor: timeline.map((t) =>
          t.status === 429 ? 'rgb(239, 68, 68)' : t.success ? 'rgb(34, 197, 94)' : 'rgb(234, 179, 8)'
        ),
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
          font: { size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const item = timeline[context.dataIndex];
            return [`Response: ${item.responseTime}ms`, `Status: ${item.status}`, `Success: ${item.success ? '✅' : '❌'}`];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8', maxTicksLimit: 20 },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8' },
        beginAtZero: true,
      },
    },
  };

  const getStatusColor = (rate) => {
    if (rate > 90) return 'text-emerald-400';
    if (rate > 70) return 'text-blue-400';
    if (rate > 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="test-results space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          <i className="fas fa-chart-bar mr-2 text-blue-400"></i>
          Test Results
        </h3>
        <span className="text-xs text-gray-500">{new Date(results.timestamp).toLocaleTimeString()}</span>
      </div>

      <div className="bg-white/5 rounded-lg p-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-xs">{target.method}</span>
          <span className="text-gray-300 truncate font-mono text-xs">{target.url}</span>
          {target.headers.length > 0 && <span className="text-xs text-gray-500">{target.headers.length} headers</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{summary.totalRequests}</div>
          <div className="text-xs text-gray-500">Total Requests</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${getStatusColor(summary.successRate)}`}>{summary.successRate}%</div>
          <div className="text-xs text-gray-500">Success Rate</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{summary.rateLimitedCount}</div>
          <div className="text-xs text-gray-500">Rate Limited</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{summary.requestsPerSecond}</div>
          <div className="text-xs text-gray-500">Req/Sec</div>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-xs text-gray-500">Avg</div>
          <div className="text-sm font-bold text-white">{performance.avgResponseTime}ms</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-xs text-gray-500">Min</div>
          <div className="text-sm font-bold text-emerald-400">{performance.minResponseTime}ms</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-xs text-gray-500">Max</div>
          <div className="text-sm font-bold text-red-400">{performance.maxResponseTime}ms</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-xs text-gray-500">P95</div>
          <div className="text-sm font-bold text-yellow-400">{performance.p95ResponseTime}ms</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-xs text-gray-500">P99</div>
          <div className="text-sm font-bold text-orange-400">{performance.p99ResponseTime}ms</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-xs text-gray-500">Duration</div>
          <div className="text-sm font-bold text-white">{summary.duration}s</div>
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-2">Status Code Breakdown</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusCodes).map(([code, count]) => (
            <div
              key={code}
              className={`px-3 py-1 rounded-full text-xs font-medium ${code === '429'
                  ? 'bg-red-500/20 text-red-400'
                  : code.startsWith('2')
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : code.startsWith('3')
                      ? 'bg-blue-500/20 text-blue-400'
                      : code.startsWith('4')
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-orange-500/20 text-orange-400'
                }`}
            >
              {code}: {count}
            </div>
          ))}
        </div>
      </div>

      <div className="h-48">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-gray-400">Success (2xx)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
          <span className="text-gray-400">Error (4xx/5xx)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400"></span>
          <span className="text-gray-400">Rate Limited (429)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
          <span className="text-gray-400">Response Time</span>
        </div>
      </div>
    </div>
  );
};

export default TestResults;
