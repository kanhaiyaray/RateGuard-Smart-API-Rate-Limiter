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
 * BlockedChart Component
 * Displays a bar chart showing blocked API requests per hour over the last 24 hours.
 * 
 * @param {Object} props
 * @param {Object} props.data - Chart data with labels and datasets (optional)
 * @param {string} props.title - Custom chart title (optional)
 * @param {boolean} props.showLegend - Whether to show legend (default: false)
 * @param {string} props.color - Primary color for the chart (default: 'red')
 * @param {string} props.height - Chart height class (default: 'h-48')
 * 
 * @example
 * <BlockedChart 
 *   data={blockedData}
 *   title="Blocked Requests"
 *   color="orange"
 *   height="h-64"
 * />
 */
const BlockedChart = ({ 
  data: chartData = null, 
  title = 'Blocked / Hour',
  showLegend = false,
  color = 'red',
  height = 'h-48'
}) => {
  
  // ============ COLOR CONFIGURATIONS ============
  const colorConfigs = {
    red: {
      backgroundColor: 'rgba(239, 68, 68, 0.6)',
      borderColor: 'rgba(239, 68, 68, 1)',
      hoverBackgroundColor: 'rgba(239, 68, 68, 0.8)',
      icon: 'text-red-400',
      borderColorHover: 'rgba(239, 68, 68, 0.8)',
    },
    orange: {
      backgroundColor: 'rgba(251, 146, 60, 0.6)',
      borderColor: 'rgba(251, 146, 60, 1)',
      hoverBackgroundColor: 'rgba(251, 146, 60, 0.8)',
      icon: 'text-orange-400',
      borderColorHover: 'rgba(251, 146, 60, 0.8)',
    },
    yellow: {
      backgroundColor: 'rgba(234, 179, 8, 0.6)',
      borderColor: 'rgba(234, 179, 8, 1)',
      hoverBackgroundColor: 'rgba(234, 179, 8, 0.8)',
      icon: 'text-yellow-400',
      borderColorHover: 'rgba(234, 179, 8, 0.8)',
    },
    purple: {
      backgroundColor: 'rgba(147, 51, 234, 0.6)',
      borderColor: 'rgba(147, 51, 234, 1)',
      hoverBackgroundColor: 'rgba(147, 51, 234, 0.8)',
      icon: 'text-purple-400',
      borderColorHover: 'rgba(147, 51, 234, 0.8)',
    },
    pink: {
      backgroundColor: 'rgba(236, 72, 153, 0.6)',
      borderColor: 'rgba(236, 72, 153, 1)',
      hoverBackgroundColor: 'rgba(236, 72, 153, 0.8)',
      icon: 'text-pink-400',
      borderColorHover: 'rgba(236, 72, 153, 0.8)',
    },
  };

  const colors = colorConfigs[color] || colorConfigs.red;

  // ============ DEFAULT DATA (Empty state) ============
  const defaultData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
    datasets: [
      {
        label: 'Blocked',
        data: Array(24).fill(0),
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: colors.hoverBackgroundColor,
        hoverBorderColor: colors.borderColorHover,
        hoverBorderWidth: 2,
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
        hoverBorderColor: dataset.hoverBorderColor || colors.borderColorHover,
        hoverBorderWidth: dataset.hoverBorderWidth || 2,
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

  // Calculate total blocked for summary
  const totalBlocked = data.datasets[0].data.reduce((a, b) => a + b, 0);
  const hasData = data.datasets[0].data.some(val => val > 0);

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
            weight: '500',
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      title: { 
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#f3f4f6',
        bodyColor: '#d1d5db',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          size: 13,
          weight: '600',
        },
        bodyFont: {
          size: 12,
        },
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || 'Blocked';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y + ' requests blocked';
            }
            return label;
          },
          afterLabel: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : 0;
            return `${percentage}% of total blocked`;
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
          maxRotation: 0,
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
          stepSize: 5,
          max: Math.max(10, Math.ceil(Math.max(...data.datasets[0].data) / 5) * 5 + 5),
        },
        title: {
          display: false,
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
    hover: {
      mode: 'index',
      intersect: false,
    },
  };

  // ============ RENDER ============
  return (
    <div className="glass rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center">
          <i className={`fas fa-ban mr-2 ${colors.icon}`}></i>
          {title}
        </h3>
        <div className="flex items-center gap-3">
          {/* Warning indicator - shows when there are blocked requests */}
          {hasData && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-xs text-red-400 font-medium">
                {totalBlocked} total blocked
              </span>
            </span>
          )}
          {/* Success indicator - when no blocked requests */}
          {!hasData && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-xs text-emerald-400">All clear</span>
            </span>
          )}
          <span className="text-xs text-gray-400">Last 24h</span>
        </div>
      </div>

      {/* Chart */}
      <div className={`${height} relative`}>
        {!hasData ? (
          // Empty state
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <i className="fas fa-shield-halved text-gray-600 text-2xl"></i>
            </div>
            <p className="text-gray-500 text-sm font-medium">No blocked requests</p>
            <p className="text-gray-600 text-xs mt-1">All requests are being processed successfully</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400/50"></span>
              <span className="text-xs text-emerald-400/70">100% success rate</span>
            </div>
          </div>
        ) : (
          <Bar data={data} options={options} />
        )}
      </div>

      {/* Footer: Summary Stats */}
      {hasData && (
        <div className="mt-3 pt-3 border-t border-white/5 flex justify-between text-xs">
          <span className="text-gray-500">
            Total: <span className="text-white font-medium">{totalBlocked}</span> blocked
          </span>
          <span className="text-gray-500">
            Peak: <span className="text-white font-medium">
              {Math.max(...data.datasets[0].data)}
            </span> blocked/h
          </span>
          <span className="text-gray-500">
            Avg: <span className="text-white font-medium">
              {Math.round(totalBlocked / 24)}
            </span> blocked/h
          </span>
          <span className="text-red-400/70 flex items-center gap-1">
            <i className="fas fa-exclamation-triangle text-xs"></i>
            Rate limit exceeded
          </span>
        </div>
      )}
    </div>
  );
};

export default BlockedChart;