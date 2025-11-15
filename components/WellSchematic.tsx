import React from 'react';
import { LayersIcon } from './icons';
import { Segment } from '../types';
import { API_TUBING_SIZES } from '../constants';

interface WellSchematicProps {
  wellDepthNum: number;
  segments: Segment[];
  totalSegmentLength: number;
  openHoleLength: number;
  errors: Record<string, string>;
  applyPreset: (preset: { id: number; name?: string }) => void;
}

const WellSchematic: React.FC<WellSchematicProps> = ({
  wellDepthNum,
  segments,
  totalSegmentLength,
  openHoleLength,
  errors,
  applyPreset
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden sticky top-24">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <LayersIcon className="w-5 h-5" />
          Tubing Configuration
        </h2>
      </div>
      <div className="p-4">
        <div className="relative bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl" style={{ height: '500px' }}>
          {wellDepthNum > 0 ? (
            <>
              <div className="absolute inset-0 p-4">
                <svg width="100%" height="100%" viewBox="0 0 200 460" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="casingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#e5e7eb" />
                      <stop offset="100%" stopColor="#9ca3af" />
                    </linearGradient>
                     <pattern id="openHolePattern" patternUnits="userSpaceOnUse" width="6" height="6">
                      <path d="M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2" stroke="#9ca3af" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect x="60" y="0" width="80" height="460" fill="url(#casingGradient)" opacity="0.3" />
                  
                  {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
                    <g key={i}>
                      <line 
                        x1="40" 
                        y1={f * 460} 
                        x2="160" 
                        y2={f * 460} 
                        stroke="#d1d5db" 
                        strokeWidth="1" 
                        strokeDasharray="4"
                      />
                      <text 
                        x="30" 
                        y={f * 460 + 4} 
                        fontSize="10" 
                        fill="#6b7280" 
                        textAnchor="end"
                      >
                        {(wellDepthNum * f).toFixed(0)}m
                      </text>
                    </g>
                  ))}
                  
                  {/* Tubing segments */}
                  {segments.map((segment, index) => {
                    const startDepth = segments.slice(0, index).reduce((sum, s) => sum + (s.length || 0), 0);
                    const yStart = startDepth * (460 / wellDepthNum);
                    const segmentHeight = (segment.length || 0) * (460 / wellDepthNum);
                    const maxDiameter = Math.max(1, ...API_TUBING_SIZES.map(s => s.id));
                    const widthScale = ((segment.diameter || 1) / maxDiameter) * 50 + 30;
                    const xLeft = 100 - widthScale / 2;
                    
                    const colors = [
                      { main: '#3b82f6', shadow: '#2563eb' },
                      { main: '#10b981', shadow: '#059669' },
                      { main: '#f59e0b', shadow: '#d97706' },
                      { main: '#ef4444', shadow: '#dc2626' },
                      { main: '#8b5cf6', shadow: '#7c3aed' },
                      { main: '#ec4899', shadow: '#db2777' }
                    ];
                    const color = colors[index % colors.length];
                    
                    return (
                      <g key={segment.id} className="transition-all duration-300 hover:opacity-90">
                        <defs>
                          <linearGradient id={`segGrad${segment.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={color.shadow} />
                            <stop offset="50%" stopColor={color.main} />
                            <stop offset="100%" stopColor={color.shadow} />
                          </linearGradient>
                        </defs>
                        <rect 
                          x={xLeft} 
                          y={yStart} 
                          width={widthScale} 
                          height={segmentHeight} 
                          fill={`url(#segGrad${segment.id})`}
                          stroke="#1f2937" 
                          strokeWidth="1" 
                          rx="2"
                          opacity="0.9"
                        />
                        {segmentHeight > 30 && (
                          <>
                            <text 
                              x="100" 
                              y={yStart + segmentHeight / 2 - 5} 
                              textAnchor="middle" 
                              fontSize="11" 
                              fontWeight="bold" 
                              fill="white"
                            >
                              #{index + 1}
                            </text>
                            <text 
                              x="100" 
                              y={yStart + segmentHeight / 2 + 7} 
                              textAnchor="middle" 
                              fontSize="9" 
                              fill="white"
                            >
                              {segment.diameter.toFixed(1)}mm
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}

                  {/* Open Hole Section */}
                  {openHoleLength > 0.1 && !errors.depthError && (
                    <g>
                      <rect
                        x="60"
                        y={totalSegmentLength * (460 / wellDepthNum)}
                        width="80"
                        height={openHoleLength * (460 / wellDepthNum)}
                        fill="url(#openHolePattern)"
                      />
                       {openHoleLength * (460 / wellDepthNum) > 30 && (
                        <text
                          x="100"
                          y={totalSegmentLength * (460 / wellDepthNum) + (openHoleLength * (460 / wellDepthNum)) / 2}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#4b5563"
                          className="font-semibold"
                        >
                          Open Hole
                        </text>
                      )}
                    </g>
                  )}
                </svg>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <LayersIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Enter well depth to visualize</p>
              </div>
            </div>
          )}
        </div>
        
        {wellDepthNum > 0 && (
          <div className="mt-4 bg-white rounded-lg p-3 shadow-md border border-gray-200">
            <div className="flex justify-between items-center text-sm">
              <div>
                <p className="text-xs text-gray-500">Total Tubing Length</p>
                <p className="font-bold text-gray-800">{totalSegmentLength.toFixed(1)}m</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Segments</p>
                <p className="font-bold text-gray-800">{segments.length}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Quick Add API Tubing</p>
          <div className="grid grid-cols-2 gap-2">
            {API_TUBING_SIZES.slice(0, 4).map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="px-3 py-2 text-xs bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 border border-gray-200 hover:border-blue-300 rounded-lg transition-all duration-200 hover:shadow-md"
              >
                <div className="font-medium text-gray-700">{preset.name}</div>
                <div className="text-gray-500">{preset.id}mm</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WellSchematic;
