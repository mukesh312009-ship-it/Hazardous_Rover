import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Compass, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  RotateCw, 
  Hand, 
  ShieldAlert, 
  Navigation,
  Play,
  Pause,
  Square,
  CornerUpLeft,
  Crosshair,
  Bot,
  UserCheck,
  CheckCircle2,
  SkipForward,
  Activity,
  Radar
} from 'lucide-react';
import { 
  RoverPose, 
  SewerMapObstacle, 
  SystemState, 
  NavigationMode, 
  AutonomousSubState, 
  Waypoint 
} from '../types/telemetry';
import { 
  SEWER_OBSTACLES, 
  WATER_HAZARD_ZONES, 
  GAS_HAZARD_ZONES, 
  INITIAL_ROVER_POSE 
} from '../constants/initialState';
import { checkCollision } from '../services/simulationEngine';
import { audioService } from '../services/audioService';

interface RoverLiveViewProps {
  pose: RoverPose;
  setPose: React.Dispatch<React.SetStateAction<RoverPose>>;
  systemState: SystemState;
  setSystemState: React.Dispatch<React.SetStateAction<SystemState>>;
  navMode: NavigationMode;
  setNavMode: React.Dispatch<React.SetStateAction<NavigationMode>>;
  autoSubState: AutonomousSubState;
  waypoints: Waypoint[];
  currentWaypointIndex: number;
  onSkipWaypoint: () => void;
  sonarScan: { angleDeg: number; distanceCm: number }[];
  totalDistanceM: number;
  setTotalDistanceM: React.Dispatch<React.SetStateAction<number>>;
  pathTrail: { x: number; y: number }[];
  setPathTrail: React.Dispatch<React.SetStateAction<{ x: number; y: number }[]>>;
  onLogEvent: (type: 'INFO' | 'ACTION' | 'HAZARD' | 'RETURN' | 'COLLISION' | 'AUTONOMOUS', desc: string) => void;
  batteryPct: number;
  setBatteryPct: React.Dispatch<React.SetStateAction<number>>;
  onReturnToBase: () => void;
}

