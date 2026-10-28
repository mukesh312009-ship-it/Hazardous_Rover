import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  RotateCcw, 
  Check, 
  Volume2, 
  Activity, 
  Gauge, 
  Sliders,
  Save,
  CheckCircle2
} from 'lucide-react';
import { ThresholdConfig } from '../types/telemetry';
import { DEFAULT_THRESHOLDS } from '../constants/initialState';
import { audioService } from '../services/audioService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  thresholds: ThresholdConfig;
  setThresholds: React.Dispatch<React.SetStateAction<ThresholdConfig>>;
  simSpeed: number;
  setSimSpeed: (speed: number) => void;
  noiseEnabled: boolean;
  setNoiseEnabled: (enabled: boolean) => void;
  onResetDefaults: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  thresholds,
  setThresholds,
  simSpeed,
  setSimSpeed,
  noiseEnabled,
  setNoiseEnabled,
  onResetDefaults
}) => {
  const [tempThresholds, setTempThresholds] = useState<ThresholdConfig>(thresholds);
  const [saveFeedback, setSaveFeedback] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleChange = (field: keyof ThresholdConfig, value: number) => {
    setTempThresholds((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    audioService.playClick();
    setThresholds(tempThresholds);
    try {
      localStorage.setItem('hazardscout_thresholds', JSON.stringify(tempThresholds));
      localStorage.setItem('hazardscout_speed', simSpeed.toString());
      localStorage.setItem('hazardscout_noise', noiseEnabled.toString());
    } catch {}
    setSaveFeedback(true);
    setTimeout(() => {
      setSaveFeedback(false);
      onClose();
    }, 900);
  };

  const handleReset = () => {
    audioService.playClick();
    setTempThresholds(DEFAULT_THRESHOLDS);
    onResetDefaults();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0b1220] border border-cyan-500/40 rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0e1626] border-b border-hazard-border">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100 tracking-wider">
              SIMULATION & THRESHOLD CALIBRATION
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* Section 1: Simulation Engine Settings */}
          <div className="space-y-3 pb-3 border-b border-slate-800">
            <h3 className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-cyan-400" />
              SIMULATION ENGINE SETTINGS
            </h3>

            {/* Sim Speed */}
            <div className="flex items-center justify-between">
              <div>
                <label className="font-semibold text-slate-200">Simulation Clock Multiplier</label>
                <p className="text-[10px] text-slate-400 font-sans">Tick rate for telemetry generation</p>
              </div>
              <div className="flex space-x-1">
                {[1, 2, 5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setSimSpeed(speed)}
                    className={`px-3 py-1 rounded border text-xs font-bold transition ${
                      simSpeed === speed
                        ? 'bg-cyan-600 text-white border-cyan-400'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Gaussian Noise Toggle */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <label className="font-semibold text-slate-200">Synthetic Sensor Noise</label>
                <p className="text-[10px] text-slate-400 font-sans">Simulate ADC jitter and natural gas turbulence</p>
              </div>
              <button
                onClick={() => setNoiseEnabled(!noiseEnabled)}
                className={`px-3 py-1 rounded border text-xs font-bold transition ${
                  noiseEnabled
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-slate-900 text-slate-500 border-slate-700'
                }`}
              >
                {noiseEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </div>

          {/* Section 2: Configurable Thresholds */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-cyan-400" />
                ILLUSTRATIVE DEMO THRESHOLDS (DEMO ONLY)
              </h3>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600">
                USER CONFIGURABLE
              </span>
            </div>

            <p className="text-[10px] text-slate-400 font-sans">
              Alter warning and critical trigger points to test the threshold evaluation engine in real time.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* O2 Warnings */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">O2 Warning Low (% vol)</label>
                <input
                  type="number"
                  step="0.1"
                  value={tempThresholds.o2WarnLow}
                  onChange={(e) => handleChange('o2WarnLow', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#070b13] border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* O2 Critical */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">O2 Critical Low (% vol)</label>
                <input
                  type="number"
                  step="0.1"
                  value={tempThresholds.o2CritLow}
                  onChange={(e) => handleChange('o2CritLow', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#070b13] border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* H2S Warn */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">H2S Warning High (ppm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={tempThresholds.h2sWarnHigh}
                  onChange={(e) => handleChange('h2sWarnHigh', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#070b13] border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* H2S Crit */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">H2S Critical High (ppm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={tempThresholds.h2sCritHigh}
                  onChange={(e) => handleChange('h2sCritHigh', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#070b13] border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* CO Warn */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">CO Warning High (ppm)</label>
                <input
                  type="number"
                  step="1"
                  value={tempThresholds.coWarnHigh}
                  onChange={(e) => handleChange('coWarnHigh', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#070b13] border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* CO Crit */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">CO Critical High (ppm)</label>
                <input
                  type="number"
                  step="1"
                  value={tempThresholds.coCritHigh}
                  onChange={(e) => handleChange('coCritHigh', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#070b13] border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Temp Warn */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">Temp Warning High (°C)</label>
                <input
                  type="number"
                  step="1"
                  value={tempThresholds.tempWarnHigh}
                  onChange={(e) => handleChange('tempWarnHigh', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#070b13] border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Obstacle Dist Warn */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">Obstacle Distance (cm)</label>
                <input
                  type="number"
                  step="1"
                  value={tempThresholds.obstacleWarnDistCm}
                  onChange={(e) => handleChange('obstacleWarnDistCm', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#070b13] border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#0e1626] border-t border-hazard-border flex items-center justify-between text-xs">
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET DEFAULTS</span>
          </button>

          <div className="flex items-center space-x-2">
            {saveFeedback && (
              <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved to LocalStorage
              </span>
            )}
            <button
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow-md"
            >
              <Save className="w-3.5 h-3.5" />
              <span>APPLY SETTINGS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
