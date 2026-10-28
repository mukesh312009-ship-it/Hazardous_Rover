import React from 'react';
import { Table, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { SensorReadings, ThresholdConfig, AlertSeverity } from '../types/telemetry';
import { SENSOR_METADATA } from '../constants/initialState';

interface SensorSummaryTableProps {
  readings: SensorReadings;
  thresholds: ThresholdConfig;
  lastUpdate: string;
}

export const SensorSummaryTable: React.FC<SensorSummaryTableProps> = ({
  readings,
  thresholds,
  lastUpdate
}) => {
  const evaluateO2Severity = (val: number): AlertSeverity => {
    if (val <= thresholds.o2CritLow) return 'CRITICAL';
    if (val <= thresholds.o2WarnLow) return 'WARNING';
    return 'NORMAL';
  };

  const evaluateH2sSeverity = (val: number): AlertSeverity => {
    if (val >= thresholds.h2sCritHigh) return 'CRITICAL';
    if (val >= thresholds.h2sWarnHigh) return 'WARNING';
    return 'NORMAL';
  };

  const evaluateCoSeverity = (val: number): AlertSeverity => {
    if (val >= thresholds.coCritHigh) return 'CRITICAL';
    if (val >= thresholds.coWarnHigh) return 'WARNING';
    return 'NORMAL';
  };

  const evaluateTempSeverity = (val: number): AlertSeverity => {
    if (val >= thresholds.tempCritHigh) return 'CRITICAL';
    if (val >= thresholds.tempWarnHigh) return 'WARNING';
    return 'NORMAL';
  };

  const evaluateWaterSeverity = (detected: boolean): AlertSeverity => {
    return detected ? 'WARNING' : 'NORMAL';
  };

  const evaluateObstacleSeverity = (distCm: number): AlertSeverity => {
    if (distCm <= 12) return 'CRITICAL';
    if (distCm <= thresholds.obstacleWarnDistCm) return 'WARNING';
    return 'NORMAL';
  };

  const rows = [
    {
      channel: SENSOR_METADATA.OXYGEN.channel,
      reading: readings.oxygenPct.toFixed(1),
      unit: '% vol',
      safeRange: `≥ ${thresholds.o2WarnLow}%`,
      severity: evaluateO2Severity(readings.oxygenPct),
      hardware: SENSOR_METADATA.OXYGEN.proposedHardware
    },
    {
      channel: SENSOR_METADATA.H2S.channel,
      reading: readings.h2sPpm.toFixed(1),
      unit: 'ppm',
      safeRange: `< ${thresholds.h2sWarnHigh} ppm`,
      severity: evaluateH2sSeverity(readings.h2sPpm),
      hardware: SENSOR_METADATA.H2S.proposedHardware
    },
    {
      channel: SENSOR_METADATA.CO.channel,
      reading: readings.coPpm.toFixed(1),
      unit: 'ppm',
      safeRange: `< ${thresholds.coWarnHigh} ppm`,
      severity: evaluateCoSeverity(readings.coPpm),
      hardware: SENSOR_METADATA.CO.proposedHardware
    },
    {
      channel: SENSOR_METADATA.TEMPERATURE.channel,
      reading: readings.temperatureC.toFixed(1),
      unit: '°C',
      safeRange: `< ${thresholds.tempWarnHigh}°C`,
      severity: evaluateTempSeverity(readings.temperatureC),
      hardware: SENSOR_METADATA.TEMPERATURE.proposedHardware
    },
    {
      channel: SENSOR_METADATA.HUMIDITY.channel,
      reading: readings.humidityRh.toFixed(1),
      unit: '% RH',
      safeRange: '45 - 75%',
      severity: 'NORMAL' as AlertSeverity,
      hardware: SENSOR_METADATA.HUMIDITY.proposedHardware
    },
    {
      channel: SENSOR_METADATA.WATER.channel,
      reading: readings.waterDetected ? 'DETECTED' : 'DRY',
      unit: 'Binary',
      safeRange: 'DRY',
      severity: evaluateWaterSeverity(readings.waterDetected),
      hardware: SENSOR_METADATA.WATER.proposedHardware
    },
    {
      channel: SENSOR_METADATA.OBSTACLE.channel,
      reading: readings.obstacleDistanceCm.toString(),
      unit: 'cm',
      safeRange: `> ${thresholds.obstacleWarnDistCm} cm`,
      severity: evaluateObstacleSeverity(readings.obstacleDistanceCm),
      hardware: SENSOR_METADATA.OBSTACLE.proposedHardware
    }
  ];

  const getStatusBadge = (sev: AlertSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/90 text-rose-300 border border-rose-500 flex items-center gap-1 w-max">
            <AlertOctagon className="w-3 h-3 text-rose-400" />
            CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-500 flex items-center gap-1 w-max">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            WARNING
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 w-max">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            NOMINAL
          </span>
        );
    }
  };

  return (
    <div className="bg-[#0b1220] border border-hazard-border rounded-lg p-3 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between pb-2 border-b border-hazard-border/60 text-xs">
        <div className="flex items-center space-x-2">
          <Table className="w-4 h-4 text-cyan-400" />
          <span className="font-mono font-bold tracking-wider text-slate-100">
            CHANNEL TELEMETRY AUDIT MATRIX
          </span>
        </div>
        <div className="text-[10px] font-mono text-slate-400">
          LAST REFRESH: <span className="text-cyan-300 font-bold">{lastUpdate || 'SYNCING'}</span>
        </div>
      </div>

      <div className="overflow-x-auto my-2">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider bg-slate-900/40">
              <th className="py-2 px-2.5">Channel / Measure</th>
              <th className="py-2 px-2.5">Current Value</th>
              <th className="py-2 px-2.5">Safe Boundary</th>
              <th className="py-2 px-2.5">Audit Status</th>
              <th className="py-2 px-2.5">Proposed Physical Sensor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.map((r, idx) => (
              <tr key={idx} className="hover:bg-slate-800/40 transition">
                <td className="py-1.5 px-2.5 font-semibold text-slate-200">
                  {r.channel}
                </td>
                <td className="py-1.5 px-2.5 font-bold">
                  <span className={
                    r.severity === 'CRITICAL' 
                      ? 'text-rose-400' 
                      : r.severity === 'WARNING' 
                      ? 'text-amber-400' 
                      : 'text-slate-100'
                  }>
                    {r.reading} {r.unit}
                  </span>
                </td>
                <td className="py-1.5 px-2.5 text-slate-400 text-[11px]">
                  {r.safeRange}
                </td>
                <td className="py-1.5 px-2.5">
                  {getStatusBadge(r.severity)}
                </td>
                <td className="py-1.5 px-2.5 text-slate-400 text-[10px] truncate max-w-[200px]" title={r.hardware}>
                  {r.hardware}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-[9px] font-mono text-slate-500 pt-1 border-t border-hazard-border/60 flex items-center justify-between">
        <span>Calibration status: Factory Virtual Baseline</span>
        <span>Demarcation: Demo Only - Not OSHA/NIOSH Validated</span>
      </div>
    </div>
  );
};