export const RoverLiveView: React.FC<RoverLiveViewProps> = ({
  pose,
  setPose,
  systemState,
  setSystemState,
  navMode,
  setNavMode,
  autoSubState,
  waypoints,
  currentWaypointIndex,
  onSkipWaypoint,
  sonarScan,
  totalDistanceM,
  setTotalDistanceM,
  pathTrail,
  setPathTrail,
  onLogEvent,
  batteryPct,
  setBatteryPct,
  onReturnToBase
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeKeys, setActiveKeys] = useState<{ [key: string]: boolean }>({});
  const [collisionWarning, setCollisionWarning] = useState<string | null>(null);
  const [showGasZones, setShowGasZones] = useState<boolean>(true);
  const [showWaypoints, setShowWaypoints] = useState<boolean>(true);

  // Key down / up handlers for manual teleop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (navMode === 'AUTONOMOUS') return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      const key = e.key.toLowerCase();
      if (['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
        setActiveKeys((prev) => ({ ...prev, [key]: true }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (navMode === 'AUTONOMOUS') return;
      const key = e.key.toLowerCase();
      if (['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        setActiveKeys((prev) => ({ ...prev, [key]: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [navMode]);

  // Manual movement execution loop
  const moveRoverManual = useCallback((linearDir: number, angularDir: number) => {
    if (systemState === 'PAUSED' || batteryPct <= 0 || navMode === 'AUTONOMOUS') return;

    setPose((prev) => {
      let nextHeading = prev.headingDeg + angularDir * 4.5;
      if (nextHeading < 0) nextHeading += 360;
      if (nextHeading >= 360) nextHeading -= 360;

      if (linearDir === 0 && angularDir === 0) {
        return { ...prev, isMoving: false };
      }

      const moveStep = linearDir * 3.5;
      const headingRad = (nextHeading * Math.PI) / 180;
      const nextX = prev.x + Math.cos(headingRad) * moveStep;
      const nextY = prev.y + Math.sin(headingRad) * moveStep;

      // Check collision with obstacles & perimeter walls
      const col = checkCollision(nextX, nextY, SEWER_OBSTACLES);
      if (col.collided) {
        setCollisionWarning(`COLLISION DETECTED: ${col.obstacleName || 'Perimeter Bulkhead'}`);
        audioService.playSonarPing();
        onLogEvent('COLLISION', `Rover collision avoided at (${Math.round(prev.x)}, ${Math.round(prev.y)}) with ${col.obstacleName}`);
        return {
          ...prev,
          headingDeg: nextHeading,
          isMoving: false,
          isStuck: true
        };
      }

      setCollisionWarning(null);
      setBatteryPct((b) => Math.max(0, parseFloat((b - 0.015).toFixed(2))));
      const distDelta = Math.abs(moveStep) * 0.02;
      setTotalDistanceM((d) => parseFloat((d + distDelta).toFixed(2)));

      const lastPoint = pathTrail[pathTrail.length - 1];
      if (!lastPoint || Math.hypot(lastPoint.x - nextX, lastPoint.y - nextY) > 8) {
        setPathTrail((trail) => [...trail, { x: nextX, y: nextY }]);
      }

      return {
        x: nextX,
        y: nextY,
        headingDeg: nextHeading,
        speed: moveStep,
        isMoving: true,
        isStuck: false
      };
    });
  }, [systemState, batteryPct, navMode, setPose, onLogEvent, setBatteryPct, setTotalDistanceM, pathTrail, setPathTrail]);

  // Tick manual keys
  useEffect(() => {
    if (navMode !== 'MANUAL') return;
    const isForward = activeKeys['w'] || activeKeys['arrowup'];
    const isBackward = activeKeys['s'] || activeKeys['arrowdown'];
    const isLeft = activeKeys['a'] || activeKeys['arrowleft'];
    const isRight = activeKeys['d'] || activeKeys['arrowright'];
    const isStop = activeKeys[' '];

    if (isStop) {
      setPose((p) => ({ ...p, isMoving: false, speed: 0 }));
      return;
    }

    if (isForward || isBackward || isLeft || isRight) {
      const linear = isForward ? 1 : isBackward ? -1 : 0;
      const angular = isRight ? 1 : isLeft ? -1 : 0;
      moveRoverManual(linear, angular);
    }
  }, [activeKeys, navMode, moveRoverManual, setPose]);

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background: Dark subterranean sewer concrete
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, width, height);

    // Floor grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Drainage flow channels
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.08)';
    ctx.lineWidth = 28;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(70, 380);
    ctx.lineTo(290, 380);
    ctx.lineTo(290, 240);
    ctx.lineTo(470, 240);
    ctx.lineTo(470, 110);
    ctx.lineTo(720, 110);
    ctx.stroke();

    // Standing Water Puddle Zones
    WATER_HAZARD_ZONES.forEach((w) => {
      const grad = ctx.createRadialGradient(w.x, w.y, 4, w.x, w.y, w.radius);
      grad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
      grad.addColorStop(0.7, 'rgba(2, 132, 199, 0.25)');
      grad.addColorStop(1, 'rgba(2, 132, 199, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.font = '10px monospace';
      ctx.fillText('WATER PUDDLE', w.x - 35, w.y - w.radius - 4);
    });

    // Subterranean Gas Accumulation Pockets
    if (showGasZones) {
      GAS_HAZARD_ZONES.forEach((g) => {
        const grad = ctx.createRadialGradient(g.x, g.y, 5, g.x, g.y, g.radius);
        if (g.type === 'h2s_pocket') {
          grad.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
          grad.addColorStop(0.8, 'rgba(239, 68, 68, 0.1)');
          grad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
        } else if (g.type === 'low_o2_pocket') {
          grad.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
          grad.addColorStop(0.8, 'rgba(168, 85, 247, 0.08)');
          grad.addColorStop(1, 'rgba(168, 85, 247, 0.0)');
        } else {
          grad.addColorStop(0, 'rgba(245, 158, 11, 0.3)');
          grad.addColorStop(0.8, 'rgba(245, 158, 11, 0.08)');
          grad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = g.type === 'h2s_pocket' ? 'rgba(239,68,68,0.7)' : 'rgba(245,158,11,0.7)';
        ctx.font = '10px monospace';
        const label = g.type === 'h2s_pocket' ? 'H2S ACCUMULATION' : g.type === 'low_o2_pocket' ? 'O2 DEPLETED ZONE' : 'HIGH HEAT DUCT';
        ctx.fillText(label, g.x - 45, g.y);
      });
    }

    // Launch Manhole Access Shaft
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(INITIAL_ROVER_POSE.x, INITIAL_ROVER_POSE.y, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.fill();
    ctx.fillStyle = '#00f0ff';
    ctx.font = '9px monospace';
    ctx.fillText('MANHOLE ACCESS #1', INITIAL_ROVER_POSE.x - 45, INITIAL_ROVER_POSE.y + 40);

    // Draw Autonomous Planned Flight/Patrol Path
    if (showWaypoints && waypoints.length > 0) {
      // Connect waypoints with faint dashed vector line
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(INITIAL_ROVER_POSE.x, INITIAL_ROVER_POSE.y);
      waypoints.forEach((wp) => {
        ctx.lineTo(wp.x, wp.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw each waypoint beacon
      waypoints.forEach((wp, idx) => {
        const isCurrent = idx === currentWaypointIndex;
        const isPast = wp.completed;

        ctx.save();
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, isCurrent ? 12 : 8, 0, Math.PI * 2);

        if (isCurrent) {
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2;
          ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
          ctx.fill();
          ctx.stroke();

          // Pulsing target crosshairs
          ctx.beginPath();
          ctx.arc(wp.x, wp.y, 18, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (isPast) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.5;
          ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1;
          ctx.fillStyle = 'rgba(100, 116, 139, 0.15)';
          ctx.fill();
          ctx.stroke();
        }

        // Label
        ctx.fillStyle = isCurrent ? '#00f0ff' : isPast ? '#10b981' : '#94a3b8';
        ctx.font = isCurrent ? 'bold 10px monospace' : '9px monospace';
        ctx.fillText(wp.id.toUpperCase(), wp.x - 12, wp.y - 12);

        ctx.restore();
      });
    }

    // Draw Breadcrumb Travelled Path Trail
    if (pathTrail.length > 1) {
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pathTrail[0].x, pathTrail[0].y);
      for (let i = 1; i < pathTrail.length; i++) {
        ctx.lineTo(pathTrail[i].x, pathTrail[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Obstacles & Conduit Walls
    SEWER_OBSTACLES.forEach((obs) => {
      if (obs.type === 'wall') {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      } else if (obs.type === 'pipe') {
        ctx.fillStyle = '#1c2833';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

        ctx.strokeStyle = 'rgba(2, 132, 199, 0.4)';
        for (let py = obs.y + 10; py < obs.y + obs.height; py += 15) {
          ctx.beginPath();
          ctx.moveTo(obs.x, py);
          ctx.lineTo(obs.x + obs.width, py);
          ctx.stroke();
        }
      } else if (obs.type === 'debris') {
        ctx.fillStyle = '#3f3f46';
        ctx.strokeStyle = '#71717a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y + obs.height);
        ctx.lineTo(obs.x + obs.width * 0.3, obs.y);
        ctx.lineTo(obs.x + obs.width * 0.8, obs.y + obs.height * 0.2);
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#a1a1aa';
        ctx.font = '8px monospace';
        ctx.fillText('DEBRIS', obs.x, obs.y - 4);
      }
    });

    // Draw Rover Kinematics & Sonar Radar Fan
    ctx.save();
    ctx.translate(pose.x, pose.y);
    ctx.rotate((pose.headingDeg * Math.PI) / 180);

    // 1. Headlight beam
    const lightGrad = ctx.createRadialGradient(16, 0, 5, 90, 0, 80);
    lightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    lightGrad.addColorStop(0.3, 'rgba(0, 240, 255, 0.25)');
    lightGrad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');
    ctx.fillStyle = lightGrad;
    ctx.beginPath();
    ctx.moveTo(16, -6);
    ctx.lineTo(110, -50);
    ctx.lineTo(110, 50);
    ctx.lineTo(16, 6);
    ctx.closePath();
    ctx.fill();

    // 2. Multibeam Acoustic Ultrasonic Radar Rays (Real-time obstacle scan)
    if (sonarScan && sonarScan.length > 0) {
      sonarScan.forEach((ray) => {
        const relAngleRad = ((ray.angleDeg - pose.headingDeg) * Math.PI) / 180;
        const lengthPx = Math.min(120, ray.distanceCm / 1.5);

        ctx.strokeStyle = ray.distanceCm < 35 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(168, 85, 247, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(16 + Math.cos(relAngleRad) * lengthPx, Math.sin(relAngleRad) * lengthPx);
        ctx.stroke();

        // Echo impact point
        ctx.fillStyle = ray.distanceCm < 35 ? '#ef4444' : '#c084fc';
        ctx.beginPath();
        ctx.arc(16 + Math.cos(relAngleRad) * lengthPx, Math.sin(relAngleRad) * lengthPx, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 3. Rover 4 Treaded Wheels
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    // Front-Left
    ctx.fillRect(8, -19, 10, 6);
    ctx.strokeRect(8, -19, 10, 6);
    // Rear-Left
    ctx.fillRect(-18, -19, 10, 6);
    ctx.strokeRect(-18, -19, 10, 6);
    // Front-Right
    ctx.fillRect(8, 13, 10, 6);
    ctx.strokeRect(8, 13, 10, 6);
    // Rear-Right
    ctx.fillRect(-18, 13, 10, 6);
    ctx.strokeRect(-18, 13, 10, 6);

    // 4. Main Ruggedized Chassis
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = pose.isStuck ? '#ef4444' : navMode === 'AUTONOMOUS' ? '#00f0ff' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-16, -13, 32, 26, 4);
    ctx.fill();
    ctx.stroke();

    // Electronic Bay Hatch
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-10, -8, 20, 16);

    // Status Microcontroller LEDs
    ctx.fillStyle = navMode === 'AUTONOMOUS' ? '#00f0ff' : '#10b981';
    ctx.beginPath();
    ctx.arc(-4, -3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(-4, 3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Front Camera / Sensor Turret Marker
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(12, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Direction Vector Arrow
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(8, 0);
    ctx.lineTo(5, -3);
    ctx.moveTo(8, 0);
    ctx.lineTo(5, 3);
    ctx.stroke();

    ctx.restore();
  }, [pose, pathTrail, showGasZones, showWaypoints, waypoints, currentWaypointIndex, sonarScan, navMode]);

  // Directives
  const handleStartMission = () => {
    audioService.playClick();
    setSystemState('SCANNING');
    onLogEvent('ACTION', `${navMode} mission initiated. Commencing reconnaissance.`);
  };

  const handlePauseMission = () => {
    audioService.playClick();
    setSystemState('PAUSED');
    onLogEvent('ACTION', 'Mission paused by supervisor.');
  };

  const handleResumeMission = () => {
    audioService.playClick();
    setSystemState('SCANNING');
    onLogEvent('ACTION', 'Mission resumed.');
  };

  const handleStopMission = () => {
    audioService.playClick();
    setSystemState('IDLE');
    setPose((p) => ({ ...p, isMoving: false }));
    onLogEvent('ACTION', 'Mission stopped. Rover standing by.');
  };

  const handleResetPosition = () => {
    audioService.playClick();
    setPose(INITIAL_ROVER_POSE);
    setCollisionWarning(null);
    onLogEvent('ACTION', 'Rover coordinates recalibrated to Manhole Access #1.');
  };

  const currentWp = waypoints[currentWaypointIndex] || waypoints[0];

  const getSubStateDisplay = () => {
    switch (autoSubState) {
      case 'TRAVERSING_WAYPOINT':
        return { label: `TRAVERSING TO ${currentWp.id.toUpperCase()}`, color: 'text-cyan-300' };
      case 'AVOIDING_OBSTACLE':
        return { label: 'OBSTACLE EVASION STEERING', color: 'text-amber-400' };
      case 'SAMPLE_HOLD':
        return { label: 'SAMPLE EQUILIBRATION HOLD', color: 'text-emerald-400' };
      case 'HAZARD_RETREAT':
        return { label: 'CRITICAL HAZARD EMERGENCY RETREAT', color: 'text-rose-400' };
      case 'RETURNING_HOME':
        return { label: 'RETURNING TO BASE (RTH)', color: 'text-sky-300' };
      case 'PATROL_COMPLETE':
        return { label: 'AUTONOMOUS PATROL COMPLETED', color: 'text-emerald-300' };
      case 'IDLE':
      default:
        return { label: 'AUTONOMOUS PILOT READY', color: 'text-slate-300' };
    }
  };

  const subStateInfo = getSubStateDisplay();

  return (
    <div className="bg-[#0b1220] border border-hazard-border rounded-lg p-3 flex flex-col h-full shadow-lg">
      {/* Top Bar: Title & Mode Toggle HUD */}
      <div className="flex flex-wrap items-center justify-between pb-2 border-b border-hazard-border/60 text-xs gap-2">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-cyan-400" />
          <span className="font-mono font-bold tracking-wider text-slate-100">
            ROVER LIVE CONDUIT TOPOLOGY
          </span>

          {/* Autonomy Mode Switcher */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded border border-slate-700 font-mono text-[10px]">
            <button
              onClick={() => {
                audioService.playClick();
                setNavMode('AUTONOMOUS');
                onLogEvent('AUTONOMOUS', 'Autonomous Scout Pilot engaged. Computing waypoint trajectory.');
              }}
              className={`px-2 py-0.5 rounded flex items-center space-x-1 font-bold transition ${
                navMode === 'AUTONOMOUS'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-3 h-3" />
              <span>AUTONOMOUS</span>
            </button>

            <button
              onClick={() => {
                audioService.playClick();
                setNavMode('MANUAL');
                onLogEvent('ACTION', 'Switched to Manual Teleoperation.');
              }}
              className={`px-2 py-0.5 rounded flex items-center space-x-1 font-bold transition ${
                navMode === 'MANUAL'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>MANUAL</span>
            </button>
          </div>
        </div>

        {/* HUD Quick Values */}
        <div className="flex items-center space-x-3 font-mono text-[11px] text-slate-400">
          <div>
            POS: <span className="text-slate-200">X:{Math.round(pose.x)} Y:{Math.round(pose.y)}</span>
          </div>
          <div>
            HDG: <span className="text-cyan-300">{Math.round(pose.headingDeg)}°</span>
          </div>
          <div>
            DIST: <span className="text-emerald-300 font-semibold">{totalDistanceM} m</span>
          </div>
          <button
            onClick={() => setShowWaypoints(!showWaypoints)}
            className={`px-1.5 py-0.5 rounded text-[10px] transition border ${
              showWaypoints
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle autonomous waypoint overlays"
          >
            {showWaypoints ? 'WAYPOINTS: ON' : 'WAYPOINTS: OFF'}
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative my-2 rounded border border-slate-800 overflow-hidden bg-black flex-1 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="w-full h-auto max-h-[380px] object-contain block scada-grid"
        />

        {/* Collision Warning Banner */}
        {collisionWarning && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-rose-950/90 border border-rose-500 text-rose-200 text-xs font-mono font-bold rounded shadow-lg flex items-center space-x-2 animate-bounce">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>{collisionWarning}</span>
          </div>
        )}

        {/* Top-Left Autonomy Status Overlay */}
        <div className="absolute top-3 left-3 bg-[#0b1220]/90 backdrop-blur border border-cyan-500/40 p-2 rounded text-[10px] font-mono space-y-1 shadow-lg pointer-events-none">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-1">
            <span className={`w-2 h-2 rounded-full ${navMode === 'AUTONOMOUS' ? 'bg-cyan-400 animate-ping' : 'bg-amber-400'}`}></span>
            <span className="font-bold text-slate-200">
              MODE: {navMode}
            </span>
          </div>
          {navMode === 'AUTONOMOUS' && (
            <>
              <div className="text-slate-400">
                STATUS: <span className={`font-bold ${subStateInfo.color}`}>{subStateInfo.label}</span>
              </div>
              <div className="text-slate-400 flex items-center gap-1.5">
                <span>TARGET:</span>
                <span className="text-cyan-300 font-bold">{currentWp.label}</span>
                <span className="text-slate-500">({currentWp.x}, {currentWp.y})</span>
              </div>
            </>
          )}
        </div>

        {/* Compass Rosette overlay in top-right */}
        <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur border border-slate-700 p-1.5 rounded text-[10px] font-mono flex items-center space-x-1 text-slate-300">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>{Math.round(pose.headingDeg)}° N</span>
        </div>

        {/* Bottom Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur border border-slate-800 px-2 py-1 rounded text-[10px] font-mono text-slate-400 flex items-center gap-2">
          <span className="flex items-center gap-1">
            <Radar className="w-3 h-3 text-purple-400" />
            Sonar Radar: 5-Beam Active
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Waypoints: {waypoints.filter((w) => w.completed).length}/{waypoints.length}
          </span>
        </div>
      </div>

      {/* Interactive Controls Bar: Mission Actions + Autonomy Controller or D-Pad */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-hazard-border/60">
        {/* Col 1: Mission Directives */}
        <div className="flex flex-col justify-center space-y-1.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
            MISSION DIRECTIVES
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {systemState === 'IDLE' || systemState === 'RETURNING' ? (
              <button
                onClick={handleStartMission}
                className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-mono font-bold transition shadow-sm"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>START MISSION</span>
              </button>
            ) : systemState === 'PAUSED' ? (
              <button
                onClick={handleResumeMission}
                className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-mono font-bold transition shadow-sm"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>RESUME</span>
              </button>
            ) : (
              <button
                onClick={handlePauseMission}
                className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-mono font-bold transition shadow-sm"
              >
                <Pause className="w-3 h-3 fill-current" />
                <span>PAUSE</span>
              </button>
            )}

            <button
              onClick={handleStopMission}
              className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-mono font-medium transition"
            >
              <Square className="w-3 h-3" />
              <span>STOP</span>
            </button>

            <button
              onClick={() => {
                audioService.playClick();
                onReturnToBase();
              }}
              className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-cyan-900/70 hover:bg-cyan-800 text-cyan-200 border border-cyan-500/40 rounded text-xs font-mono font-medium transition"
              title="Autonomous Return-to-Base along mapped trail"
            >
              <CornerUpLeft className="w-3 h-3" />
              <span>RETURN BASE</span>
            </button>

            <button
              onClick={handleResetPosition}
              className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-xs font-mono font-medium transition"
              title="Reset rover coordinates to manhole drop"
            >
              <Crosshair className="w-3 h-3" />
              <span>RECALIBRATE</span>
            </button>
          </div>
        </div>

        {/* Col 2: Contextual Controls (Autonomous Waypoint Manager OR Manual D-Pad) */}
        {navMode === 'AUTONOMOUS' ? (
          <div className="flex flex-col justify-center space-y-1.5 bg-[#070b13] p-2 rounded border border-cyan-500/30 font-mono text-xs">
            <div className="flex items-center justify-between text-[10px] text-cyan-300 font-bold border-b border-slate-800 pb-1">
              <span className="flex items-center gap-1">
                <Bot className="w-3 h-3" /> AUTONOMOUS SCOUT PLAN
              </span>
              <span>WP {currentWaypointIndex + 1}/{waypoints.length}</span>
            </div>

            <div className="text-[11px] text-slate-200 truncate font-semibold">
              {currentWp.label}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {currentWp.description}
            </div>

            <div className="flex items-center space-x-1.5 pt-1">
              <button
                onClick={() => {
                  audioService.playClick();
                  onSkipWaypoint();
                }}
                className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-[10px] font-bold flex items-center justify-center space-x-1 transition"
                title="Skip to next inspection waypoint"
              >
                <SkipForward className="w-3 h-3" />
                <span>NEXT WAYPOINT</span>
              </button>

              <button
                onClick={() => {
                  audioService.playClick();
                  setNavMode('MANUAL');
                }}
                className="py-1 px-2 rounded bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-600/40 text-[10px] font-bold transition"
                title="Take manual steering control"
              >
                MANUAL OVERRIDE
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold mb-1">
              MANUAL TELEOPERATION D-PAD
            </span>
            <div className="flex flex-col items-center gap-1">
              <button
                onMouseDown={() => moveRoverManual(1, 0)}
                className="w-10 h-8 flex items-center justify-center bg-slate-800 hover:bg-cyan-600 active:bg-cyan-500 text-slate-200 rounded border border-slate-700 transition"
                title="Drive Forward (W / Up Arrow)"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                <button
                  onMouseDown={() => moveRoverManual(0, -1)}
                  className="w-10 h-8 flex items-center justify-center bg-slate-800 hover:bg-cyan-600 active:bg-cyan-500 text-slate-200 rounded border border-slate-700 transition"
                  title="Rotate Left (A / Left Arrow)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPose((p) => ({ ...p, isMoving: false }))}
                  className="w-10 h-8 flex items-center justify-center bg-rose-950/70 hover:bg-rose-900 text-rose-300 rounded border border-rose-700/60 transition"
                  title="Brake / Stop (Spacebar)"
                >
                  <Hand className="w-4 h-4" />
                </button>
                <button
                  onMouseDown={() => moveRoverManual(0, 1)}
                  className="w-10 h-8 flex items-center justify-center bg-slate-800 hover:bg-cyan-600 active:bg-cyan-500 text-slate-200 rounded border border-slate-700 transition"
                  title="Rotate Right (D / Right Arrow)"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
              <button
                onMouseDown={() => moveRoverManual(-1, 0)}
                className="w-10 h-8 flex items-center justify-center bg-slate-800 hover:bg-cyan-600 active:bg-cyan-500 text-slate-200 rounded border border-slate-700 transition"
                title="Drive Reverse (S / Down Arrow)"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Col 3: Autonomy Guidance & Telemetry Notes */}
        <div className="flex flex-col justify-center space-y-1.5 text-[11px] font-mono text-slate-400 bg-slate-900/50 p-2 rounded border border-slate-800">
          <div className="text-slate-300 font-semibold flex items-center justify-between">
            <span>AUTONOMOUS AGENT</span>
            <span className="text-[10px] text-cyan-400 font-bold">REACTIVE CONDUIT AGENT</span>
          </div>
          <div className="text-[10px] space-y-0.5 text-slate-300">
            <div>• Target pursuit with proportional steering</div>
            <div>• 5-beam acoustic ultrasonic wall repulsion</div>
            <div>• Critical hazard interlock & automatic reverse</div>
          </div>
          <div className="pt-1 border-t border-slate-800 text-[10px] text-emerald-400 flex items-center justify-between">
            <span>COLLISION GUARD:</span>
            <span className="font-bold">ACTIVE (PHYSICS + ACOUSTIC)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
