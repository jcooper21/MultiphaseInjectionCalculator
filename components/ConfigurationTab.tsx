import React from 'react';
import { LayersIcon, PlusIcon } from './icons';
import { Segment, CalculationResults } from '../types';
import SegmentCard from './SegmentCard';

interface ConfigurationTabProps {
  segments: Segment[];
  addSegment: () => void;
  updateSegment: (id: number, field: keyof Omit<Segment, 'id'>, value: string) => void;
  removeSegment: (id: number) => void;
  moveSegment: (id: number, direction: 'up' | 'down') => void;
  errors: Record<string, string>;
  results: CalculationResults | null;
}

const ConfigurationTab: React.FC<ConfigurationTabProps> = ({
  segments,
  addSegment,
  updateSegment,
  removeSegment,
  moveSegment,
  errors,
  results
}) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <LayersIcon className="w-5 h-5 text-blue-600" />
          Tubing String Configuration
        </h3>
        <button
          onClick={addSegment}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center gap-2 hover:shadow-lg"
        >
          <PlusIcon className="w-4 h-4" />
          Add Segment
        </button>
      </div>
      
      <div className="space-y-4">
        {segments.map((segment, index) => {
          const depthFrom = segments.slice(0, index).reduce((sum, s) => sum + (s.length || 0), 0);
          const depthTo = depthFrom + (segment.length || 0);
          const segmentResult = results?.segments.find(s => s.segmentNumber === index + 1);
          
          return (
            <SegmentCard
              key={segment.id}
              segment={segment}
              index={index}
              total={segments.length}
              depthFrom={depthFrom}
              depthTo={depthTo}
              onUpdate={(field, value) => updateSegment(segment.id, field, value)}
              onRemove={() => removeSegment(segment.id)}
              onMoveUp={() => moveSegment(segment.id, 'up')}
              onMoveDown={() => moveSegment(segment.id, 'down')}
              errors={errors}
              result={segmentResult}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ConfigurationTab;
