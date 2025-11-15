import React from 'react';

const StatusCard: React.FC<{ 
  icon: React.ReactNode; 
  title: string; 
  value: string | number; 
  unit?: string; 
  status?: 'good' | 'warning' | 'error' | 'neutral';
  trend?: 'up' | 'down' | 'stable';
}> = ({ icon, title, value, unit, status = 'neutral', trend }) => {
  const statusColors = {
    good: 'from-green-50 to-emerald-50 border-green-200',
    warning: 'from-yellow-50 to-amber-50 border-yellow-200',
    error: 'from-red-50 to-rose-50 border-red-200',
    neutral: 'from-gray-50 to-slate-50 border-gray-200'
  };
  
  const statusTextColors = {
    good: 'text-green-700',
    warning: 'text-yellow-700',
    error: 'text-red-700',
    neutral: 'text-gray-700'
  };

  return (
    <div className={`relative bg-gradient-to-br ${statusColors[status]} border rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] group`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-lg bg-white/80 ${statusTextColors[status]} group-hover:scale-110 transition-transform`}>
              {icon}
            </div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-bold ${statusTextColors[status]}`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {unit && <span className="text-sm text-gray-500">{unit}</span>}
          </div>
        </div>
        {trend && (
          <div className={`text-xs px-2 py-1 rounded-full ${
            trend === 'up' ? 'bg-green-100 text-green-700' :
            trend === 'down' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '−'}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusCard;
