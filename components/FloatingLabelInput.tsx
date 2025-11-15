import React, { useState } from 'react';
import { AlertCircleIcon, InfoIcon } from './icons';

const FloatingLabelInput: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  unit?: string;
  icon?: React.ReactNode;
  helpText?: string;
  type?: string;
  step?: string;
}> = ({ id, label, value, onChange, error, unit, icon, helpText, type = "number", step }) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== '';
  
  return (
    <div className="relative group">
      <div className={`relative bg-white rounded-xl border-2 transition-all duration-200 ${
        error ? 'border-red-300 bg-red-50/50' : 
        focused ? 'border-blue-400 shadow-lg shadow-blue-100' : 
        'border-gray-200 hover:border-gray-300'
      }`}>
        {icon && (
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
            error ? 'text-red-400' : focused ? 'text-blue-500' : 'text-gray-400'
          }`}>
            {icon}
          </div>
        )}
        <input
          id={id}
          type={type}
          step={step}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full px-3 ${icon ? 'pl-10' : ''} ${unit ? 'pr-12' : ''} py-3 pt-5 bg-transparent outline-none text-gray-900 font-medium placeholder-transparent peer`}
          placeholder={label}
        />
        <label 
          htmlFor={id}
          className={`absolute left-3 ${icon ? 'left-10' : ''} transition-all duration-200 pointer-events-none ${
            focused || hasValue ? 'top-1 text-xs' : 'top-3.5 text-base'
          } ${
            error ? 'text-red-500' : focused ? 'text-blue-500' : 'text-gray-500'
          }`}
        >
          {label}
        </label>
        {unit && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
            {unit}
          </div>
        )}
      </div>
      {helpText && !error && (
        <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
          <InfoIcon className="w-3 h-3" />
          {helpText}
        </p>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-slideIn">
          <AlertCircleIcon className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
};
export default FloatingLabelInput;
