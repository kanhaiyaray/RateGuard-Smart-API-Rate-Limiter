import React from 'react';

const StatsCard = ({ title, value, icon, color, change, sub }) => {
  const colorMap = {
    blue: 'bg-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    red: 'bg-red-500/20 text-red-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div className="glass rounded-2xl p-5 card-hover border border-white/5">
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">{title}</span>
        <span
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color]}`}
        >
          <i className={`fas ${icon}`}></i>
        </span>
      </div>
      <p className="text-3xl font-bold text-white mt-2">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {change && (
        <p className="text-xs text-emerald-400 mt-1">
          <i className="fas fa-arrow-up mr-1"></i>
          {change} from yesterday
        </p>
      )}
    </div>
  );
};

export default StatsCard;