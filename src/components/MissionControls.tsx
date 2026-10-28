import React, { useState } from 'react';
import { 
  Battery, 
  BatteryCharging, 
  BatteryWarning, 
  Wifi, 
  WifiOff, 
  Compass, 
  ListFilter, 
  Clock, 
  MapPin, 
  Cpu, 
  CornerUpLeft,
  Activity,
  Layers
} from 'lucide-react';
import { MissionLogEntry, SystemState } from '../types/telemetry';

interface MissionControlsProps {
  systemState: SystemState;
  batteryPct: number;
  rssiDbm: number;
  totalDistanceM: number;
  missionDurationSec: number;
  missionLogs: MissionLogEntry[];
  onReturnToBase: () => void;
}

export const MissionControls: React.FC<MissionControlsProps> = ({
  systemState,
  batteryPct,
  rssiDbm,
  totalDistanceM,
  missionDurationSec,
  missionLogs,
  onReturnToBase
}) => {
  const [logFilter, setLogFilter] = useState<'ALL' | 'HAZARD' | 'ACTION' | 'COLLISION'>('ALL');

  const filteredLogs = missionLogs.filter((log) => {
    if (logFilter === 'ALL') return true;
    return log.type === logFilter;
  });

  const getBatteryIcon = () => {
    if (batteryPct <= 20) return <BatteryWarning className="w-4 h-4 text-rose-400 animate-pulse" />;
    return <Battery className="w-4 h-4 text-emerald-400" />;
  };

  const getRssiQuality = () => {
    if (rssiDbm > -65) return { label: 'EXCELLENT', color: 'text-emerald-400' };
    if (rssiDbm > -80) return { label: 'GOOD', color: 'text-cyan-400' };
    return { label: 'WEAK / MARGINAL', color: 'text-amber-400' };
  };

  const rssiInfo = getRssiQuality();

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#0b1220] border border-hazard-border rounded-lg p-3 flex flex-col h-full shadow-lg">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-hazard-border/60 text-xs">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-mono font-bold tracking-wider text-slate-100">
            MISSION TELEMETRY & EVENT AUDIT
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          LOG ENTRIES: <span className="text-cyan-300 font-bold">{missionLogs.length}</span>
        </span>
      </div>

      {/* Rover Health Gauges: Battery, Wi-Fi RSSI, Distance, Clock */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2.5 font-mono">
        {/* Battery Gauge */}
        <div className="bg-[#070b13] p-2 rounded border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>ROVER POWER</span>
            {getBatteryIcon()}
          </div>
          <div className="my-1 flex items-baseline space-x-1">
            <span className={`text-xl font-extrabold ${batteryPct <= 20 ? 'text-rose-400' : 'text-slate-100'}`}>
              {batteryPct.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                batteryPct <= 20 ? 'bg-rose-500' : batteryPct <= 40 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, batteryPct))}%` }}
            />
          </div>
        </div>

        {/* RSSI Signal */}
        <div className="bg-[#070b13] p-2 rounded border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>2.4GHz RF LINK</span>
            <Wifi className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-1 flex items-baseline space-x-1">
            <span className="text-xl font-extrabold text-slate-100">
              {rssiDbm}
            </span>
            <span className="text-[10px] text-slate-400">dBm</span>
          </div>
          <div className={`text-[10px] font-semibold ${rssiInfo.color}`}>
            LINK: {rssiInfo.label}
          </div>
        </div>

        {/* Travelled Distance */}
        <div className="bg-[#070b13] p-2 rounded border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>TRAVERSED</span>
            <MapPin className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-1 flex items-baseline space-x-1">
            <span className="text-xl font-extrabold text-cyan-300">
              {totalDistanceM.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-400">meters</span>
          </div>
          <div className="text-[10px] text-slate-400">
            ODOMETRY: INTEGRATED
          </div>
        </div>

        {/* Elapsed Mission Clock */}
        <div className="bg-[#070b13] p-2 rounded border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>DURATION</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-1 flex items-baseline space-x-1">
            <span className="text-xl font-extrabold text-amber-300">
              {formatElapsed(missionDurationSec)}
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            STATUS: {systemState}
          </div>
        </div>
      </div>

      {/* Mission Event History Log */}
      <div className="flex-1 flex flex-col min-h-[160px] max-h-[220px]">
        {/* Log Toolbar */}
        <div className="flex items-center justify-between pb-1.5 text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-1.5">
            <ListFilter className="w-3.5 h-3.5 text-cyan-400" />
            <span>EVENT TYPE:</span>
            {(['ALL', 'ACTION', 'HAZARD', 'COLLISION'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setLogFilter(filter)}
                className={`px-1.5 py-0.5 rounded text-[10px] transition ${
                  logFilter === filter
                    ? 'bg-slate-700 text-white font-bold'
                    : 'hover:text-slate-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Chronological Event Stream */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 bg-[#070b13] p-2 rounded border border-slate-800 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-[11px]">
              No mission events registered for this filter.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const getTypeBadge = () => {
                switch (log.type) {
                  case 'HAZARD':
                    return 'bg-rose-950 text-rose-300 border-rose-600';
                  case 'COLLISION':
                    return 'bg-amber-950 text-amber-300 border-amber-600';
                  case 'RETURN':
                    return 'bg-cyan-950 text-cyan-300 border-cyan-500';
                  case 'ACTION':
                  default:
                    return 'bg-slate-800 text-slate-300 border-slate-700';
                }
              };

              return (
                <div key={log.id} className="flex items-baseline space-x-2 text-[10px] py-0.5 hover:bg-slate-800/30 px-1 rounded">
                  <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                  <span className={`px-1 py-0.2 rounded border text-[9px] font-bold shrink-0 ${getTypeBadge()}`}>
                    {log.type}
                  </span>
                  <span className="text-slate-300">{log.description}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
