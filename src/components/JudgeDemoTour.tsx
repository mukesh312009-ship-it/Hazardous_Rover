import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  X, 
  Award, 
  CheckCircle, 
  AlertOctagon, 
  ChevronRight,
  Flame,
  CornerUpLeft
} from 'lucide-react';
import { SystemState, ScenarioType, RoverPose } from '../types/telemetry';
import { audioService } from '../services/audioService';

interface JudgeDemoTourProps {
  isOpen: boolean;
  onClose: () => void;
  setSystemState: React.Dispatch<React.SetStateAction<SystemState>>;
  setScenario: (scen: ScenarioType) => void;
  setPose: React.Dispatch<React.SetStateAction<RoverPose>>;
  onOpenSummary: () => void;
  onReturnToBase: () => void;
}

interface DemoStep {
  stepNumber: number;
  title: string;
  badge: string;
  caption: string;
  durationSec: number;
  action: () => void;
}

export const JudgeDemoTour: React.FC<JudgeDemoTourProps> = ({
  isOpen,
  onClose,
  setSystemState,
  setScenario,
  setPose,
  onOpenSummary,
  onReturnToBase
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [stepTimerSec, setStepTimerSec] = useState<number>(0);

  const steps: DemoStep[] = [
    {
      stepNumber: 1,
      title: 'The Confined-Space Hazard Problem',
      badge: 'MISSION GENESIS',
      caption: 'Every year, workers face fatal atmospheric poisoning and asphyxiation inside sewers and manholes. HazardScout is designed to "Inspect First. Protect Lives." by deploying an autonomous scout before any human worker enters.',
      durationSec: 12,
      action: () => {
        setSystemState('IDLE');
        setScenario('NORMAL');
      }
    },
    {
      stepNumber: 2,
      title: 'Rover Teleoperation & Conduit Traversal',
      badge: 'TRAVERSAL',
      caption: 'The rover is dropped down Manhole Access #1. Its 4-wheel drive navigates through drainage conduits with integrated obstacle collision detection, headlights, and breadcrumb path tracking.',
      durationSec: 14,
      action: () => {
        setSystemState('SCANNING');
        // Nudge rover forward along channel
        setPose((p) => ({
          ...p,
          x: 200,
          y: 380,
          headingDeg: 0,
          isMoving: true
        }));
      }
    },
    {
      stepNumber: 3,
      title: 'Multi-Channel Sensor Telemetry Acquisition',
      badge: 'TELEMETRY STREAM',
      caption: 'Sensors acquire atmospheric data at 1 Hz. Notice the live 6-channel telemetry matrix: Oxygen (% vol), H2S (ppm), CO (ppm), SHT31 Temp/Humidity, and ultrasonic obstacle acoustic range.',
      durationSec: 14,
      action: () => {
        setPose((p) => ({
          ...p,
          x: 320,
          y: 280,
          headingDeg: 310,
          isMoving: true
        }));
      }
    },
    {
      stepNumber: 4,
      title: 'Encountering Severe Gas Accumulation Pocket',
      badge: 'HAZARD INTERLOCK',
      caption: 'The rover drives into an unventilated subterranean pocket! Decaying organic waste causes Hydrogen Sulfide (H2S) to surge to 17 ppm while displacing breathable Oxygen down to 16.4%.',
      durationSec: 16,
      action: () => {
        setScenario('GAS_LEAK');
        audioService.playCriticalAlarm();
        setPose((p) => ({
          ...p,
          x: 470,
          y: 240,
          headingDeg: 0,
          isMoving: true
        }));
      }
    },
    {
      stepNumber: 5,
      title: 'Threshold Engine & Emergency Alert Dispatch',
      badge: 'ENTRY DENIED',
      caption: 'The threshold engine trips instantly: state transitions to CRITICAL, the safety banner changes to "HAZARD INDICATED — HUMAN ENTRY NOT AUTHORIZED", and an immutable timestamped event is logged.',
      durationSec: 14,
      action: () => {
        audioService.playCriticalAlarm();
      }
    },
    {
      stepNumber: 6,
      title: 'Autonomous Return-to-Base & Debrief Report',
      badge: 'MISSION COMPLETE',
      caption: 'HazardScout halts forward progression and initiates Return-to-Base (RTH) along its mapped breadcrumb trail. An auditable CSV telemetry report is generated for supervisors. Human lives are protected!',
      durationSec: 15,
      action: () => {
        setScenario('NORMAL');
        onReturnToBase();
        setTimeout(() => {
          onOpenSummary();
        }, 1200);
      }
    }
  ];

  // Auto-advance loop
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const timer = setInterval(() => {
      setStepTimerSec((t) => {
        const stepDuration = steps[currentStep].durationSec;
        if (t + 1 >= stepDuration) {
          if (currentStep < steps.length - 1) {
            const next = currentStep + 1;
            setCurrentStep(next);
            steps[next].action();
            audioService.playClick();
            return 0;
          } else {
            setIsPlaying(false);
            return stepDuration;
          }
        }
        return t + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, currentStep, steps]);

  // Execute action on initial launch or manual step change
  useEffect(() => {
    if (isOpen) {
      steps[currentStep].action();
    }
  }, [currentStep, isOpen]);

  if (!isOpen) return null;

  const current = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      audioService.playClick();
      setCurrentStep(currentStep + 1);
      setStepTimerSec(0);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      audioService.playClick();
      setCurrentStep(currentStep - 1);
      setStepTimerSec(0);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-slideUp">
      <div className="bg-[#0b1220]/95 backdrop-blur-md border-2 border-cyan-400 rounded-xl p-4 shadow-2xl font-mono text-slate-100 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400"></div>

        {/* Top Control Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-700/80 text-xs">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-cyan-400" />
            <span className="font-bold tracking-wider text-cyan-300">
              JUDGE PRESENTATION TOUR — STEP {current.stepNumber} OF {steps.length}
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-200 border border-cyan-500/50 text-[10px]">
              {current.badge}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-slate-400">
              {current.durationSec - stepTimerSec}s
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Exit Tour"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Step Body */}
        <div className="py-3 space-y-1.5">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <ChevronRight className="w-4 h-4 text-cyan-400" />
            {current.title}
          </h3>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            {current.caption}
          </p>
        </div>

        {/* Step Progress & Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700/80 text-xs">
          {/* Progress dots */}
          <div className="flex space-x-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === currentStep
                    ? 'bg-cyan-400 w-6'
                    : idx < currentStep
                    ? 'bg-emerald-400'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Stepper buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 transition"
              title="Previous Step"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center space-x-1 transition text-xs font-bold"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'PAUSE' : 'RESUME'}</span>
            </button>

            <button
              onClick={handleNext}
              disabled={currentStep === steps.length - 1}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 transition"
              title="Next Step"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition text-xs shadow"
            >
              FINISH TOUR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
