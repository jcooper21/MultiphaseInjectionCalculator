import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CalculationResults, Segment, CalculationParams, InjectionType } from './types';
import { CalculatorService } from './services/calculatorService';
import { VELOCITY_WARNING_LIMIT, VELOCITY_ERROR_LIMIT } from './constants/physics';

import Header from './components/Header';
import Alerts from './components/Alerts';
import WellSchematic from './components/WellSchematic';
import ParametersTab from './components/ParametersTab';
import ConfigurationTab from './components/ConfigurationTab';
import ResultsTab from './components/ResultsTab';
import { SettingsIcon, LayersIcon, TrendingUpIcon } from './components/icons';

const DisposalWellCalculator: React.FC = () => {
  const [injectionType, setInjectionType] = useState<InjectionType>('liquid');
  const [flowRate, setFlowRate] = useState('100');
  const [wellDepth, setWellDepth] = useState('400');
  const [injectionPressure, setInjectionPressure] = useState('5000');
  const [bottomholePressure, setBottomholePressure] = useState('15000');
  const [reservoirPressure, setReservoirPressure] = useState('14000');

  const [segments, setSegments] = useState<Segment[]>([
    { id: 1, diameter: 100.5, length: 150, roughness: 0.046 },
    { id: 2, diameter: 76.0, length: 250, roughness: 0.046 }
  ]);

  const [fluidDensity, setFluidDensity] = useState('1000');
  const [fluidViscosity, setFluidViscosity] = useState('0.001');
  const [openHoleDiameter, setOpenHoleDiameter] = useState('150');

  // Gas-specific parameters
  const [gasSpecificGravity, setGasSpecificGravity] = useState('0.65');
  const [temperature, setTemperature] = useState('15');

  // Multiphase parameters
  const [gasFlowRate, setGasFlowRate] = useState('50');
  const [liquidFlowRate, setLiquidFlowRate] = useState('50');
  
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<'parameters' | 'configuration' | 'results'>('parameters');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showErosionDetails, setShowErosionDetails] = useState(false);

  const totalSegmentLength = useMemo(() => segments.reduce((sum, seg) => sum + (seg.length || 0), 0), [segments]);
  const wellDepthNum = parseFloat(wellDepth) || 0;
  const openHoleLength = useMemo(() => Math.max(0, wellDepthNum - totalSegmentLength), [wellDepthNum, totalSegmentLength]);

  useEffect(() => {
    const newErrors: Record<string, string> = {};
    const wellDepthNum = parseFloat(wellDepth) || 0;
    const injectionPressureNum = parseFloat(injectionPressure);
    const bottomholePressureNum = parseFloat(bottomholePressure);
    const reservoirPressureNum = parseFloat(reservoirPressure);
    const openHoleDiameterNum = parseFloat(openHoleDiameter);

    // Common validations
    if (isNaN(wellDepthNum) || wellDepthNum <= 0) newErrors.wellDepth = 'Must be positive';
    if (isNaN(injectionPressureNum)) newErrors.injectionPressure = 'Must be valid number';
    if (isNaN(bottomholePressureNum)) newErrors.bottomholePressure = 'Must be valid number';
    if (isNaN(reservoirPressureNum)) newErrors.reservoirPressure = 'Must be valid number';

    if (openHoleLength > 0.1 && (isNaN(openHoleDiameterNum) || openHoleDiameterNum <= 0)) {
      newErrors.openHoleDiameter = 'Required for open hole section';
    }

    // Type-specific validations
    if (injectionType === 'liquid') {
      const flowRateNum = parseFloat(flowRate);
      const fluidDensityNum = parseFloat(fluidDensity);
      const fluidViscosityNum = parseFloat(fluidViscosity);

      if (isNaN(flowRateNum) || flowRateNum < 0) newErrors.flowRate = 'Must be non-negative';
      if (isNaN(fluidDensityNum) || fluidDensityNum <= 0) newErrors.fluidDensity = 'Must be positive';
      if (isNaN(fluidViscosityNum) || fluidViscosityNum <= 0) newErrors.fluidViscosity = 'Must be positive';
    } else if (injectionType === 'gas') {
      const flowRateNum = parseFloat(flowRate);
      const gasSpecificGravityNum = parseFloat(gasSpecificGravity);
      const temperatureNum = parseFloat(temperature);

      if (isNaN(flowRateNum) || flowRateNum < 0) newErrors.flowRate = 'Must be non-negative';
      if (isNaN(gasSpecificGravityNum) || gasSpecificGravityNum <= 0) newErrors.gasSpecificGravity = 'Must be positive';
      if (isNaN(temperatureNum)) newErrors.temperature = 'Must be valid number';
    } else if (injectionType === 'multiphase') {
      const gasFlowRateNum = parseFloat(gasFlowRate);
      const liquidFlowRateNum = parseFloat(liquidFlowRate);
      const fluidDensityNum = parseFloat(fluidDensity);
      const fluidViscosityNum = parseFloat(fluidViscosity);
      const gasSpecificGravityNum = parseFloat(gasSpecificGravity);
      const temperatureNum = parseFloat(temperature);

      if (isNaN(gasFlowRateNum) || gasFlowRateNum < 0) newErrors.gasFlowRate = 'Must be non-negative';
      if (isNaN(liquidFlowRateNum) || liquidFlowRateNum < 0) newErrors.liquidFlowRate = 'Must be non-negative';
      if (isNaN(fluidDensityNum) || fluidDensityNum <= 0) newErrors.fluidDensity = 'Must be positive';
      if (isNaN(fluidViscosityNum) || fluidViscosityNum <= 0) newErrors.fluidViscosity = 'Must be positive';
      if (isNaN(gasSpecificGravityNum) || gasSpecificGravityNum <= 0) newErrors.gasSpecificGravity = 'Must be positive';
      if (isNaN(temperatureNum)) newErrors.temperature = 'Must be valid number';
    }

    segments.forEach(segment => {
      if (!segment.diameter || segment.diameter <= 0) newErrors[`segment_diameter_${segment.id}`] = 'Required';
      if (!segment.length || segment.length <= 0) newErrors[`segment_length_${segment.id}`] = 'Required';
      if (segment.roughness < 0) newErrors[`segment_roughness_${segment.id}`] = 'Non-negative';
    });

    if (totalSegmentLength > wellDepthNum) {
      newErrors.depthError = `Tubing length (${totalSegmentLength.toFixed(1)}m) cannot exceed well depth (${wellDepthNum}m)`;
    }

    setErrors(newErrors);
  }, [injectionType, flowRate, wellDepth, injectionPressure, bottomholePressure, reservoirPressure, fluidDensity, fluidViscosity, segments, totalSegmentLength, openHoleDiameter, openHoleLength, gasSpecificGravity, temperature, gasFlowRate, liquidFlowRate]);

  const performCalculations = useCallback(async () => {
    if (Object.keys(errors).length > 0) {
      setResults(null);
      return;
    }

    setIsCalculating(true);
    setCalculationError(null);
    setResults(null);

    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      const params: CalculationParams = {
        injectionType,
        flowRate: parseFloat(flowRate) || 0,
        injectionPressure: parseFloat(injectionPressure) || 0,
        bottomholePressure: parseFloat(bottomholePressure) || 0,
        fluidDensity: parseFloat(fluidDensity) || 1000,
        fluidViscosity: parseFloat(fluidViscosity) || 0.001,
        wellDepth: parseFloat(wellDepth) || 0,
        openHoleDiameter: parseFloat(openHoleDiameter) || 0,
        segments: segments,
        // Gas-specific
        gasSpecificGravity: parseFloat(gasSpecificGravity) || 0.65,
        temperature: parseFloat(temperature) + 273.15 || 288.15, // Convert to Kelvin
        // Multiphase
        gasFlowRate: parseFloat(gasFlowRate) || 0,
        liquidFlowRate: parseFloat(liquidFlowRate) || 0
      };

      const resultsData = CalculatorService.calculatePressureDrop(params);

      setResults(resultsData);
      setActiveTab('results');
    } catch (error) {
      console.error('Calculation error:', error);
      if (error instanceof Error) {
        setCalculationError(error.message);
      } else {
        setCalculationError('An unknown error occurred during calculation.');
      }
      setResults(null);
    } finally {
      setIsCalculating(false);
    }
  }, [flowRate, injectionPressure, bottomholePressure, fluidDensity, fluidViscosity, segments, wellDepth, openHoleDiameter, errors]);

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || value === '-' || !isNaN(parseFloat(value))) {
      setter(value);
      setResults(null);
      setCalculationError(null);
    }
  };

  const updateSegment = (id: number, field: keyof Omit<Segment, 'id'>, value: string) => {
    const numValue = parseFloat(value);
    if (value === '' || !isNaN(numValue)) {
      setSegments(segments.map(s => 
        s.id === id ? { ...s, [field]: value === '' ? '' : numValue } : s
      ));
      setResults(null);
      setCalculationError(null);
    }
  };

  const addSegment = () => {
    const newId = segments.length > 0 ? Math.max(...segments.map(s => s.id)) + 1 : 1;
    setSegments([...segments, {
      id: newId,
      diameter: 50.7,
      length: 100,
      roughness: 0.046
    }]);
    setResults(null);
    setCalculationError(null);
  };

  const removeSegment = (id: number) => {
    if (segments.length > 1) {
      setSegments(segments.filter(s => s.id !== id));
      setResults(null);
      setCalculationError(null);
    }
  };

  const moveSegment = (id: number, direction: 'up' | 'down') => {
    const index = segments.findIndex(s => s.id === id);
    if ((direction === 'up' && index > 0) || (direction === 'down' && index < segments.length - 1)) {
      const newSegments = [...segments];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newSegments[index], newSegments[targetIndex]] = [newSegments[targetIndex], newSegments[index]];
      setSegments(newSegments);
      setResults(null);
      setCalculationError(null);
    }
  };

  const applyPreset = (preset: { id: number; name?: string }) => {
    const newId = segments.length > 0 ? Math.max(...segments.map(s => s.id)) + 1 : 1;
    setSegments([...segments, {
      id: newId,
      diameter: preset.id,
      length: 100,
      roughness: 0.046
    }]);
    setResults(null);
    setCalculationError(null);
  };

  const isCalculationDisabled = Object.keys(errors).length > 0;

  const systemHealthScore = useMemo(() => {
    if (!results) return null;
    let score = 100;
    
    if (results.maxSegmentVelocity > VELOCITY_ERROR_LIMIT) score -= 40;
    else if (results.maxSegmentVelocity > VELOCITY_WARNING_LIMIT) score -= 20;
    
    const pressureMargin = results.bottomPressure - parseFloat(bottomholePressure);
    if (pressureMargin < 0) score -= 20;
    
    if (results.maxFlowRate !== Infinity && results.actualFlowRate > results.maxFlowRate * 0.9) score -= 15;
    
    return Math.max(0, score);
  }, [results, bottomholePressure]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header results={results} systemHealthScore={systemHealthScore} />

      <Alerts
        calculationError={calculationError}
        results={results}
        errors={errors}
        openHoleLength={openHoleLength}
        totalSegmentLength={totalSegmentLength}
        wellDepthNum={wellDepthNum}
        showErosionDetails={showErosionDetails}
        setShowErosionDetails={setShowErosionDetails}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3">
            <WellSchematic 
              wellDepthNum={wellDepthNum}
              segments={segments}
              totalSegmentLength={totalSegmentLength}
              openHoleLength={openHoleLength}
              errors={errors}
              applyPreset={applyPreset}
            />
          </aside>

          <section className="lg:col-span-9">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex">
                  {[
                    { id: 'parameters', label: 'Operating Parameters', icon: <SettingsIcon className="w-4 h-4" /> },
                    { id: 'configuration', label: 'Tubing Configuration', icon: <LayersIcon className="w-4 h-4" /> },
                    { id: 'results', label: 'Analysis Results', icon: <TrendingUpIcon className="w-4 h-4" />, disabled: !results }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
                      disabled={tab.disabled}
                      className={`flex-1 px-4 py-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        activeTab === tab.id
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                          : tab.disabled
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                      {tab.id === 'results' && results && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                          New
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'parameters' && (
                  <ParametersTab
                    injectionType={injectionType}
                    setInjectionType={setInjectionType}
                    flowRate={flowRate}
                    setFlowRate={setFlowRate}
                    wellDepth={wellDepth}
                    setWellDepth={setWellDepth}
                    injectionPressure={injectionPressure}
                    setInjectionPressure={setInjectionPressure}
                    bottomholePressure={bottomholePressure}
                    setBottomholePressure={setBottomholePressure}
                    reservoirPressure={reservoirPressure}
                    setReservoirPressure={setReservoirPressure}
                    fluidDensity={fluidDensity}
                    setFluidDensity={setFluidDensity}
                    fluidViscosity={fluidViscosity}
                    setFluidViscosity={setFluidViscosity}
                    openHoleDiameter={openHoleDiameter}
                    setOpenHoleDiameter={setOpenHoleDiameter}
                    gasSpecificGravity={gasSpecificGravity}
                    setGasSpecificGravity={setGasSpecificGravity}
                    temperature={temperature}
                    setTemperature={setTemperature}
                    gasFlowRate={gasFlowRate}
                    setGasFlowRate={setGasFlowRate}
                    liquidFlowRate={liquidFlowRate}
                    setLiquidFlowRate={setLiquidFlowRate}
                    errors={errors}
                    handleInputChange={handleInputChange}
                    showAdvanced={showAdvanced}
                    setShowAdvanced={setShowAdvanced}
                    performCalculations={performCalculations}
                    isCalculationDisabled={isCalculationDisabled}
                    isCalculating={isCalculating}
                  />
                )}

                {activeTab === 'configuration' && (
                  <ConfigurationTab
                    segments={segments}
                    addSegment={addSegment}
                    updateSegment={updateSegment}
                    removeSegment={removeSegment}
                    moveSegment={moveSegment}
                    errors={errors}
                    results={results}
                  />
                )}

                {activeTab === 'results' && results && (
                  <ResultsTab
                    results={results}
                    bottomholePressure={bottomholePressure}
                    reservoirPressure={reservoirPressure}
                    setFlowRate={setFlowRate}
                    setActiveTab={setActiveTab}
                  />
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default DisposalWellCalculator;
