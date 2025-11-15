import React from 'react';
import { useAnimatedValue } from '../hooks/useAnimatedValue';

const ProgressIndicator: React.FC<{ value: number; max: number; label: string; color?: string }> = ({ 
  value, 
  max, 
  label, 
  color = 'blue' 
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const animatedPercentage = useAnimatedValue(percentage);
  
  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs font-bold text-gray-800">{percentage.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r ${
            color === 'green' ? 'from-green-400 to-green-600' :
            color === 'red' ? 'from-red-400 to-red-600' :
            color === 'yellow' ? 'from-yellow-400 to-yellow-600' :
            'from-blue-400 to-blue-600'
          }`}
          style={{ width: `${animatedPercentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressIndicator;
