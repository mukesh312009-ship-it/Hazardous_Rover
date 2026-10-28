import React from 'react';
import { 
  Wind, 
  Biohazard, 
  Flame, 
  Thermometer, 
  Droplets, 
  Waves, 
  Radar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle,
  AlertTriangle,
  AlertOctagon
} from 'lucide-react';
import { SensorReadings, ThresholdConfig, AlertSeverity } from '../types/telemetry';
import { SENSOR_METADATA } from '../constants/initialState';

interface SensorCardsGridProps {
  readings: SensorReadings;
  thresholds: ThresholdConfig;
  history: SensorReadings[];
}

export const SensorCardsGrid: React.FC<SensorCardsGridProps> = ({
  readings,
  thresholds,
  history
}) => {
  // Evaluates severity for each channel
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

  // Sparkline renderer from recent 12 history points
  const renderMicroSparkline = (data: number[], color: string) => {
    if (data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const h = 22;
    const w = 55;

    const points = data
      .slice(-12)
      .map((val, idx, arr) => {
        const x = (idx / (arr.length - 1)) * w;
        const y = h - ((val - min) / range) * (h - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return (
      <svg width={w} height={h} className="overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  // Calculate trend direction
  const getTrend = (current: number, field: keyof SensorReadings) => {
    if (history.length < 3) return <Minus className="w-3.5 h-3.5 text-slate-500" />;
    const past = history[Math.max(0, history.length - 3)][field] as number;
    const diff = current - past;
    if (Math.abs(diff) < 0.05) return <Minus className="w-3.5 h-3.5 text-slate-500" />;
    if (diff > 0) return <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />;
    return <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />;
  };

  // Card definition list
  const cards = [
    {
      id: 'o2',
      name: 'Oxygen Concentration',
      formula: 'O₂',
      value: readings.oxygenPct.toFixed(1),
      unit: '% vol',
      severity: evaluateO2Severity(readings.oxygenPct),
      icon: Wind,
      color: '#00f0ff',
      trend: getTrend(readings.oxygenPct, 'oxygenPct'),
      history: history.map((h) => h.oxygenPct),
      meta: SENSOR_METADATA.OXYGEN,
      thresholdNote: `< ${thresholds.o2WarnLow}% Warn | < ${thresholds.o2CritLow}% Crit`
    },
    {
      id: 'h2s',
      name: 'Hydrogen Sulfide Gas',
      formula: 'H₂S',
      value: readings.h2sPpm.toFixed(1),
      unit: 'ppm',
      severity: evaluateH2sSeverity(readings.h2sPpm),
      icon: Biohazard,
      color: '#ef4444',
      trend: getTrend(readings.h2sPpm, 'h2sPpm'),
      history: history.map((h) => h.h2sPpm),
      meta: SENSOR_METADATA.H2S,
      thresholdNote: `≥ ${thresholds.h2sWarnHigh} Warn | ≥ ${thresholds.h2sCritHigh} Crit`
    },
    {
      id: 'co',
      name: 'Carbon Monoxide Gas',
      formula: 'CO',
      value: readings.coPpm.toFixed(1),
      unit: 'ppm',
      severity: evaluateCoSeverity(readings.coPpm),
      icon: Flame,
      color: '#f59e0b',
      trend: getTrend(readings.coPpm, 'coPpm'),
      history: history.map((h) => h.coPpm),
      meta: SENSOR_METADATA.CO,
      thresholdNote: `≥ ${thresholds.coWarnHigh} Warn | ≥ ${thresholds.coCritHigh} Crit`
    },
    {
      id: 'temp',
      name: 'Ambient Temperature',
      formula: 'TEMP',
      value: readings.temperatureC.toFixed(1),
      unit: '°C',
      severity: evaluateTempSeverity(readings.temperatureC),
      icon: Thermometer,
      color: '#38bdf8',
      trend: getTrend(readings.temperatureC, 'temperatureC'),
      history: history.map((h) => h.temperatureC),
      meta: SENSOR_METADATA.TEMPERATURE,
      thresholdNote: `≥ ${thresholds.tempWarnHigh}°C Warn | ≥ ${thresholds.tempCritHigh}°C Crit`
    },
    {
      id: 'humidity',
      name: 'Relative Humidity',
      formula: '% RH',
      value: readings.humidityRh.toFixed(1),
      unit: '% RH',
      severity: 'NORMAL' as AlertSeverity,
      icon: Droplets,
      color: '#60a5fa',
      trend: getTrend(readings.humidityRh, 'humidityRh'),
      history: history.map((h) => h.humidityRh),
      meta: SENSOR_METADATA.HUMIDITY,
      thresholdNote: 'Nominal Sewer Dew Point: 45 - 75%'
    },
    {
      id: 'water',
      name: 'Sump Water Ingress',
      formula: 'H₂O',
      value: readings.waterDetected ? 'DETECTED' : 'DRY',
      unit: '',
      severity: evaluateWaterSeverity(readings.waterDetected),
      icon: Waves,
      color: readings.waterDetected ? '#00f0ff' : '#64748b',
      trend: null,
      history: [],
      meta: SENSOR_METADATA.WATER,
      thresholdNote: 'Triggered upon liquid contact'
    },
    {
      id: 'obstacle',
      name: 'Ultrasonic Obstacle Dist.',
      formula: 'RANGE',
      value: readings.obstacleDistanceCm.toString(),
      unit: 'cm',
      severity: evaluateObstacleSeverity(readings.obstacleDistanceCm),
      icon: Radar,
      color: '#c084fc',
      trend: getTrend(readings.obstacleDistanceCm, 'obstacleDistanceCm'),
      history: history.map((h) => h.obstacleDistanceCm),
      meta: SENSOR_METADATA.OBSTACLE,
      thresholdNote: `≤ ${thresholds.obstacleWarnDistCm} cm Proximity Warning`
    }
  ];

  const getSeverityBadge = (sev: AlertSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return {
          cardBg: 'border-rose-500 bg-rose-950/20 shadow-lg shadow-rose-950/30',
          badge: 'bg-rose-950/90 text-rose-300 border-rose-500/80 animate-pulse',
          icon: AlertOctagon,
          text: 'CRITICAL'
        };
      case 'WARNING':
        return {
          cardBg: 'border-amber-500/80 bg-amber-950/20 shadow-md shadow-amber-950/20',
          badge: 'bg-amber-950/90 text-amber-300 border-amber-500/60',
          icon: AlertTriangle,
          text: 'WARNING'
        };
      case 'NORMAL':
      default:
        return {
          cardBg: 'border-slate-800 bg-[#0d1527]/90 hover:border-slate-700',
          badge: 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30',
          icon: CheckCircle,
          text: 'NORMAL'
        };
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-2.5">
      {cards.map((card) => {
        const sevStyle = getSeverityBadge(card.severity);
        const IconComp = card.icon;
        const StatusIcon = sevStyle.icon;

        return (
          <div
            key={card.id}
            className={`border rounded-lg p-2.5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${sevStyle.cardBg}`}
          >
            {/* Top row: Label + Simulation Tag + Status Badge */}
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800/90 text-cyan-300 border border-slate-700">
                  SIMULATED
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border flex items-center gap-1 ${sevStyle.badge}`}
                >
                  <StatusIcon className="w-2.5 h-2.5" />
                  <span>{sevStyle.text}</span>
                </span>
              </div>

              {/* Channel title & formula */}
              <div className="flex items-center space-x-1.5 mt-1">
                <IconComp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <h4 className="text-[11px] font-mono font-semibold text-slate-300 truncate" title={card.name}>
                  {card.name}
                </h4>
              </div>
            </div>

            {/* Middle: Prominent Reading Value */}
            <div className="my-2 flex items-baseline justify-between">
              <div className="flex items-baseline space-x-1">
                <span className={`text-2xl font-extrabold font-mono tracking-tight ${
                  card.severity === 'CRITICAL' 
                    ? 'text-rose-400' 
                    : card.severity === 'WARNING' 
                    ? 'text-amber-400' 
                    : 'text-slate-100'
                }`}>
                  {card.value}
                </span>
                {card.unit && (
                  <span className="text-[11px] font-mono text-slate-400">
                    {card.unit}
                  </span>
                )}
              </div>

              {/* Sparkline & Trend */}
              <div className="flex items-center space-x-1">
                {card.history.length > 0 && renderMicroSparkline(card.history, card.color)}
                {card.trend}
              </div>
            </div>

            {/* Bottom: Hardware provenance & Threshold note */}
            <div className="pt-1.5 border-t border-slate-800/80 text-[9px] font-mono space-y-0.5">
              <p className="text-slate-400 truncate" title={card.meta.proposedHardware}>
                <span className="text-slate-500">HW:</span> {card.meta.proposedHardware.split(' ')[0]} {card.meta.proposedHardware.split(' ')[1] || ''}
              </p>
              <p className="text-slate-500 truncate" title={card.thresholdNote}>
                {card.thresholdNote}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
