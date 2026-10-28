import React, { useState } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle, 
  RotateCcw, 
  Check, 
  Trash2, 
  Filter, 
  ShieldCheck, 
  SlidersHorizontal,
  Flame,
  Wind,
  Droplets,
  Thermometer,
  Zap
} from 'lucide-react';
import { AlertEvent, ScenarioType, ThresholdConfig } from '../types/telemetry';
import { audioService } from '../services/audioService';

interface HazardAlertCenterProps {
  alerts: AlertEvent[];
  scenario: ScenarioType;
  setScenario: (scen: ScenarioType) => void;
  onAcknowledgeAlert: (id: string) => void;
  onClearActiveAlerts: () => void;
  hasActiveHazards: boolean;
  thresholds: ThresholdConfig;
}

export const HazardAlertCenter: React.FC<HazardAlertCenterProps> = ({
  alerts,
  scenario,
  setScenario,
  onAcknowledgeAlert,
  onClearActiveAlerts,
  hasActiveHazards,
  thresholds
}) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'WARNING' | 'CRITICAL'>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter === 'ALL') return true;
    return a.severity === severityFilter;
  });

  const handleScenarioChange = (newScen: ScenarioType) => {
    audioService.playClick();
    setScenario(newScen);
  };

  return (
    <div className="bg-[#0b1220] border border-hazard-border rounded-lg p-3 flex flex-col h-full shadow-lg">
      {/* Top Header: Title & Scenario Label */}
      <div className="flex items-center justify-between pb-2 border-b border-hazard-border/60 text-xs">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <span className="font-mono font-bold tracking-wider text-slate-100">
            HAZARD INTERLOCK & ALERT CENTER
          </span>
        </div>
        <div className="flex items-center space-x-2 font-mono text-[10px]">
          <span className="text-slate-400">ACTIVE SCENARIO:</span>
          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/50">
            {scenario.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Prominent Safety Semantics Banner */}
      <div className="my-2.5">
        {hasActiveHazards ? (
          <div className="p-3 rounded-md bg-rose-950/80 border-2 border-rose-600 shadow-lg shadow-rose-950/50 flex items-start space-x-3 animate-alarmFlash">
            <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
            <div className="space-y-0.5">
              <h3 className="text-sm font-extrabold font-mono text-rose-200 tracking-wide uppercase">
                HAZARD INDICATED — HUMAN ENTRY NOT AUTHORIZED BY THIS SIMULATION
              </h3>
              <p className="text-xs text-rose-300/90 font-mono">
                Atmospheric conditions or physical obstacles exceed configured safety margins. Confined space entry is strictly prohibited.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-md bg-slate-900/90 border border-emerald-500/50 flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold font-mono text-emerald-400 tracking-wide uppercase">
                NO CONFIGURED THRESHOLDS EXCEEDED
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Sensors are currently within simulated nominal limits. Notice: Does not certify space as safe for human occupancy without certified physical instrumentation.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Demo Scenario Selector Matrix */}
      <div className="mb-2 p-2 rounded bg-[#070b13] border border-slate-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono text-slate-400 font-bold tracking-wider flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
            INJECT DEMO HAZARD SCENARIO (TEST ENGINE)
          </span>
          <button
            onClick={() => handleScenarioChange('NORMAL')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center space-x-1 transition border ${
              scenario === 'NORMAL'
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-slate-800 text-emerald-400 border-emerald-500/40 hover:bg-slate-700'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>RESTORE NORMAL SCENARIO</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-xs">
          <button
            onClick={() => handleScenarioChange('LOW_OXYGEN')}
            className={`p-1.5 rounded border text-left flex items-center space-x-2 transition ${
              scenario === 'LOW_OXYGEN'
                ? 'bg-rose-950/90 text-rose-300 border-rose-500'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div>
              <div className="font-bold text-[11px]">LOW OXYGEN</div>
              <div className="text-[9px] text-slate-400">O2 drops below 18%</div>
            </div>
          </button>

          <button
            onClick={() => handleScenarioChange('GAS_LEAK')}
            className={`p-1.5 rounded border text-left flex items-center space-x-2 transition ${
              scenario === 'GAS_LEAK'
                ? 'bg-rose-950/90 text-rose-300 border-rose-500'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <div>
              <div className="font-bold text-[11px]">TOXIC GAS LEAK</div>
              <div className="text-[9px] text-slate-400">H2S &gt; 15 ppm, CO spike</div>
            </div>
          </button>

          <button
            onClick={() => handleScenarioChange('HIGH_TEMP')}
            className={`p-1.5 rounded border text-left flex items-center space-x-2 transition ${
              scenario === 'HIGH_TEMP'
                ? 'bg-amber-950/90 text-amber-300 border-amber-500'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-[11px]">HIGH HEAT</div>
              <div className="text-[9px] text-slate-400">Thermal duct &gt; 50°C</div>
            </div>
          </button>

          <button
            onClick={() => handleScenarioChange('WATER_INTRUSION')}
            className={`p-1.5 rounded border text-left flex items-center space-x-2 transition ${
              scenario === 'WATER_INTRUSION'
                ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div>
              <div className="font-bold text-[11px]">WATER INGRESS</div>
              <div className="text-[9px] text-slate-400">Submerged sump detected</div>
            </div>
          </button>

          <button
            onClick={() => handleScenarioChange('MULTIPLE_HAZARDS')}
            className={`p-1.5 rounded border text-left flex items-center space-x-2 transition col-span-2 sm:col-span-1 ${
              scenario === 'MULTIPLE_HAZARDS'
                ? 'bg-purple-950/90 text-purple-300 border-purple-500'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <div>
              <div className="font-bold text-[11px]">MULTIPLE HAZARDS</div>
              <div className="text-[9px] text-slate-400">Low O2 + H2S + Water</div>
            </div>
          </button>
        </div>
      </div>

      {/* Alert Log Toolbar: Severity Filter + Clear Controls */}
      <div className="flex items-center justify-between pb-1.5 text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-1.5">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>FILTER:</span>
          {(['ALL', 'WARNING', 'CRITICAL'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSeverityFilter(lvl)}
              className={`px-1.5 py-0.5 rounded text-[10px] transition ${
                severityFilter === lvl
                  ? 'bg-slate-700 text-white font-bold'
                  : 'hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <button
          onClick={onClearActiveAlerts}
          className="flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          title="Dismiss acknowledged alerts from active view (keeps mission history)"
        >
          <Trash2 className="w-3 h-3 text-slate-400" />
          <span>CLEAR ALARMS</span>
        </button>
      </div>

      {/* Alert Event Feed */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[160px] min-h-[120px]">
        {filteredAlerts.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
            No active alert dispatches recorded.
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-2 rounded border font-mono text-xs flex items-start justify-between gap-2 transition ${
                alert.severity === 'CRITICAL'
                  ? 'bg-rose-950/30 border-rose-500/70 text-rose-200'
                  : 'bg-amber-950/30 border-amber-500/70 text-amber-200'
              }`}
            >
              <div className="flex items-start space-x-2">
                {alert.severity === 'CRITICAL' ? (
                  <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-[11px] text-white">
                      [{alert.channel}] {alert.message}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      ({alert.valueString})
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center space-x-2 mt-0.5">
                    <span>{alert.timestamp}</span>
                    {alert.acknowledged && (
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Acknowledged ({alert.ackTimestamp})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!alert.acknowledged && (
                <button
                  onClick={() => {
                    audioService.playClick();
                    onAcknowledgeAlert(alert.id);
                  }}
                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 shrink-0 transition"
                >
                  ACK
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Safety Standard Disclaimer Footer */}
      <div className="mt-2 pt-1.5 border-t border-hazard-border/60 text-[9px] font-mono text-slate-500 flex items-center justify-between">
        <span>Regulatory: Illustrative demo thresholds (DEMO ONLY)</span>
        <span>OSHA 1910.146 Confined Space Standard Reference</span>
      </div>
    </div>
  );
};
