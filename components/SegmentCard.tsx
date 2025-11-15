import React, { useState } from 'react';
import { Trash2Icon, ArrowUpIcon, ArrowDownIcon, InfoIcon, ChevronRightIcon, ChevronDownIcon } from './icons';
import Tooltip from './Tooltip';
import { Segment, SegmentResult } from '../types';

const SegmentCard: React.FC<{
  segment: Segment;
  index: number;
  total: number;
  depthFrom: number;
  depthTo: number;
  onUpdate: (field: keyof Omit<Segment, 'id'>, value: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  errors: Record<string, string>;
  result?: SegmentResult;
}> = ({ segment, index, total, depthFrom, depthTo, onUpdate, onRemove, onMoveUp, onMoveDown, errors, result }) => {
  const [expanded, setExpanded] = useState(true);
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
  const color = colors[index % colors.length];
  
  return (
    <div className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden ${
      expanded ? 'max-h-96' : 'max-h-20'
    }`}>
      <div className={`h-1 ${color}`} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${color} text-white font-bold flex items-center justify-center shadow-md`}>
              {index + 1}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Segment {index + 1}</h3>
              <p className="text-xs text-gray-500">Depth: {depthFrom.toFixed(0)} - {depthTo.toFixed(0)}m</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {expanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
            </button>
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowUpIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === total - 1}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowDownIcon className="w-4 h-4" />
            </button>
            {total > 1 && (
              <button
                onClick={onRemove}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2Icon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {expanded && (
          <div className="space-y-3 animate-slideIn">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Inner Diameter</label>
                <div className="relative">
                  <input
                    type="number"
                    value={segment.diameter}
                    onChange={(e) => onUpdate('diameter', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border-2 transition-colors text-gray-900 ${
                      errors[`segment_diameter_${segment.id}`] 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-200 bg-gray-100 hover:border-gray-300 focus:border-blue-400 focus:outline-none'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">mm</span>
                </div>
                {errors[`segment_diameter_${segment.id}`] && (
                  <p className="mt-1 text-xs text-red-600">{errors[`segment_diameter_${segment.id}`]}</p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Length</label>
                <div className="relative">
                  <input
                    type="number"
                    value={segment.length}
                    onChange={(e) => onUpdate('length', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border-2 transition-colors text-gray-900 ${
                      errors[`segment_length_${segment.id}`] 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-200 bg-gray-100 hover:border-gray-300 focus:border-blue-400 focus:outline-none'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">m</span>
                </div>
                {errors[`segment_length_${segment.id}`] && (
                  <p className="mt-1 text-xs text-red-600">{errors[`segment_length_${segment.id}`]}</p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Roughness
                  <Tooltip content="Pipe wall roughness affects friction losses">
                    <InfoIcon className="inline ml-1 w-3 h-3 text-gray-400" />
                  </Tooltip>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    value={segment.roughness}
                    onChange={(e) => onUpdate('roughness', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border-2 transition-colors text-gray-900 ${
                      errors[`segment_roughness_${segment.id}`] 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-200 bg-gray-100 hover:border-gray-300 focus:border-blue-400 focus:outline-none'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">mm</span>
                </div>
                {errors[`segment_roughness_${segment.id}`] && (
                  <p className="mt-1 text-xs text-red-600">{errors[`segment_roughness_${segment.id}`]}</p>
                )}
              </div>
            </div>
            
            {result && (
              <div className="mt-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Velocity:</span>
                    <span className={`ml-1 font-semibold ${
                      result.velocity > 25 ? 'text-red-600' : 
                      result.velocity > 20 ? 'text-amber-600' : 
                      'text-gray-800'
                    }`}>
                      {result.velocity.toFixed(2)} m/s
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Reynolds:</span>
                    <span className="ml-1 font-semibold text-gray-800">
                      {result.reynoldsNumber.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Regime:</span>
                    <span className={`ml-1 font-semibold ${
                      result.flowRegime === 'Laminar' ? 'text-blue-600' :
                      result.flowRegime === 'Transitional' ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {result.flowRegime}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SegmentCard;
