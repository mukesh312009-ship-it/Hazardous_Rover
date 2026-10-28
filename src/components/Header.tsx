import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Clock, 
  Volume2, 
  VolumeX, 
  Cpu, 
  Settings, 
  PlayCircle, 
  FileText,
  Radio
} from 'lucide-react';
import { SystemState } from '../types/telemetry';
import { audioService } from '../services/audioService';

interface HeaderProps {
  systemState: SystemState;
  missionDurationSec: number;
  onOpenArchitecture: () => void;
  onOpenSettings: () => void;
  onStartDemoTour: () => void;
  onOpenSummary: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  systemState,
  missionDurationSec,
  onOpenArchitecture,
  onOpenSettings,
  onStartDemoTour,
  onOpenSummary
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioService.setMuted(nextMuted);
    if (!nextMuted) {
      audioService.playClick();
    }
  };

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // State badge styling
  const getStateBadge = () => {
    switch (systemState) {
      case 'SCANNING':
        return {
          bg: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50',
          dot: 'bg-emerald-400 animate-pulse',
          label: 'MISSION ACTIVE / SCANNING'
        };
      case 'HAZARD_DETECTED':
        return {
          bg: 'bg-rose-950/90 text-rose-300 border-rose-500 animate-alarmFlash',
          dot: 'bg-rose-500 animate-ping',
          label: 'CRITICAL HAZARD DETECTED'
        };
      case 'RETURNING':
        return {
          bg: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
          dot: 'bg-amber-400 animate-ping',
          label: 'RETURNING TO BASE (RTH)'
        };
      case 'PAUSED':
        return {
          bg: 'bg-slate-800 text-slate-300 border-slate-600',
          dot: 'bg-slate-400',
          label: 'MISSION PAUSED'
        };
      case 'IDLE':
      default:
        return {
          bg: 'bg-blue-950/60 text-blue-300 border-blue-500/40',
          dot: 'bg-blue-400',
          label: 'SYSTEM STANDBY / IDLE'
        };
    }
  };

  const stateStyle = getStateBadge();

  return (
    <header className="border-b border-hazard-border bg-[#0b111e]/95 backdrop-blur sticky top-0 z-40 px-4 py-2.5 shadow-md">
      <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand & Tagline */}
        <div className="flex items-center space-x-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-lg bg-gradient-to-br from-cyan-950 to-blue-900 border border-cyan-500/40 shadow-inner">
            <ShieldAlert className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.7)]" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold tracking-wider text-slate-100 font-mono flex items-center gap-1.5">
                HAZARD<span className="text-cyan-400">SCOUT</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono tracking-widest font-bold uppercase rounded bg-cyan-950/90 text-cyan-300 border border-cyan-500/40">
                PROTOTYPE v1.2
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Confined-Space Safety & Environmental Inspection Rover
            </p>
          </div>
        </div>

        {/* Center: Prominent Simulation Badge & State Telemetry */}
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-4">
          {/* Simulation Online status */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-slate-900/90 border border-slate-700 text-xs font-mono">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-slate-400">FEED:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              SIMULATION ONLINE
            </span>
          </div>

          {/* Prominent Software Simulation Notice */}
          <div className="px-3 py-1.5 rounded-md bg-amber-950/40 border border-amber-500/40 text-[11px] font-mono font-medium text-amber-300 flex items-center gap-1.5 shadow-sm">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>SYNTHETIC SENSOR DATA</span>
          </div>

          {/* System State Badge */}
          <div className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md border text-xs font-mono font-bold tracking-wider ${stateStyle.bg}`}>
            <span className={`w-2 h-2 rounded-full ${stateStyle.dot}`}></span>
            <span>{stateStyle.label}</span>
          </div>
        </div>

        {/* Right: Mission Time & Quick Actions */}
        <div className="flex items-center space-x-2.5">
          {/* Mission clock */}
          <div className="hidden lg:flex items-center space-x-3 px-3 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-xs font-mono">
            <div className="flex items-center space-x-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">MISSION:</span>
              <span className="text-cyan-300 font-bold">{formatElapsed(missionDurationSec)}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="text-slate-400">
              <span className="text-slate-300">{currentTime}</span> UTC
            </div>
          </div>

          {/* Judge Demo Presentation Tour Button */}
          <button
            onClick={() => {
              audioService.playClick();
              onStartDemoTour();
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold shadow-md shadow-cyan-900/40 border border-cyan-400/40 transition-all hover:scale-[1.02]"
            title="Start Guided 60-Second Hackathon Judge Presentation Tour"
          >
            <PlayCircle className="w-3.5 h-3.5 text-cyan-200" />
            <span>JUDGE DEMO</span>
          </button>

          {/* Mission Summary / Export Report Button */}
          <button
            onClick={() => {
              audioService.playClick();
              onOpenSummary();
            }}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition"
            title="View Mission Summary & Export CSV"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">REPORT</span>
          </button>

          {/* Architecture Modal Button */}
          <button
            onClick={() => {
              audioService.playClick();
              onOpenArchitecture();
            }}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition"
            title="System Architecture & ESP32 BOM"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">ARCH</span>
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={() => {
              audioService.playClick();
              onOpenSettings();
            }}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition"
            title="Simulation Settings"
          >
            <Settings className="w-4 h-4 text-slate-300" />
          </button>

          {/* Audio Chime Mute Button */}
          <button
            onClick={toggleSound}
            className={`p-1.5 rounded-md border text-xs transition ${
              isMuted 
                ? 'bg-slate-900 text-slate-500 border-slate-800' 
                : 'bg-slate-800 text-cyan-400 border-cyan-500/40 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute SCADA Audio Chimes' : 'Mute SCADA Audio Chimes'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
