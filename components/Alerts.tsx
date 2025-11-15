import React from 'react';
import { AlertCircleIcon, InfoIcon, ChevronRightIcon, ChevronDownIcon } from './icons';
import { CalculationResults } from '../types';
import { VELOCITY_WARNING_LIMIT, VELOCITY_ERROR_LIMIT } from '../constants/physics';

interface AlertsProps {
  calculationError: string | null;
  results: CalculationResults | null;
  errors: Record<string, string>;
  openHoleLength: number;
  totalSegmentLength: number;
  wellDepthNum: number;
  showErosionDetails: boolean;
  setShowErosionDetails: React.Dispatch<React.SetStateAction<boolean>>;
}

const Alerts: React.FC<AlertsProps> = ({
  calculationError,
  results,
  errors,
  openHoleLength,
  totalSegmentLength,
  wellDepthNum,
  showErosionDetails,
  setShowErosionDetails,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 space-y-3">
      {calculationError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm animate-slideIn">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Calculation Failed</p>
              <p className="text-xs text-red-700 mt-1">{calculationError}</p>
            </div>
          </div>
        </div>
      )}
      {results?.warnings?.map((warning, index) => (
        <div key={index} className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-sm animate-slideIn">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">Calculation Warning</p>
              <p className="text-xs text-yellow-700 mt-1">{warning}</p>
            </div>
          </div>
        </div>
      ))}
      {errors.depthError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm animate-slideIn">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Configuration Error</p>
              <p className="text-xs text-red-700 mt-1">{errors.depthError}</p>
            </div>
          </div>
        </div>
      )}
      
      {openHoleLength > 0.1 && !errors.depthError && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg shadow-sm animate-slideIn">
          <div className="flex items-start gap-3">
            <InfoIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">Open Hole Section</p>
              <p className="text-xs text-blue-700 mt-1">
                An open hole section of {openHoleLength.toFixed(1)}m is present from the end of the tubing ({totalSegmentLength.toFixed(1)}m) to the total well depth ({wellDepthNum}m).
              </p>
            </div>
          </div>
        </div>
      )}
      
      {results && results.maxSegmentVelocity > VELOCITY_WARNING_LIMIT && (
         <div className={`${results.maxSegmentVelocity > VELOCITY_ERROR_LIMIT ? 'bg-red-50 border-red-400' : 'bg-amber-50 border-amber-400'} border-l-4 p-4 rounded-lg shadow-sm animate-slideIn`}>
          <div className="flex items-start gap-3">
            <AlertCircleIcon className={`w-5 h-5 ${results.maxSegmentVelocity > VELOCITY_ERROR_LIMIT ? 'text-red-600' : 'text-amber-600'} mt-0.5`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${results.maxSegmentVelocity > VELOCITY_ERROR_LIMIT ? 'text-red-800' : 'text-amber-800'}`}>
                Erosion Velocity {results.maxSegmentVelocity > VELOCITY_ERROR_LIMIT ? 'Exceeded' : 'Warning'}
              </p>
              <p className={`text-xs ${results.maxSegmentVelocity > VELOCITY_ERROR_LIMIT ? 'text-red-700' : 'text-amber-700'} mt-1`}>
                Maximum velocity of {results.maxSegmentVelocity.toFixed(2)} m/s in Segment #{results.maxVelocitySegment} is in a high-risk zone.
              </p>
              <button onClick={() => setShowErosionDetails(!showErosionDetails)} className="text-xs font-semibold text-blue-600 mt-2 flex items-center gap-1">
                {showErosionDetails ? 'Hide Details' : 'Show Details'}
                {showErosionDetails ? <ChevronDownIcon className="w-3 h-3"/> : <ChevronRightIcon className="w-3 h-3"/>}
              </button>
              {showErosionDetails && (
                <div className="mt-2 text-xs text-gray-700 space-y-2">
                  <p className="italic">Note: For water injection, the risk of erosion typically begins to increase at velocities above 18 m/s. This calculator uses a warning threshold of 20 m/s and a critical limit of 25 m/s, but sustained operation above 18 m/s should be carefully evaluated.</p>
                  <h4 className="font-semibold">Risks of High Velocity:</h4>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Erosion-Corrosion:</strong> High fluid velocity can strip away protective films on the pipe wall, accelerating corrosion and leading to premature failure. This is especially risky if the water contains dissolved gases (like CO2 or H2S) or suspended solids.</li>
                    <li><strong>Vibration:</strong> Excessive flow rates can induce mechanical vibrations (Flow-Induced Vibration), which can fatigue pipe joints, supports, and connected equipment, leading to potential leaks.</li>
                    <li><strong>Equipment Damage:</strong> Valves, bends, and instrumentation can be damaged by the erosive force of high-velocity fluid.</li>
                  </ul>
                  <h4 className="font-semibold mt-2">Mitigation Strategies:</h4>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Increase Pipe Diameter:</strong> Using larger diameter tubing for the high-velocity sections is the most effective way to reduce fluid speed.</li>
                    <li><strong>Material Selection:</strong> Employing corrosion-resistant alloys (CRAs) or internally coated pipes can significantly increase the tolerance to high velocities.</li>
                    <li><strong>Flow Control:</strong> If possible, reduce the injection rate to stay within acceptable limits.</li>
                    <li><strong>Fluid Filtering:</strong> Ensuring the injected water is free of abrasive solids (sand, scale) will minimize mechanical erosion.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;
