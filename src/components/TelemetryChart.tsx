import React, { useState, useMemo } from 'react';
import { 
  LineChart as LineChartIcon, 
  Layers, 
  Clock, 
  Eye, 
  EyeOff, 
  Info,
  Maximize2
} from 'lucide-react';
import { TelemetryPoint, ThresholdConfig } from '../types/telemetry';

interface TelemetryChartProps {
  telemetryHistory: TelemetryPoint[];
  thresholds: ThresholdConfig;
  isPaused: boolean;
}

type TimeWindow = '30s' | '1m' | '5m';

interface ActiveChannels {
  o2: boolean;
  h2s: boolean;
  co: boolean;
  temp: boolean;
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  telemetryHistory,
  thresholds,
  isPaused
}) => {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('1m');
  const [activeChannels, setActiveChannels] = useState<ActiveChannels>({
    o2: true,
    h2s: true,
    co: true,
    temp: true
  });
  const [hoveredPoint, setHoveredPoint] = useState<TelemetryPoint | null>(null);

  // Filter dataset by chosen time window
  const windowedData = useMemo(() => {
    const sampleLimit = timeWindow === '30s' ? 30 : timeWindow === '1m' ? 60 : 120;
    return telemetryHistory.slice(-sampleLimit);
  }, [telemetryHistory, timeWindow]);

  const toggleChannel = (key: keyof ActiveChannels) => {
    setActiveChannels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // SVG Chart Dimensions
  const svgWidth = 840;
  const svgHeight = 240;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // We normalize channels into a 0 - 100% relative graph height
  // Scale definitions:
  // O2: 12% to 22% -> 0 to 100
  // H2S: 0 to 25 ppm -> 0 to 100
  // CO: 0 to 60 ppm -> 0 to 100
  // Temp: 10 to 60°C -> 0 to 100

  const normalizeO2 = (val: number) => Math.max(0, Math.min(100, ((val - 12) / 10) * 100));
  const normalizeH2s = (val: number) => Math.max(0, Math.min(100, (val / 25) * 100));
  const normalizeCo = (val: number) => Math.max(0, Math.min(100, (val / 60) * 100));
  const normalizeTemp = (val: number) => Math.max(0, Math.min(100, ((val - 10) / 50) * 100));

  const getYCoordinate = (normVal: number) => {
    return padding.top + graphHeight - (normVal / 100) * graphHeight;
  };

  // Generate SVG path for a dataset
  const generatePath = (getValue: (pt: TelemetryPoint) => number) => {
    if (windowedData.length < 2) return '';
    return windowedData
      .map((pt, idx) => {
        const x = padding.left + (idx / (windowedData.length - 1)) * graphWidth;
        const y = getYCoordinate(getValue(pt));
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <div className="bg-[#0b1220] border border-hazard-border rounded-lg p-3 flex flex-col h-full shadow-lg">
      {/* Chart Header Bar */}
      <div className="flex flex-wrap items-center justify-between pb-2 border-b border-hazard-border/60 gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <LineChartIcon className="w-4 h-4 text-cyan-400" />
          <span className="font-mono font-bold tracking-wider text-slate-100">
            ATMOSPHERIC TELEMETRY STREAM
          </span>
          {isPaused && (
            <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 text-[10px] font-mono border border-amber-600">
              CHART PAUSED
            </span>
          )}
        </div>

        {/* Center: Active Channel Filter Toggles */}
        <div className="flex items-center space-x-1.5 font-mono text-[11px]">
          {/* O2 */}
          <button
            onClick={() => toggleChannel('o2')}
            className={`px-2 py-0.5 rounded border flex items-center space-x-1 transition ${
              activeChannels.o2
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 shadow-sm'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#00f0ff]"></span>
            <span>O₂ (% vol)</span>
          </button>

          {/* H2S */}
          <button
            onClick={() => toggleChannel('h2s')}
            className={`px-2 py-0.5 rounded border flex items-center space-x-1 transition ${
              activeChannels.h2s
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-sm'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
            <span>H₂S (ppm)</span>
          </button>

          {/* CO */}
          <button
            onClick={() => toggleChannel('co')}
            className={`px-2 py-0.5 rounded border flex items-center space-x-1 transition ${
              activeChannels.co
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-sm'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
            <span>CO (ppm)</span>
          </button>

          {/* Temp */}
          <button
            onClick={() => toggleChannel('temp')}
            className={`px-2 py-0.5 rounded border flex items-center space-x-1 transition ${
              activeChannels.temp
                ? 'bg-sky-950/80 text-sky-300 border-sky-500/60 shadow-sm'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#38bdf8]"></span>
            <span>TEMP (°C)</span>
          </button>
        </div>

        {/* Right: Time Window Selectors */}
        <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded border border-slate-800 font-mono text-[10px]">
          {(['30s', '1m', '5m'] as TimeWindow[]).map((win) => (
            <button
              key={win}
              onClick={() => setTimeWindow(win)}
              className={`px-2 py-0.5 rounded transition ${
                timeWindow === win
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {win.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* SVG SCADA Oscilloscope */}
      <div className="relative my-2 rounded border border-slate-800 bg-[#070b13] p-1 flex-1 overflow-hidden">
        {windowedData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-slate-500 font-mono text-xs">
            Awaiting Telemetry Packet Feed...
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto max-h-[220px] block"
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Grid Lines */}
              {[0, 25, 50, 75, 100].map((level) => {
                const y = getYCoordinate(level);
                return (
                  <g key={level}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={svgWidth - padding.right}
                      y2={y}
                      stroke="#1e293b"
                      strokeWidth="1"
                      strokeDasharray={level === 0 || level === 100 ? undefined : '2 4'}
                    />
                    <text
                      x={padding.left - 6}
                      y={y + 3}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {level}%
                    </text>
                  </g>
                );
              })}

              {/* Threshold Alarm Reference Lines */}
              {/* O2 Crit Low: 18% -> norm: ((18-12)/10)*100 = 60% */}
              {activeChannels.o2 && (
                <line
                  x1={padding.left}
                  y1={getYCoordinate(normalizeO2(thresholds.o2CritLow))}
                  x2={svgWidth - padding.right}
                  y2={getYCoordinate(normalizeO2(thresholds.o2CritLow))}
                  stroke="#ef4444"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
              )}
              {/* H2S Warn High: 5ppm -> norm: (5/25)*100 = 20% */}
              {activeChannels.h2s && (
                <line
                  x1={padding.left}
                  y1={getYCoordinate(normalizeH2s(thresholds.h2sWarnHigh))}
                  x2={svgWidth - padding.right}
                  y2={getYCoordinate(normalizeH2s(thresholds.h2sWarnHigh))}
                  stroke="#f59e0b"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.6"
                />
              )}

              {/* Channel Lines */}
              {activeChannels.temp && (
                <path
                  d={generatePath((pt) => normalizeTemp(pt.temperatureC))}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  opacity="0.8"
                />
              )}

              {activeChannels.co && (
                <path
                  d={generatePath((pt) => normalizeCo(pt.coPpm))}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  opacity="0.85"
                />
              )}

              {activeChannels.h2s && (
                <path
                  d={generatePath((pt) => normalizeH2s(pt.h2sPpm))}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.2"
                  className="drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]"
                />
              )}

              {activeChannels.o2 && (
                <path
                  d={generatePath((pt) => normalizeO2(pt.oxygenPct))}
                  fill="none"
                  stroke="#00f0ff"
                  strokeWidth="2.5"
                  className="drop-shadow-[0_0_6px_rgba(0,240,255,0.6)]"
                />
              )}

              {/* Time stamps along X-axis */}
              {windowedData.length > 0 && (
                <>
                  <text
                    x={padding.left}
                    y={svgHeight - 10}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {windowedData[0].timeLabel}
                  </text>
                  <text
                    x={svgWidth / 2}
                    y={svgHeight - 10}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    WINDOW: {timeWindow}
                  </text>
                  <text
                    x={svgWidth - padding.right}
                    y={svgHeight - 10}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {windowedData[windowedData.length - 1].timeLabel}
                  </text>
                </>
              )}

              {/* Interactive Hover Hit Zones */}
              {windowedData.map((pt, idx) => {
                const x = padding.left + (idx / (windowedData.length - 1)) * graphWidth;
                return (
                  <rect
                    key={idx}
                    x={x - 4}
                    y={padding.top}
                    width={8}
                    height={graphHeight}
                    fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHoveredPoint(pt)}
                  />
                );
              })}

              {/* Hover Crosshair vertical bar */}
              {hoveredPoint && (
                (() => {
                  const idx = windowedData.findIndex((p) => p.timestamp === hoveredPoint.timestamp);
                  if (idx === -1) return null;
                  const x = padding.left + (idx / (windowedData.length - 1)) * graphWidth;
                  return (
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={padding.top + graphHeight}
                      stroke="#00f0ff"
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                    />
                  );
                })()
              )}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div className="absolute top-2 right-3 bg-slate-900/95 backdrop-blur border border-cyan-500/50 p-2 rounded shadow-xl font-mono text-[10px] space-y-1 pointer-events-none z-10">
                <div className="text-cyan-300 font-bold border-b border-slate-700 pb-0.5">
                  TIME: {hoveredPoint.timeLabel}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-slate-300">
                  <div>O₂: <span className="text-cyan-400 font-bold">{hoveredPoint.oxygenPct}%</span></div>
                  <div>H₂S: <span className="text-rose-400 font-bold">{hoveredPoint.h2sPpm} ppm</span></div>
                  <div>CO: <span className="text-amber-400 font-bold">{hoveredPoint.coPpm} ppm</span></div>
                  <div>TEMP: <span className="text-sky-400 font-bold">{hoveredPoint.temperatureC}°C</span></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart Legend / Safety Reference Note */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-hazard-border/60">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-red-500 inline-block border-b border-red-500"></span>
            Critical Threshold Guideline
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-amber-500 inline-block border-b border-amber-500"></span>
            Warning Threshold Guideline
          </span>
        </div>
        <div className="text-slate-500 italic">
          Rolling bounded buffer: max 120 samples (1 Hz sample rate)
        </div>
      </div>
    </div>
  );
};
