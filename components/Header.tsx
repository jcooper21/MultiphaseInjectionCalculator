import React from 'react';
import { DropletIcon } from './icons';
import { CalculationResults } from '../types';

interface HeaderProps {
    results: CalculationResults | null;
    systemHealthScore: number | null;
}

const Header: React.FC<HeaderProps> = ({ results, systemHealthScore }) => {
  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <DropletIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Disposal Well Flow Calculator
              </h1>
              <p className="text-xs text-gray-500">Advanced hydraulic analysis with real-time visualization</p>
            </div>
          </div>
          {results && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-500">System Health</p>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">
                    {systemHealthScore !== null && (
                      <span className={`${
                        systemHealthScore >= 80 ? 'text-green-600' :
                        systemHealthScore >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {systemHealthScore.toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    systemHealthScore !== null && systemHealthScore >= 80 ? 'bg-green-500' :
                    systemHealthScore !== null && systemHealthScore >= 60 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
