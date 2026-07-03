import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * UsageChart Component
 * Displays a bar chart showing API request counts per hour over the last 24 hours.
 * 
 * @param {Object} props
 * @param {Object} props.data - Chart data with labels and datasets (optional)
 * @param {string} props.title - Custom chart title (optional)
 * @param {boolean} props.showLegend - Whether to show legend (default: false)
 * @param {string} props.color - Primary color for the chart (default: 'blue')
 * @param {string} props.height - Chart height class (default: 'h-48')
 * 
 * @example
 * <UsageChart 
 *   data={usageData}
 *   title="API Requests"
 *   color="purple"
 *   height="h-64"
 * />
 */
const UsageChart = ({ 
  data: chartData = null, 
  title = 'Requests / Hour',
  showLegend = false,
  color = 'blue',
  height = 'h-48'
}) => {
  
  // ============ COLOR CONFIGURATIONS ============
  const colorConfigs = {
    blue: {
      backgroundColor: 'rgba(59, 130, 246, 0.6)',
      borderColor: 'rgba(59, 130, 246, 1)',
      hoverBackgroundColor: 'rgba(59, 130, 246, 0.8)',
      icon: 'text-blue-400',
    },
    purple: {
      backgroundColor: 'rgba(147, 51, 234, 0.6)',
      borderColor: 'rgba(147, 51, 234, 1)',
      hoverBackgroundColor: 'rgba(147, 51, 234, 0.8)',
      icon: 'text-purple-400',
    },
    emerald: {
      backgroundColor: 'rgba(16, 185, 129, 0.6)',
      borderColor: 'rgba(16, 185, 129, 1)',
      hoverBackgroundColor: 'rgba(16, 185, 129, 0.8)',
      icon: 'text-emerald-400',
    },
    red: {
      backgroundColor: 'rgba(239, 68, 68, 0.6)',
      borderColor: 'rgba(239, 68, 68, 1)',
      hoverBackgroundColor: 'rgba(239, 68, 68, 0.8)',
      icon: 'text-red-400',
    },
    orange: {
      backgroundColor: 'rgba(251, 146, 60, 0.6)',
      borderColor: 'rgba(251, 146, 60, 1)',
      hoverBackgroundColor: 'rgba(251, 146, 60, 0.8)',
      icon: 'text-orange-400',
    },
  };

  const colors = colorConfigs[color] || colorConfigs.blue;

  // ============ DEFAULT DATA (Empty state) ============
  const defaultData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
    datasets: [
      {
        label: 'Requests',
        data: Array(24).fill(0),
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: colors.hoverBackgroundColor,
      },
    ],
  };

  // ============ MERGE DATA WITH CUSTOM COLORS ============
  const getMergedData = () => {
    if (!chartData) return defaultData;

    // If chartData is provided, merge with color configs
    return {
      labels: chartData.labels || defaultData.labels,
      datasets: chartData.datasets.map((dataset, index) => ({
        ...dataset,
        backgroundColor: dataset.backgroundColor || colors.backgroundColor,
        borderColor: dataset.borderColor || colors.borderColor,
        borderWidth: dataset.borderWidth || 1,
        borderRadius: dataset.borderRadius || 4,
        hoverBackgroundColor: dataset.hoverBackgroundColor || colors.hoverBackgroundColor,
        // Add gradient effect if requested
        ...(dataset.gradient && {
          backgroundColor: createGradient(dataset.data, colors)
        })
      })),
    };
  };

  // ============ CREATE GRADIENT FOR BAR CHART ============
  const createGradient = (data, colors) => {
    // This is a placeholder - Chart.js doesn't support gradients directly in data
    // You would need to use a plugin or custom implementation
    return colors.backgroundColor;
  };

  const data = getMergedData();

  // ============ CHART OPTIONS ============
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: showLegend,
        labels: {
          color: '#9ca3af',
          font: {
            size: 12,
          },
        },
      },
      title: { 
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#f3f4f6',
        bodyColor: '#d1d5db',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y + ' requests';
            }
            return label;
          }
        }
      },
    },
    scales: {
      x: { 
        grid: { 
          color: 'rgba(255,255,255,0.05)',
          drawBorder: false,
        }, 
        ticks: { 
          color: '#9ca3af',
          font: {
            size: 10,
          },
          maxTicksLimit: 12, // Show every other hour for readability
        },
      },
      y: { 
        grid: { 
          color: 'rgba(255,255,255,0.05)',
          drawBorder: false,
        }, 
        ticks: { 
          color: '#9ca3af',
          font: {
            size: 10,
          },
          beginAtZero: true,
          stepSize: 10,
        },
      },
    },
    animation: {
      duration: 750,
      easing: 'easeInOutQuart',
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  // ============ RENDER ============
  return (
    <div className="glass rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center">
          <i className={`fas fa-chart-bar mr-2 ${colors.icon}`}></i>
          {title}
        </h3>
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs text-gray-400">Live</span>
          </span>
          <span className="text-xs text-gray-400">Last 24h</span>
        </div>
      </div>

      {/* Chart */}
      <div className={`${height} relative`}>
        {data.datasets[0].data.every(val => val === 0) ? (
          // Empty state
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <i className="fas fa-chart-simple text-gray-600 text-3xl mb-2"></i>
            <p className="text-gray-500 text-sm">No data available yet</p>
            <p className="text-gray-600 text-xs mt-1">Start making API requests to see analytics</p>
          </div>
        ) : (
          <Bar data={data} options={options} />
        )}
      </div>

      {/* Footer: Summary Stats (optional) */}
      {data.datasets[0].data.some(val => val > 0) && (
        <div className="mt-3 pt-3 border-t border-white/5 flex justify-between text-xs text-gray-500">
          <span>
            Total: <span className="text-white font-medium">
              {data.datasets[0].data.reduce((a, b) => a + b, 0)}
            </span> requests
          </span>
          <span>
            Peak: <span className="text-white font-medium">
              {Math.max(...data.datasets[0].data)}
            </span> req/h
          </span>
          <span>
            Avg: <span className="text-white font-medium">
              {Math.round(data.datasets[0].data.reduce((a, b) => a + b, 0) / 24)}
            </span> req/h
          </span>
        </div>
      )}
    </div>
  );
};

export default UsageChart;