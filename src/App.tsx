import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { RoverLiveView } from './components/RoverLiveView';
import { SensorCardsGrid } from './components/SensorCardsGrid';
import { TelemetryChart } from './components/TelemetryChart';
import { SensorSummaryTable } from './components/SensorSummaryTable';
import { HazardAlertCenter } from './components/HazardAlertCenter';
import { MissionControls } from './components/MissionControls';
import { SystemArchitectureModal } from './components/SystemArchitectureModal';
import { SettingsModal } from './components/SettingsModal';
import { JudgeDemoTour } from './components/JudgeDemoTour';
import { MissionSummaryModal } from './components/MissionSummaryModal';

import { 
  SystemState, 
  NavigationMode,
  AutonomousSubState,
  Waypoint,
  SensorReadings, 
  TelemetryPoint, 
  ThresholdConfig, 
  AlertEvent, 
  MissionLogEntry, 
  RoverPose, 
  ScenarioType 
} from './types/telemetry';
import { 
  DEFAULT_THRESHOLDS, 
  INITIAL_ROVER_POSE,
  AUTONOMOUS_WAYPOINTS,
  SEWER_OBSTACLES 
} from './constants/initialState';
import { 
  computeSensorReadings,
  computeAutonomousStep 
} from './services/simulationEngine';
import { audioService } from './services/audioService';

