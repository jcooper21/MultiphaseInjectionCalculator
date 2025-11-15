import React from 'react';
import { CalculationResults } from '../types';
import StatusCard from './StatusCard';
import ProgressIndicator from './ProgressIndicator';
import { TrendingUpIcon, DropletIcon, ZapIcon, GaugeIcon, LightbulbIcon, BeakerIcon, LayersIcon, ActivityIcon } from './icons';
import { VELOCITY_WARNING_LIMIT, VELOCITY_ERROR_LIMIT } from '../constants/physics';

interface ResultsTabProps {
  results: CalculationResults;
  bottomholePressure: string;
  reservoirPressure: string;
  setFlowRate: React.Dispatch<React.SetStateAction<string>>;
  setActiveTab: React.Dispatch<React.SetStateAction<'parameters' | 'configuration' | 'results'>>;
}

const ResultsTab: React.FC<ResultsTabProps> = ({ results, bottomholePressure, reservoirPressure, setFlowRate, setActiveTab }) => {
  const hasGasData = results.averageGasDensity !== undefined;
  const hasMultiphaseData = results.averageVoidFraction !== undefined;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Key Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUpIcon className="w-5 h-5 text-blue-600" />
          Performance Metrics
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <StatusCard
            icon={<DropletIcon className="w-5 h-5" />}
            title="Flow Rate"
            value={results.actualFlowRate.toFixed(1)}
            unit="m³/day"
            status={results.actualFlowRate <= results.maxFlowRate ? 'good' : 'error'}
          />
          <StatusCard
            icon={<ZapIcon className="w-5 h-5" />}
            title="Max Velocity"
            value={results.maxSegmentVelocity.toFixed(2)}
            unit="m/s"
            status={results.maxSegmentVelocity > VELOCITY_ERROR_LIMIT ? 'error' : results.maxSegmentVelocity > VELOCITY_WARNING_LIMIT ? 'warning' : 'good'}
          />
          <StatusCard
            icon={<GaugeIcon className="w-5 h-5" />}
            title="Bottom Pressure"
            value={results.bottomPressure.toFixed(0)}
            unit="kPa"
            status={results.bottomPressure >= parseFloat(bottomholePressure) ? 'good' : 'warning'}
          />
        </div>
      </div>

      {/* Gas-specific metrics */}
      {hasGasData && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BeakerIcon className="w-5 h-5 text-purple-600" />
            Gas Properties
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <StatusCard
              icon={<BeakerIcon className="w-5 h-5" />}
              title="Avg Gas Density"
              value={results.averageGasDensity?.toFixed(2) || '0'}
              unit="kg/m³"
              status="good"
            />
            <StatusCard
              icon={<GaugeIcon className="w-5 h-5" />}
              title="Avg Z-Factor"
              value={results.averageCompressibility?.toFixed(3) || '1'}
              unit=""
              status="good"
            />
          </div>
        </div>
      )}

      {/* Multiphase-specific metrics */}
      {hasMultiphaseData && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <LayersIcon className="w-5 h-5 text-indigo-600" />
            Multiphase Flow Properties
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <StatusCard
              icon={<DropletIcon className="w-5 h-5" />}
              title="Avg Gas Void Fraction"
              value={((results.averageVoidFraction || 0) * 100).toFixed(1)}
              unit="%"
              status="good"
            />
            <StatusCard
              icon={<ActivityIcon className="w-5 h-5" />}
              title="Avg Liquid Holdup"
              value={(((1 - (results.averageVoidFraction || 0)) * 100)).toFixed(1)}
              unit="%"
              status="good"
            />
          </div>
        </div>
      )}

      {/* Progress Indicators */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">System Capacity</h3>
        <div className="space-y-4">
          <ProgressIndicator
            value={results.actualFlowRate}
            max={isFinite(results.maxFlowRate) ? results.maxFlowRate : results.actualFlowRate * 2}
            label="Flow Capacity Utilization"
            color={results.maxFlowRate !== Infinity && results.actualFlowRate > results.maxFlowRate * 0.9 ? 'red' : 'blue'}
          />
          <ProgressIndicator
            value={results.maxSegmentVelocity}
            max={VELOCITY_ERROR_LIMIT}
            label="Erosional Velocity Limit"
            color={results.maxSegmentVelocity > VELOCITY_ERROR_LIMIT ? 'red' : results.maxSegmentVelocity > VELOCITY_WARNING_LIMIT ? 'yellow' : 'green'}
          />
          <ProgressIndicator
            value={results.bottomPressure - parseFloat(reservoirPressure)}
            max={parseFloat(bottomholePressure) - parseFloat(reservoirPressure)}
            label="Pressure Overbalance"
            color="blue"
          />
        </div>
      </div>
      
      {/* Flow Rate Suggestion */}
      {results.actualFlowRate > results.maxFlowRate && isFinite(results.maxFlowRate) && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 animate-slideIn">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-white rounded-lg text-amber-600 mt-1">
              <LightbulbIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">Flow Rate Suggestion</h3>
              <p className="text-sm text-amber-800 mt-1">
                The requested flow rate of <span className="font-bold">{results.actualFlowRate.toFixed(1)} m³/day</span> is too high for the current system pressure and tubing configuration.
              </p>
              <p className="text-sm text-amber-800 mt-2">
                Based on the available pressure, the maximum sustainable flow rate is approximately <span className="font-bold">{results.maxFlowRate.toFixed(1)} m³/day</span>.
              </p>
              <button
                onClick={() => {
                  setFlowRate(results.maxFlowRate.toFixed(1));
                  setActiveTab('parameters');
                }}
                className="mt-4 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors shadow-sm hover:shadow-md"
              >
                Apply Suggested Flow Rate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Analysis Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Segment-by-Segment Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Seg</th>
                <th className="px-4 py-3 text-left">Depth</th>
                <th className="px-4 py-3 text-right">Velocity</th>
                <th className="px-4 py-3 text-right">Reynolds</th>
                <th className="px-4 py-3 text-left">Regime</th>
                {hasGasData && <th className="px-4 py-3 text-right">Density</th>}
                {hasGasData && <th className="px-4 py-3 text-right">Temp</th>}
                {hasMultiphaseData && <th className="px-4 py-3 text-right">Void %</th>}
                {hasMultiphaseData && <th className="px-4 py-3 text-left">Pattern</th>}
                {hasMultiphaseData && <th className="px-4 py-3 text-right">V_gas</th>}
                {hasMultiphaseData && <th className="px-4 py-3 text-right">V_liq</th>}
                <th className="px-4 py-3 text-right">P In</th>
                <th className="px-4 py-3 text-right">P Out</th>
                <th className="px-4 py-3 text-right">ΔP Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.segments.map((seg) => (
                <tr key={seg.segmentNumber} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">#{seg.segmentNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {seg.depthFrom.toFixed(0)}-{seg.depthTo.toFixed(0)}m
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${
                      seg.velocity > VELOCITY_ERROR_LIMIT ? 'text-red-600' :
                      seg.velocity > VELOCITY_WARNING_LIMIT ? 'text-amber-600' :
                      'text-gray-800'
                    }`}>
                      {seg.velocity.toFixed(2)} m/s
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {seg.reynoldsNumber.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      seg.flowRegime === 'Laminar' ? 'bg-blue-100 text-blue-700' :
                      seg.flowRegime === 'Transitional' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {seg.flowRegime}
                    </span>
                  </td>
                  {hasGasData && (
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {seg.density?.toFixed(2)} kg/m³
                    </td>
                  )}
                  {hasGasData && (
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {seg.temperature ? (seg.temperature - 273.15).toFixed(1) : '-'}°C
                    </td>
                  )}
                  {hasMultiphaseData && (
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {seg.gasVoidFraction ? (seg.gasVoidFraction * 100).toFixed(1) : '-'}%
                    </td>
                  )}
                  {hasMultiphaseData && (
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="inline-flex px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-700">
                        {seg.flowPattern || '-'}
                      </span>
                    </td>
                  )}
                  {hasMultiphaseData && (
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-800" title="Actual gas velocity (for erosion analysis)">
                      {seg.actualGasVelocity ? seg.actualGasVelocity.toFixed(1) : '-'} m/s
                    </td>
                  )}
                  {hasMultiphaseData && (
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-800" title="Actual liquid velocity (for erosion analysis)">
                      {seg.actualLiquidVelocity ? seg.actualLiquidVelocity.toFixed(1) : '-'} m/s
                    </td>
                  )}
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {seg.inletPressure.toFixed(0)} kPa
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    {seg.outletPressure.toFixed(0)} kPa
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${
                      seg.netPressureChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {seg.netPressureChange >= 0 ? '+' : ''}{seg.netPressureChange.toFixed(1)} kPa
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResultsTab;
