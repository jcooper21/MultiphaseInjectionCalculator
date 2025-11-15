import React from 'react';
import { InjectionType } from '../types';
import FloatingLabelInput from './FloatingLabelInput';
import { GaugeIcon, DropletIcon, ArrowDownIcon, ActivityIcon, LayersIcon, BeakerIcon, ChevronRightIcon, ChevronDownIcon, CalculatorIcon } from './icons';

interface ParametersTabProps {
  injectionType: InjectionType;
  setInjectionType: React.Dispatch<React.SetStateAction<InjectionType>>;
  flowRate: string;
  setFlowRate: React.Dispatch<React.SetStateAction<string>>;
  wellDepth: string;
  setWellDepth: React.Dispatch<React.SetStateAction<string>>;
  injectionPressure: string;
  setInjectionPressure: React.Dispatch<React.SetStateAction<string>>;
  bottomholePressure: string;
  setBottomholePressure: React.Dispatch<React.SetStateAction<string>>;
  reservoirPressure: string;
  setReservoirPressure: React.Dispatch<React.SetStateAction<string>>;
  fluidDensity: string;
  setFluidDensity: React.Dispatch<React.SetStateAction<string>>;
  fluidViscosity: string;
  setFluidViscosity: React.Dispatch<React.SetStateAction<string>>;
  openHoleDiameter: string;
  setOpenHoleDiameter: React.Dispatch<React.SetStateAction<string>>;
  gasSpecificGravity: string;
  setGasSpecificGravity: React.Dispatch<React.SetStateAction<string>>;
  temperature: string;
  setTemperature: React.Dispatch<React.SetStateAction<string>>;
  gasFlowRate: string;
  setGasFlowRate: React.Dispatch<React.SetStateAction<string>>;
  liquidFlowRate: string;
  setLiquidFlowRate: React.Dispatch<React.SetStateAction<string>>;
  errors: Record<string, string>;
  handleInputChange: (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  showAdvanced: boolean;
  setShowAdvanced: React.Dispatch<React.SetStateAction<boolean>>;
  performCalculations: () => void;
  isCalculationDisabled: boolean;
  isCalculating: boolean;
}

const ParametersTab: React.FC<ParametersTabProps> = ({
  injectionType, setInjectionType,
  flowRate, setFlowRate, wellDepth, setWellDepth, injectionPressure, setInjectionPressure, bottomholePressure, setBottomholePressure, reservoirPressure, setReservoirPressure, fluidDensity, setFluidDensity, fluidViscosity, setFluidViscosity, openHoleDiameter, setOpenHoleDiameter,
  gasSpecificGravity, setGasSpecificGravity, temperature, setTemperature, gasFlowRate, setGasFlowRate, liquidFlowRate, setLiquidFlowRate,
  errors, handleInputChange, showAdvanced, setShowAdvanced, performCalculations, isCalculationDisabled, isCalculating
}) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <GaugeIcon className="w-5 h-5 text-blue-600" />
          Injection Type
        </h3>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(['liquid', 'gas', 'multiphase'] as InjectionType[]).map(type => (
            <button
              key={type}
              onClick={() => setInjectionType(type)}
              className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                injectionType === type
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'liquid' ? 'Liquid' : type === 'gas' ? 'Gas' : 'Multiphase'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <GaugeIcon className="w-5 h-5 text-blue-600" />
          System Parameters
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {injectionType === 'liquid' && (
            <FloatingLabelInput
              id="flow-rate"
              label="Flow Rate"
              value={flowRate}
              onChange={handleInputChange(setFlowRate)}
              error={errors.flowRate}
              unit="m³/day"
              icon={<DropletIcon className="w-4 h-4" />}
              helpText="Daily liquid injection rate"
            />
          )}
          {injectionType === 'gas' && (
            <FloatingLabelInput
              id="flow-rate"
              label="Gas Flow Rate"
              value={flowRate}
              onChange={handleInputChange(setFlowRate)}
              error={errors.flowRate}
              unit="m³/day (std)"
              icon={<DropletIcon className="w-4 h-4" />}
              helpText="Daily gas injection rate at standard conditions"
            />
          )}
          {injectionType === 'multiphase' && (
            <>
              <FloatingLabelInput
                id="gas-flow-rate"
                label="Gas Flow Rate"
                value={gasFlowRate}
                onChange={handleInputChange(setGasFlowRate)}
                error={errors.gasFlowRate}
                unit="m³/day (std)"
                icon={<DropletIcon className="w-4 h-4" />}
                helpText="Daily gas injection rate"
              />
              <FloatingLabelInput
                id="liquid-flow-rate"
                label="Liquid Flow Rate"
                value={liquidFlowRate}
                onChange={handleInputChange(setLiquidFlowRate)}
                error={errors.liquidFlowRate}
                unit="m³/day"
                icon={<DropletIcon className="w-4 h-4" />}
                helpText="Daily liquid injection rate"
              />
            </>
          )}
          <FloatingLabelInput
            id="well-depth"
            label="Total Well Depth"
            value={wellDepth}
            onChange={handleInputChange(setWellDepth)}
            error={errors.wellDepth}
            unit="m"
            icon={<ArrowDownIcon className="w-4 h-4" />}
            helpText="Measured depth from surface"
          />
          <FloatingLabelInput
            id="injection-pressure"
            label="Surface Injection Pressure"
            value={injectionPressure}
            onChange={handleInputChange(setInjectionPressure)}
            error={errors.injectionPressure}
            unit="kPa"
            icon={<GaugeIcon className="w-4 h-4" />}
            helpText="Pressure at wellhead"
          />
          <FloatingLabelInput
            id="bottomhole-pressure"
            label="Target Bottom Pressure"
            value={bottomholePressure}
            onChange={handleInputChange(setBottomholePressure)}
            error={errors.bottomholePressure}
            unit="kPa"
            icon={<ActivityIcon className="w-4 h-4" />}
            helpText="Required pressure at TD"
          />
        </div>
      </div>

      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-1"
        >
          {showAdvanced ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
          Advanced Settings
        </button>
        
        {showAdvanced && (
          <div className="grid md:grid-cols-2 gap-4 animate-slideIn">
            <FloatingLabelInput
              id="reservoir-pressure"
              label="Reservoir Pressure"
              value={reservoirPressure}
              onChange={handleInputChange(setReservoirPressure)}
              error={errors.reservoirPressure}
              unit="kPa"
              icon={<LayersIcon className="w-4 h-4" />}
            />
            {(injectionType === 'liquid' || injectionType === 'multiphase') && (
              <>
                <FloatingLabelInput
                  id="fluid-density"
                  label="Liquid Density"
                  value={fluidDensity}
                  onChange={handleInputChange(setFluidDensity)}
                  error={errors.fluidDensity}
                  unit="kg/m³"
                  icon={<BeakerIcon className="w-4 h-4" />}
                  helpText="Density of the liquid phase"
                />
                <FloatingLabelInput
                  id="fluid-viscosity"
                  label="Liquid Viscosity"
                  value={fluidViscosity}
                  onChange={handleInputChange(setFluidViscosity)}
                  error={errors.fluidViscosity}
                  unit="Pa·s"
                  step="0.0001"
                  icon={<DropletIcon className="w-4 h-4" />}
                  helpText="Dynamic viscosity of liquid"
                />
              </>
            )}
            {(injectionType === 'gas' || injectionType === 'multiphase') && (
              <>
                <FloatingLabelInput
                  id="gas-specific-gravity"
                  label="Gas Specific Gravity"
                  value={gasSpecificGravity}
                  onChange={handleInputChange(setGasSpecificGravity)}
                  error={errors.gasSpecificGravity}
                  unit="(relative to air)"
                  step="0.01"
                  icon={<BeakerIcon className="w-4 h-4" />}
                  helpText="Specific gravity relative to air (e.g., 0.65 for natural gas)"
                />
                <FloatingLabelInput
                  id="temperature"
                  label="Surface Temperature"
                  value={temperature}
                  onChange={handleInputChange(setTemperature)}
                  error={errors.temperature}
                  unit="°C"
                  icon={<ActivityIcon className="w-4 h-4" />}
                  helpText="Surface temperature (geothermal gradient applied with depth)"
                />
              </>
            )}
            <FloatingLabelInput
              id="open-hole-diameter"
              label="Open Hole/Casing ID"
              value={openHoleDiameter}
              onChange={handleInputChange(setOpenHoleDiameter)}
              error={errors.openHoleDiameter}
              unit="mm"
              icon={<LayersIcon className="w-4 h-4" />}
              helpText="Inner diameter of the final section below tubing"
             />
          </div>
        )}
      </div>

      <button
        onClick={performCalculations}
        disabled={isCalculationDisabled || isCalculating}
        className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-3 ${
          isCalculationDisabled || isCalculating
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl transform hover:scale-[1.02]'
        }`}
      >
        {isCalculating ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Calculating...
          </>
        ) : (
          <>
            <CalculatorIcon className="w-5 h-5" />
            Run Analysis
          </>
        )}
      </button>
    </div>
  );
};

export default ParametersTab;