export const App: React.FC = () => {
  // 1. Simulation & Mission States
  const [systemState, setSystemState] = useState<SystemState>('SCANNING'); // Start active in autonomous mode!
  const [navMode, setNavMode] = useState<NavigationMode>('AUTONOMOUS');
  const [autoSubState, setAutoSubState] = useState<AutonomousSubState>('TRAVERSING_WAYPOINT');
  const [waypoints, setWaypoints] = useState<Waypoint[]>(AUTONOMOUS_WAYPOINTS);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState<number>(0);
  const [sonarScan, setSonarScan] = useState<{ angleDeg: number; distanceCm: number }[]>([]);

  const [missionDurationSec, setMissionDurationSec] = useState<number>(0);
  const [totalDistanceM, setTotalDistanceM] = useState<number>(0);
  const [batteryPct, setBatteryPct] = useState<number>(98.5);
  const [rssiDbm, setRssiDbm] = useState<number>(-62);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [noiseEnabled, setNoiseEnabled] = useState<boolean>(true);

  // 2. Rover Pose & Path
  const [pose, setPose] = useState<RoverPose>(INITIAL_ROVER_POSE);
  const [pathTrail, setPathTrail] = useState<{ x: number; y: number }[]>([
    { x: INITIAL_ROVER_POSE.x, y: INITIAL_ROVER_POSE.y }
  ]);

  // 3. Sensor & Telemetry Data
  const [scenario, setScenario] = useState<ScenarioType>('NORMAL');
  const [thresholds, setThresholds] = useState<ThresholdConfig>(() => {
    try {
      const saved = localStorage.getItem('hazardscout_thresholds');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_THRESHOLDS;
  });

  const [sensorReadings, setSensorReadings] = useState<SensorReadings>({
    oxygenPct: 20.9,
    h2sPpm: 0.2,
    coPpm: 2.5,
    temperatureC: 22.8,
    humidityRh: 62.0,
    waterDetected: false,
    obstacleDistanceCm: 140
  });

  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // 4. Alert & Mission Event Logs
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [missionLogs, setMissionLogs] = useState<MissionLogEntry[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      type: 'AUTONOMOUS',
      description: 'HazardScout Autonomous Scout Mode initialized. Waypoint queue active.'
    }
  ]);

  // Track active channel severity states to debounce duplicate alerts
  const lastSeveritiesRef = useRef<{ [channel: string]: 'NORMAL' | 'WARNING' | 'CRITICAL' }>({
    OXYGEN: 'NORMAL',
    H2S: 'NORMAL',
    CO: 'NORMAL',
    TEMPERATURE: 'NORMAL',
    WATER: 'NORMAL',
    OBSTACLE: 'NORMAL'
  });

  // 5. Modals State
  const [isArchOpen, setIsArchOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isDemoTourOpen, setIsDemoTourOpen] = useState<boolean>(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState<boolean>(false);

  // Helper to log mission events
  const addMissionLog = useCallback((type: 'INFO' | 'ACTION' | 'HAZARD' | 'RETURN' | 'COLLISION' | 'AUTONOMOUS', description: string) => {
    const newEntry: MissionLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      type,
      description
    };
    setMissionLogs((prev) => [newEntry, ...prev.slice(0, 100)]);
  }, []);

  // Return to base (RTH) autonomous navigation handler
  const handleReturnToBase = useCallback(() => {
    setSystemState('RETURNING');
    setAutoSubState('RETURNING_HOME');
    addMissionLog('RETURN', 'Autonomous Return-to-Base (RTH) protocol engaged. Navigating reverse breadcrumbs.');
  }, [addMissionLog]);

  // Skip waypoint handler
  const handleSkipWaypoint = useCallback(() => {
    if (currentWaypointIndex < waypoints.length - 1) {
      const nextIdx = currentWaypointIndex + 1;
      setCurrentWaypointIndex(nextIdx);
      addMissionLog('AUTONOMOUS', `Manual override: Waypoint skipped. Now routing to ${waypoints[nextIdx].label}`);
    }
  }, [currentWaypointIndex, waypoints, addMissionLog]);

  // Autonomous Navigation Controller Loop (Runs at ~18 Hz for smooth robotics movement)
  useEffect(() => {
    if (navMode !== 'AUTONOMOUS' || systemState !== 'SCANNING' || batteryPct <= 0) {
      if (systemState === 'IDLE' && autoSubState !== 'IDLE') {
        setAutoSubState('IDLE');
      }
      return;
    }

    const targetWp = waypoints[currentWaypointIndex];
    if (!targetWp) return;

    const isCritical = [
      sensorReadings.oxygenPct <= thresholds.o2CritLow,
      sensorReadings.h2sPpm >= thresholds.h2sCritHigh,
      sensorReadings.coPpm >= thresholds.coCritHigh,
      sensorReadings.temperatureC >= thresholds.tempCritHigh
    ].some(Boolean);

    const autoInterval = setInterval(() => {
      const navResult = computeAutonomousStep(
        pose,
        targetWp,
        SEWER_OBSTACLES,
        sensorReadings,
        thresholds,
        isCritical
      );

      setPose(navResult.nextPose);
      setAutoSubState(navResult.subState);
      setSonarScan(navResult.sonarScan);

      if (navResult.distanceIncrementM > 0) {
        setTotalDistanceM((d) => parseFloat((d + navResult.distanceIncrementM).toFixed(2)));
        setBatteryPct((b) => Math.max(0, parseFloat((b - 0.006).toFixed(2))));

        setPathTrail((trail) => {
          const last = trail[trail.length - 1];
          if (!last || Math.hypot(last.x - navResult.nextPose.x, last.y - navResult.nextPose.y) > 10) {
            return [...trail, { x: navResult.nextPose.x, y: navResult.nextPose.y }];
          }
          return trail;
        });
      }

      // Check if reached active waypoint
      if (navResult.reachedWaypoint) {
        setWaypoints((wps) =>
          wps.map((wp, idx) => (idx === currentWaypointIndex ? { ...wp, completed: true } : wp))
        );
        addMissionLog('AUTONOMOUS', `Waypoint ${targetWp.label} achieved. Commencing environmental sampling.`);
        audioService.playSonarPing();

        // Advance to next waypoint
        if (currentWaypointIndex < waypoints.length - 1) {
          setCurrentWaypointIndex((idx) => idx + 1);
        } else {
          setAutoSubState('PATROL_COMPLETE');
          addMissionLog('INFO', 'Full autonomous conduit circuit completed. Executing Return-to-Base.');
          handleReturnToBase();
        }
      }
    }, 55 / simSpeed);

    return () => clearInterval(autoInterval);
  }, [
    navMode,
    systemState,
    batteryPct,
    currentWaypointIndex,
    waypoints,
    pose,
    sensorReadings,
    thresholds,
    simSpeed,
    autoSubState,
    handleReturnToBase,
    addMissionLog
  ]);

  // RTH step execution loop
  useEffect(() => {
    if (systemState !== 'RETURNING') return;

    const rthInterval = setInterval(() => {
      setPathTrail((prevTrail) => {
        if (prevTrail.length <= 1) {
          setPose(INITIAL_ROVER_POSE);
          setSystemState('IDLE');
          setAutoSubState('IDLE');
          addMissionLog('INFO', 'Rover safely docked at Manhole Access #1.');
          audioService.playClick();
          return [{ x: INITIAL_ROVER_POSE.x, y: INITIAL_ROVER_POSE.y }];
        }

        const nextTrail = [...prevTrail];
        const target = nextTrail.pop()!;
        
        setPose((curr) => {
          const dx = target.x - curr.x;
          const dy = target.y - curr.y;
          const heading = (Math.atan2(dy, dx) * 180) / Math.PI;
          return {
            x: target.x,
            y: target.y,
            headingDeg: heading >= 0 ? heading : heading + 360,
            speed: 3,
            isMoving: true,
            isStuck: false
          };
        });

        return nextTrail;
      });
    }, 180 / simSpeed);

    return () => clearInterval(rthInterval);
  }, [systemState, simSpeed, addMissionLog]);

  // Main Telemetry & Sensor Simulation Tick Loop (1 Hz)
  useEffect(() => {
    const intervalMs = 1000 / simSpeed;

    const tick = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
      setLastUpdate(timeStr);

      if (systemState === 'SCANNING' || systemState === 'HAZARD_DETECTED' || systemState === 'RETURNING') {
        setMissionDurationSec((s) => s + 1);
      }

      setSensorReadings((prev) => {
        const next = computeSensorReadings(pose, scenario, prev, noiseEnabled);

        const sevO2: 'NORMAL' | 'WARNING' | 'CRITICAL' = 
          next.oxygenPct <= thresholds.o2CritLow ? 'CRITICAL' : next.oxygenPct <= thresholds.o2WarnLow ? 'WARNING' : 'NORMAL';

        const sevH2s: 'NORMAL' | 'WARNING' | 'CRITICAL' = 
          next.h2sPpm >= thresholds.h2sCritHigh ? 'CRITICAL' : next.h2sPpm >= thresholds.h2sWarnHigh ? 'WARNING' : 'NORMAL';

        const sevCo: 'NORMAL' | 'WARNING' | 'CRITICAL' = 
          next.coPpm >= thresholds.coCritHigh ? 'CRITICAL' : next.coPpm >= thresholds.coWarnHigh ? 'WARNING' : 'NORMAL';

        const sevTemp: 'NORMAL' | 'WARNING' | 'CRITICAL' = 
          next.temperatureC >= thresholds.tempCritHigh ? 'CRITICAL' : next.temperatureC >= thresholds.tempWarnHigh ? 'WARNING' : 'NORMAL';

        const sevWater: 'NORMAL' | 'WARNING' | 'CRITICAL' = 
          next.waterDetected ? 'WARNING' : 'NORMAL';

        const sevObstacle: 'NORMAL' | 'WARNING' | 'CRITICAL' = 
          next.obstacleDistanceCm <= 12 ? 'CRITICAL' : next.obstacleDistanceCm <= thresholds.obstacleWarnDistCm ? 'WARNING' : 'NORMAL';

        // Check channel transitions
        const checkTransition = (
          channel: 'OXYGEN' | 'H2S' | 'CO' | 'TEMPERATURE' | 'WATER' | 'OBSTACLE',
          currentSev: 'NORMAL' | 'WARNING' | 'CRITICAL',
          msg: string,
          valStr: string
        ) => {
          const lastSev = lastSeveritiesRef.current[channel];
          if (currentSev !== lastSev) {
            lastSeveritiesRef.current[channel] = currentSev;

            if (currentSev !== 'NORMAL') {
              const newAlert: AlertEvent = {
                id: `alt-${Date.now()}-${channel}`,
                timestamp: timeStr,
                channel,
                severity: currentSev,
                message: msg,
                valueString: valStr,
                acknowledged: false
              };
              setAlerts((a) => [newAlert, ...a.slice(0, 50)]);
              addMissionLog('HAZARD', `[${currentSev}] ${msg} (${valStr})`);

              if (currentSev === 'CRITICAL') {
                audioService.playCriticalAlarm();
                setSystemState('HAZARD_DETECTED');
              } else {
                audioService.playWarning();
              }
            }
          }
        };

        checkTransition('OXYGEN', sevO2, 'Oxygen deficiency detected', `${next.oxygenPct}% vol`);
        checkTransition('H2S', sevH2s, 'Toxic Hydrogen Sulfide gas accumulation', `${next.h2sPpm} ppm`);
        checkTransition('CO', sevCo, 'Carbon Monoxide concentration surge', `${next.coPpm} ppm`);
        checkTransition('TEMPERATURE', sevTemp, 'Thermal anomaly in conduit', `${next.temperatureC}°C`);
        checkTransition('WATER', sevWater, 'Conductive water ingress detected by FC-37', 'SUBMERGED');
        checkTransition('OBSTACLE', sevObstacle, 'Ultrasonic proximity barrier warning', `${next.obstacleDistanceCm} cm`);

        const anyCritical = [sevO2, sevH2s, sevCo, sevTemp, sevObstacle].includes('CRITICAL');
        if (!anyCritical && systemState === 'HAZARD_DETECTED') {
          setSystemState('SCANNING');
        }

        const point: TelemetryPoint = {
          ...next,
          timestamp: now.toISOString(),
          timeLabel: timeStr,
          batteryPct,
          rssiDbm,
          simulatedDistanceM: totalDistanceM
        };

        setTelemetryHistory((hist) => [...hist.slice(-119), point]);

        return next;
      });

      setRssiDbm(() => {
        const base = -55 - Math.min(30, totalDistanceM * 0.8);
        return Math.round(base + (Math.random() - 0.5) * 4);
      });
    };

    const timer = setInterval(tick, intervalMs);
    return () => clearInterval(timer);
  }, [simSpeed, systemState, pose, scenario, noiseEnabled, thresholds, batteryPct, rssiDbm, totalDistanceM, addMissionLog]);

  // Alert acknowledgement & clear
  const handleAcknowledgeAlert = (id: string) => {
    const ackTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true, ackTimestamp: ackTime } : a))
    );
  };

  const handleClearActiveAlerts = () => {
    audioService.playClick();
    setAlerts((prev) => prev.filter((a) => !a.acknowledged));
  };

  const handleResetDefaults = () => {
    setThresholds(DEFAULT_THRESHOLDS);
    setSimSpeed(1);
    setNoiseEnabled(true);
    try {
      localStorage.removeItem('hazardscout_thresholds');
    } catch {}
  };

  const hasActiveHazards = alerts.some((a) => !a.acknowledged);

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* 1. APP HEADER */}
      <Header
        systemState={systemState}
        missionDurationSec={missionDurationSec}
        onOpenArchitecture={() => setIsArchOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onStartDemoTour={() => setIsDemoTourOpen(true)}
        onOpenSummary={() => setIsSummaryOpen(true)}
      />

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-3 sm:p-4 space-y-3">
        {/* ROW 1: ROVER LIVE VIEW (left) + MISSION CONTROLS & LOG (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* Rover Live View Canvas (7 cols on desktop) */}
          <div className="lg:col-span-7">
            <RoverLiveView
              pose={pose}
              setPose={setPose}
              systemState={systemState}
              setSystemState={setSystemState}
              navMode={navMode}
              setNavMode={setNavMode}
              autoSubState={autoSubState}
              waypoints={waypoints}
              currentWaypointIndex={currentWaypointIndex}
              onSkipWaypoint={handleSkipWaypoint}
              sonarScan={sonarScan}
              totalDistanceM={totalDistanceM}
              setTotalDistanceM={setTotalDistanceM}
              pathTrail={pathTrail}
              setPathTrail={setPathTrail}
              onLogEvent={addMissionLog}
              batteryPct={batteryPct}
              setBatteryPct={setBatteryPct}
              onReturnToBase={handleReturnToBase}
            />
          </div>

          {/* Mission Telemetry Gauges & Event Audit (5 cols on desktop) */}
          <div className="lg:col-span-5">
            <MissionControls
              systemState={systemState}
              batteryPct={batteryPct}
              rssiDbm={rssiDbm}
              totalDistanceM={totalDistanceM}
              missionDurationSec={missionDurationSec}
              missionLogs={missionLogs}
              onReturnToBase={handleReturnToBase}
            />
          </div>
        </div>

        {/* ROW 2: ENVIRONMENTAL SENSOR CARDS (6 Channels + Ultrasonic) */}
        <SensorCardsGrid
          readings={sensorReadings}
          thresholds={thresholds}
          history={telemetryHistory}
        />

        {/* ROW 3: ATMOSPHERIC TELEMETRY CHART (left) + HAZARD ALERT CENTER (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* Live Scrolling Telemetry Chart (6 cols) */}
          <div className="lg:col-span-6">
            <TelemetryChart
              telemetryHistory={telemetryHistory}
              thresholds={thresholds}
              isPaused={systemState === 'PAUSED'}
            />
          </div>

          {/* Hazard Alert Center & Scenario Injection (6 cols) */}
          <div className="lg:col-span-6">
            <HazardAlertCenter
              alerts={alerts}
              scenario={scenario}
              setScenario={setScenario}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onClearActiveAlerts={handleClearActiveAlerts}
              hasActiveHazards={hasActiveHazards}
              thresholds={thresholds}
            />
          </div>
        </div>

        {/* ROW 4: SENSOR AUDIT SUMMARY MATRIX */}
        <SensorSummaryTable
          readings={sensorReadings}
          thresholds={thresholds}
          lastUpdate={lastUpdate}
        />

        {/* PERSISTENT INDUSTRIAL SAFETY DISCLAIMER FOOTER */}
        <footer className="mt-4 p-3 rounded-lg bg-[#0b1220] border border-hazard-border text-center font-mono text-[10px] text-slate-400 space-y-1">
          <div className="text-amber-300/90 font-semibold flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            HAZARDSCOUT AUTONOMOUS RECONNAISSANCE PROTOCOL
          </div>
          <p className="max-w-4xl mx-auto text-slate-400/90 font-sans">
            This application is an educational engineering simulation. Simulated telemetry values and virtual threshold evaluations do not certify a physical confined space for human occupancy. Actual entry procedures require calibrated, OSHA/NIOSH certified gas testing equipment and authorized entry permits.
          </p>
          <div className="text-slate-500 text-[9px] pt-1 border-t border-slate-800">
            HazardScout Prototype | Autonomous Reactive Navigation | College Engineering Hackathon
          </div>
        </footer>
      </main>

      {/* MODALS */}
      <SystemArchitectureModal
        isOpen={isArchOpen}
        onClose={() => setIsArchOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        thresholds={thresholds}
        setThresholds={setThresholds}
        simSpeed={simSpeed}
        setSimSpeed={setSimSpeed}
        noiseEnabled={noiseEnabled}
        setNoiseEnabled={setNoiseEnabled}
        onResetDefaults={handleResetDefaults}
      />

      <JudgeDemoTour
        isOpen={isDemoTourOpen}
        onClose={() => setIsDemoTourOpen(false)}
        setSystemState={setSystemState}
        setScenario={setScenario}
        setPose={setPose}
        onOpenSummary={() => setIsSummaryOpen(true)}
        onReturnToBase={handleReturnToBase}
      />

      <MissionSummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        missionDurationSec={missionDurationSec}
        totalDistanceM={totalDistanceM}
        telemetryHistory={telemetryHistory}
        alerts={alerts}
        missionLogs={missionLogs}
      />
    </div>
  );
};
export default App;
