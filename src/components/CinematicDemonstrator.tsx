import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Download, 
  Video, 
  Sparkles, 
  ShieldAlert, 
  Radio, 
  Activity, 
  Cpu, 
  Layers, 
  X,
  FastForward,
  Rewind,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { audioService } from '../services/audioService';

interface CinematicDemonstratorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SceneMeta {
  id: number;
  title: string;
  subtitle: string;
  startSec: number;
  endSec: number;
  narration: string;
  badge: string;
}

const SCENES: SceneMeta[] = [
  {
    id: 1,
    title: 'THE PROBLEM',
    subtitle: 'PEOPLE ENTER BLIND INTO SPACES THAT CAN TURN LETHAL.',
    startSec: 0,
    endSec: 15,
    narration: 'Every day, workers enter confined spaces such as sewers, manholes and industrial tanks without knowing the environmental conditions inside. One wrong entry can become life-threatening.',
    badge: 'SCENE 1 // THE CONFINED SPACE PROBLEM'
  },
  {
    id: 2,
    title: 'INTRODUCING HAZARDSCOUT',
    subtitle: 'LET THE ROVER INSPECT BEFORE HUMANS ENTER.',
    startSec: 15,
    endSec: 30,
    narration: 'Introducing HazardScout, a low-cost IoT-based safety rover designed to inspect hazardous confined spaces before human entry.',
    badge: 'SCENE 2 // SYSTEM REVEAL & ARCHITECTURE'
  },
  {
    id: 3,
    title: 'ROVER CONDUIT TRAVERSAL',
    subtitle: 'REMOTELY OPERATED CONDUIT RECONNAISSANCE.',
    startSec: 30,
    endSec: 45,
    narration: 'The rover enters the confined space first, carrying multiple sensors to continuously monitor the surrounding environment.',
    badge: 'SCENE 3 // RECONNAISSANCE TRAVERSAL'
  },
  {
    id: 4,
    title: 'SENSOR MONITORING ARRAY',
    subtitle: 'MULTI-CHANNEL ATMOSPHERIC & PHYSICAL TRANSDUCERS.',
    startSec: 45,
    endSec: 65,
    narration: 'Multiple sensors continuously monitor gas-related readings, oxygen concentration, temperature, humidity, water presence and nearby obstacles. The ESP32 collects and processes this information.',
    badge: 'SCENE 4 // SENSOR TRANSDUCTION'
  },
  {
    id: 5,
    title: 'REMOTE DASHBOARD & ALERTS',
    subtitle: 'HAZARDSCOUT — LIVE ENVIRONMENT MONITORING',
    startSec: 65,
    endSec: 85,
    narration: 'Using ESP32 Wi-Fi connectivity, the sensor data is transmitted to a remote dashboard. Supervisors can monitor environmental conditions in real time and receive alerts when readings cross predefined thresholds.',
    badge: 'SCENE 5 // TELEMETRY & ALARM DISPATCH'
  },
  {
    id: 6,
    title: 'SAFETY IMPACT & FUTURE VISION',
    subtitle: 'INTELLIGENT CONFINED-SPACE INSPECTION PLATFORM.',
    startSec: 85,
    endSec: 105,
    narration: 'HazardScout aims to reduce unnecessary human exposure to dangerous environments. With future upgrades such as LiDAR mapping, camera inspection and advanced industrial sensors, it can become an intelligent confined-space inspection platform.',
    badge: 'SCENE 6 // IMPACT & FUTURE VISION'
  },
  {
    id: 7,
    title: 'HAZARDSCOUT',
    subtitle: 'INSPECT FIRST. PROTECT HUMAN LIVES. SMARTER INSPECTION. SAFER WORKPLACES.',
    startSec: 105,
    endSec: 115,
    narration: 'HazardScout. Inspect First. Protect Human Lives. Smarter inspection, safer workplaces.',
    badge: 'FINAL SCENE // PROJECT CONCLUSION'
  }
];

export const CinematicDemonstrator: React.FC<CinematicDemonstratorProps> = ({
  isOpen,
  onClose
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);

  // MediaRecorder ref
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Three.js internal references
  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    roverGroup: THREE.Group;
    workerGroup: THREE.Group;
    tunnelGroup: THREE.Group;
    hudGroup: THREE.Group;
    wheels: THREE.Mesh[];
    ultrasonicPulses: THREE.Mesh[];
    gasParticles: THREE.Points;
    headlightCone: THREE.SpotLight;
    headlightTarget: THREE.Object3D;
    clock: THREE.Clock;
    animFrameId: number;
  } | null>(null);

  const activeSceneIndex = Math.min(
    SCENES.length - 1,
    SCENES.findIndex((s) => currentTimeSec >= s.startSec && currentTimeSec < s.endSec) === -1
      ? SCENES.length - 1
      : SCENES.findIndex((s) => currentTimeSec >= s.startSec && currentTimeSec < s.endSec)
  );

  const activeScene = SCENES[activeSceneIndex];

  // Narration playback trigger on scene boundary
  const lastNarratedSceneRef = useRef<number>(-1);

  useEffect(() => {
    if (!isOpen) {
      audioService.stopCinematicMusic();
      audioService.stopNarration();
      return;
    }

    if (isPlaying && !isAudioMuted) {
      if (lastNarratedSceneRef.current !== activeSceneIndex) {
        lastNarratedSceneRef.current = activeSceneIndex;
        // Adjust music intensity based on scene
        const musicIntensity = activeSceneIndex === 0 || activeSceneIndex === 4 
          ? 'tension' 
          : activeSceneIndex === 6 
          ? 'heroic' 
          : 'ambient';
        audioService.startCinematicMusic(musicIntensity);
        audioService.speakNarration(activeScene.narration);
      }
    } else {
      audioService.stopCinematicMusic();
      audioService.stopNarration();
    }
  }, [isOpen, isPlaying, isAudioMuted, activeSceneIndex, activeScene]);

  // Master timeline tick loop
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTimeSec((t) => {
        if (t >= 115) {
          setIsPlaying(false);
          return 115;
        }
        return parseFloat((t + 0.1).toFixed(1));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, isPlaying]);

  // Initialize Three.js 3D Scene
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = 1920;
    const height = 1080;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x060c18, 0.035);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 3, 7);

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0x0a1628, 1.2);
    scene.add(ambientLight);

    const studioKeyLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    studioKeyLight.position.set(5, 8, 5);
    studioKeyLight.castShadow = true;
    scene.add(studioKeyLight);

    const rimLight = new THREE.DirectionalLight(0x00f0ff, 2.2);
    rimLight.position.set(-6, 4, -4);
    scene.add(rimLight);

    // --- 1. SUBTERRANEAN SEWER TUNNEL ENVIRONMENT ---
    const tunnelGroup = new THREE.Group();

    // Arch Tunnel Walls & Ceiling
    const tunnelGeo = new THREE.CylinderGeometry(5.5, 5.5, 60, 32, 1, true, -Math.PI / 2, Math.PI);
    const tunnelMat = new THREE.MeshStandardMaterial({
      color: 0x1a2234,
      roughness: 0.85,
      metalness: 0.25,
      side: THREE.BackSide
    });
    const tunnelMesh = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunnelMesh.rotation.z = Math.PI / 2;
    tunnelMesh.position.set(0, 0, -10);
    tunnelMesh.receiveShadow = true;
    tunnelGroup.add(tunnelMesh);

    // Wet Concrete Floor
    const floorGeo = new THREE.PlaneGeometry(12, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0c1322,
      roughness: 0.35,
      metalness: 0.65
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, -0.6, -10);
    floorMesh.receiveShadow = true;
    tunnelGroup.add(floorMesh);

    // Water Sump Gutter with Reflections
    const waterGeo = new THREE.PlaneGeometry(2.4, 60);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.05,
      metalness: 0.95,
      opacity: 0.85,
      transparent: true
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(0, -0.58, -10);
    tunnelGroup.add(waterMesh);

    // Overhead Drainage Riser Pipes with Flange Bands
    for (let p = -35; p <= 15; p += 10) {
      const pipeGeo = new THREE.CylinderGeometry(0.35, 0.35, 10, 16);
      const pipeMat = new THREE.MeshStandardMaterial({
        color: 0x22324e,
        roughness: 0.6,
        metalness: 0.8
      });
      const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
      pipeMesh.rotation.z = Math.PI / 2;
      pipeMesh.position.set(0, 3.8, p);
      tunnelGroup.add(pipeMesh);
    }

    // Vertical Access Manhole Shaft
    const shaftGeo = new THREE.CylinderGeometry(2.2, 2.2, 12, 24, 1, true);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x141d2e,
      roughness: 0.8,
      metalness: 0.3,
      side: THREE.BackSide
    });
    const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
    shaftMesh.position.set(0, 5.4, 0);
    tunnelGroup.add(shaftMesh);

    // Steel Ladder Rungs on Shaft Wall
    for (let r = 0; r <= 10; r += 0.8) {
      const rungGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
      const rungMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.3 });
      const rung = new THREE.Mesh(rungGeo, rungMat);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(0, r, 2.05);
      tunnelGroup.add(rung);
    }

    scene.add(tunnelGroup);

    // --- 2. 3D SAFETY WORKER MODEL (At Top of Manhole) ---
    const workerGroup = new THREE.Group();
    workerGroup.position.set(0, 10.6, 2.6);

    // Torso (High-Vis Safety Vest)
    const torsoGeo = new THREE.CylinderGeometry(0.45, 0.4, 1.4, 12);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.7 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    workerGroup.add(torso);

    // Safety Helmet
    const helmetGeo = new THREE.SphereGeometry(0.38, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.7);
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.4, roughness: 0.3 });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.set(0, 0.95, 0);
    workerGroup.add(helmet);

    // Head
    const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xd4a373 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.82, 0);
    workerGroup.add(head);

    scene.add(workerGroup);

    // --- 3. DETAILED 3D HAZARDSCOUT ROVER MODEL ---
    const roverGroup = new THREE.Group();
    roverGroup.position.set(0, 0, 0);

    // Ruggedized Chassis Base
    const chassisGeo = new THREE.BoxGeometry(1.6, 0.45, 2.2);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.85
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.28;
    chassis.castShadow = true;
    roverGroup.add(chassis);

    // Cyan Anodized Aluminum Top Armor Plate
    const topPlateGeo = new THREE.BoxGeometry(1.4, 0.08, 1.8);
    const topPlateMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.25,
      metalness: 0.9
    });
    const topPlate = new THREE.Mesh(topPlateGeo, topPlateMat);
    topPlate.position.set(0, 0.54, 0);
    roverGroup.add(topPlate);

    // 4 Wheels with Rubber Treads
    const wheels: THREE.Mesh[] = [];
    const wheelPositions = [
      [-0.95, 0.24, 0.75], // Front Left
      [0.95, 0.24, 0.75],  // Front Right
      [-0.95, 0.24, -0.75], // Rear Left
      [0.95, 0.24, -0.75]  // Rear Right
    ];

    wheelPositions.forEach((pos) => {
      const wGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.32, 20);
      const wMat = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.9,
        metalness: 0.1
      });
      const wheel = new THREE.Mesh(wGeo, wMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.castShadow = true;

      // Cyan Wheel Hub Rim
      const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.34, 12);
      const rimMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.9, roughness: 0.2 });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      wheel.add(rim);

      roverGroup.add(wheel);
      wheels.push(wheel);
    });

    // --- SENSORS & HARDWARE MODULES ON ROVER TOP ---

    // 1. ESP32 DevKit V1 Board
    const espGeo = new THREE.BoxGeometry(0.48, 0.08, 0.7);
    const espMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.5 }); // PCB Green
    const espBoard = new THREE.Mesh(espGeo, espMat);
    espBoard.position.set(0, 0.62, -0.15);
    roverGroup.add(espBoard);

    // ESP32 Metal Shielding Can
    const chipGeo = new THREE.BoxGeometry(0.32, 0.06, 0.35);
    const chipMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const chip = new THREE.Mesh(chipGeo, chipMat);
    chip.position.set(0, 0.67, -0.15);
    roverGroup.add(chip);

    // Flashing Wi-Fi Status LEDs
    const ledGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0.12, 0.72, -0.28);
    roverGroup.add(led);

    // 2. MQ-135 Gas Sensor (Metallic Perforated Mesh Cylinder)
    const mqGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.22, 16);
    const mqMat = new THREE.MeshStandardMaterial({ color: 0xa1a1aa, metalness: 0.85, roughness: 0.35 });
    const mqSensor = new THREE.Mesh(mqGeo, mqMat);
    mqSensor.position.set(-0.45, 0.7, 0.45);
    roverGroup.add(mqSensor);

    // 3. DFRobot Electrochemical O2 Sensor (Galvanic Cell Cylinder)
    const o2Geo = new THREE.CylinderGeometry(0.16, 0.16, 0.26, 16);
    const o2Mat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.25 }); // Gold-plated cell
    const o2Sensor = new THREE.Mesh(o2Geo, o2Mat);
    o2Sensor.position.set(0.45, 0.72, 0.45);
    roverGroup.add(o2Sensor);

    // 4. Sensirion SHT31-F Temperature & Humidity Sensor
    const shtGeo = new THREE.BoxGeometry(0.18, 0.14, 0.18);
    const shtMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }); // White PTFE membrane
    const shtSensor = new THREE.Mesh(shtGeo, shtMat);
    shtSensor.position.set(-0.45, 0.65, -0.45);
    roverGroup.add(shtSensor);

    // 5. FC-37 / YL-83 Water Detection Probe (Underside Chassis)
    const fcGeo = new THREE.BoxGeometry(0.3, 0.04, 0.5);
    const fcMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85 }); // Gold parallel tracks
    const fcSensor = new THREE.Mesh(fcGeo, fcMat);
    fcSensor.position.set(0, 0.06, 0);
    roverGroup.add(fcSensor);

    // 6. HC-SR04 Ultrasonic Distance Sensor (Front Metallic "Eyes")
    const sonicBaseGeo = new THREE.BoxGeometry(0.5, 0.22, 0.06);
    const sonicBaseMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
    const sonicBase = new THREE.Mesh(sonicBaseGeo, sonicBaseMat);
    sonicBase.position.set(0, 0.55, 1.12);
    roverGroup.add(sonicBase);

    // Left and Right Transducers
    [-0.14, 0.14].forEach((xOffset) => {
      const coneGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.12, 16);
      const coneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.rotation.x = Math.PI / 2;
      cone.position.set(xOffset, 0.55, 1.18);
      roverGroup.add(cone);
    });

    // 7. L298N Motor Driver Module
    const l298Geo = new THREE.BoxGeometry(0.45, 0.25, 0.45);
    const l298Mat = new THREE.MeshStandardMaterial({ color: 0xb91c1c }); // Red PCB
    const l298 = new THREE.Mesh(l298Geo, l298Mat);
    l298.position.set(0.45, 0.68, -0.45);
    roverGroup.add(l298);

    // Motor Driver Aluminum Heatsink Fins
    const heatsinkGeo = new THREE.BoxGeometry(0.22, 0.28, 0.22);
    const heatsinkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.9 });
    const heatsink = new THREE.Mesh(heatsinkGeo, heatsinkMat);
    heatsink.position.set(0.45, 0.82, -0.45);
    roverGroup.add(heatsink);

    // 8. Dual High-Power LED Headlights & Volumetric Beams
    const headlightTarget = new THREE.Object3D();
    headlightTarget.position.set(0, 0, 15);
    scene.add(headlightTarget);

    const headlightCone = new THREE.SpotLight(0x00f0ff, 4.5, 30, Math.PI / 5, 0.35, 1.2);
    headlightCone.position.set(0, 0.55, 1.15);
    headlightCone.target = headlightTarget;
    headlightCone.castShadow = true;
    roverGroup.add(headlightCone);

    scene.add(roverGroup);

    // --- 4. ANIMATED ULTRASONIC WAVE RINGS ---
    const ultrasonicPulses: THREE.Mesh[] = [];
    for (let u = 0; u < 4; u++) {
      const ringGeo = new THREE.TorusGeometry(0.2 + u * 0.35, 0.025, 8, 24, Math.PI);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xc084fc,
        transparent: true,
        opacity: 0.6 - u * 0.12
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 0.55, 1.6 + u * 0.7);
      ring.visible = false;
      roverGroup.add(ring);
      ultrasonicPulses.push(ring);
    }

    // --- 5. TOXIC GAS HAZARD PARTICLES (Floating sewer miasma) ---
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 8;
      particlePositions[i + 1] = Math.random() * 4;
      particlePositions[i + 2] = (Math.random() - 0.5) * 30;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xef4444,
      size: 0.14,
      transparent: true,
      opacity: 0.45
    });
    const gasParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(gasParticles);

    // HUD Group for future tech holographic LiDAR rings (Scene 6)
    const hudGroup = new THREE.Group();
    const lidarRingGeo = new THREE.RingGeometry(1.8, 1.86, 32);
    const lidarRingMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide });
    const lidarRing = new THREE.Mesh(lidarRingGeo, lidarRingMat);
    lidarRing.rotation.x = -Math.PI / 2;
    lidarRing.position.set(0, 0.4, 0);
    hudGroup.add(lidarRing);
    roverGroup.add(hudGroup);
    hudGroup.visible = false;

    const clock = new THREE.Clock();

    // --- ANIMATION / RENDER TICK LOOP ---
    const animate = () => {
      const animFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Read current simulated video time from parent state via ref/canvas
      const time = currentTimeSec;

      // Animate wheels rotation based on rover motion
      const isMoving = time >= 30 && time < 45 || time >= 65 && time < 85;
      if (isMoving) {
        wheels.forEach((w) => {
          w.rotation.x += delta * 6;
        });
      }

      // Animate floating toxic gas particles
      const positions = gasParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < particleCount * 3; i += 3) {
        positions[i] += delta * 0.25;
        if (positions[i] > 6) positions[i] = 0;
      }
      gasParticles.geometry.attributes.position.needsUpdate = true;

      // Animate Ultrasonic Pulse Waves (Active in Scene 4 & 5)
      if (time >= 45 && time < 65) {
        ultrasonicPulses.forEach((pulse, idx) => {
          pulse.visible = true;
          pulse.position.z = 1.3 + ((elapsed * 2 + idx * 0.8) % 4.5);
          (pulse.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - (pulse.position.z - 1.3) / 4.5);
        });
      } else {
        ultrasonicPulses.forEach((pulse) => {
          pulse.visible = false;
        });
      }

      // SCENE-BY-SCENE CINEMATIC CAMERA SYSTEM:
      if (time < 15) {
        // SCENE 1: THE PROBLEM (0-15s)
        // High crane shot descending down manhole shaft into toxic darkness
        const t1 = time / 15;
        camera.position.set(
          Math.sin(t1 * 0.8) * 2.5,
          11.5 - t1 * 6.5,
          6.5 - t1 * 2.5
        );
        camera.lookAt(0, 1.5 - t1 * 1.0, 0);
        roverGroup.position.set(0, -0.6, -2);
        hudGroup.visible = false;
        (gasParticles.material as THREE.PointsMaterial).color.setHex(0xef4444);
      } else if (time < 30) {
        // SCENE 2: INTRODUCING HAZARDSCOUT (15-30s)
        // 360-degree studio orbit reveal around rover
        const t2 = (time - 15) / 15;
        const angle = t2 * Math.PI * 1.5;
        const radius = 3.6 - Math.sin(t2 * Math.PI) * 0.6;
        camera.position.set(
          Math.cos(angle) * radius,
          1.8 + Math.sin(t2 * 2) * 0.3,
          Math.sin(angle) * radius
        );
        camera.lookAt(0, 0.45, 0);
        roverGroup.position.set(0, -0.6, 0);
        roverGroup.rotation.y = t2 * 0.4;
        hudGroup.visible = false;
      } else if (time < 45) {
        // SCENE 3: ROVER TRAVERSING CONFINED SPACE (30-45s)
        // Dynamic low-angle tracking camera following moving rover
        const t3 = (time - 30) / 15;
        const roverZ = -t3 * 16;
        roverGroup.position.set(Math.sin(t3 * 4) * 0.3, -0.6, roverZ);
        camera.position.set(
          roverGroup.position.x + 1.8,
          0.6,
          roverZ + 4.2
        );
        camera.lookAt(roverGroup.position.x, 0.2, roverZ - 6);
        hudGroup.visible = false;
      } else if (time < 65) {
        // SCENE 4: SENSOR MONITORING ARRAY (45-65s)
        // Extreme macro close-up camera sequence cycling through each sensor
        const t4 = (time - 45) / 20;
        roverGroup.position.set(0, -0.6, 0);
        roverGroup.rotation.y = 0;

        if (time < 49) {
          // MQ-135 Gas Sensor close-up
          camera.position.set(-0.8, 0.95, 0.95);
          camera.lookAt(-0.45, 0.7, 0.45);
        } else if (time < 53) {
          // Electrochemical O2 Sensor close-up
          camera.position.set(0.8, 0.95, 0.95);
          camera.lookAt(0.45, 0.72, 0.45);
        } else if (time < 57) {
          // SHT31-F Temp/Humidity close-up
          camera.position.set(-0.8, 0.85, -0.2);
          camera.lookAt(-0.45, 0.65, -0.45);
        } else if (time < 61) {
          // FC-37 Water Sensor underside close-up
          camera.position.set(0.6, -0.4, 0.5);
          camera.lookAt(0, -0.1, 0);
        } else {
          // HC-SR04 Ultrasonic Distance Sensor close-up
          camera.position.set(0, 0.8, 2.6);
          camera.lookAt(0, 0.55, 1.15);
        }
        hudGroup.visible = false;
      } else if (time < 85) {
        // SCENE 5: REMOTE DASHBOARD & ALERTS (65-85s)
        // High dramatic angle overlooking rover while SCADA telemetry overlays trigger alarm
        const t5 = (time - 65) / 20;
        camera.position.set(2.4, 2.6, 3.8);
        camera.lookAt(0, 0.3, 0);
        roverGroup.position.set(0, -0.6, 0);
        roverGroup.rotation.y = -0.3;
        hudGroup.visible = false;

        // Flash lights red if critical hazard alert is triggered (at ~72s)
        if (time >= 72) {
          headlightCone.color.setHex(Math.sin(elapsed * 12) > 0 ? 0xef4444 : 0x00f0ff);
        }
      } else if (time < 105) {
        // SCENE 6: SAFETY IMPACT & FUTURE VISION (85-105s)
        // Futuristic holographic wireframe overlays appear around rover
        const t6 = (time - 85) / 20;
        camera.position.set(
          Math.sin(t6 * Math.PI) * 3.2,
          1.8,
          Math.cos(t6 * Math.PI) * 3.2
        );
        camera.lookAt(0, 0.4, 0);
        roverGroup.position.set(0, -0.6, 0);
        hudGroup.visible = true;
        hudGroup.rotation.y += delta * 2;
        (gasParticles.material as THREE.PointsMaterial).color.setHex(0x10b981); // green safe scan
      } else {
        // FINAL SCENE: PROJECT ENDING (105-115s)
        // Low cinematic hero shot facing rover headlights with volumetric fog
        const t7 = (time - 105) / 10;
        camera.position.set(
          0,
          0.35 + t7 * 0.2,
          3.2 + t7 * 0.8
        );
        camera.lookAt(0, 0.4, 0);
        roverGroup.position.set(0, -0.6, 0);
        roverGroup.rotation.y = 0;
        hudGroup.visible = false;
        headlightCone.color.setHex(0x00f0ff);
      }

      renderer.render(scene, camera);
    };

    const animId = requestAnimationFrame(animate);

    threeRef.current = {
      renderer,
      scene,
      camera,
      roverGroup,
      workerGroup,
      tunnelGroup,
      hudGroup,
      wheels,
      ultrasonicPulses,
      gasParticles,
      headlightCone,
      headlightTarget,
      clock,
      animFrameId: animId
    };

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [isOpen, currentTimeSec]);

  // Video Recording Engine (WebM/MP4 Export)
  const startRecording = useCallback(() => {
    if (!canvasRef.current) return;
    try {
      audioService.playClick();
      recordedChunksRef.current = [];
      const stream = canvasRef.current.captureStream(30); // 30 FPS HD capture
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm'
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);
      };

      recorder.start(500);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setCurrentTimeSec(0);
      setIsPlaying(true);
    } catch {
      alert('Video recording not supported in this browser environment.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      audioService.playClick();
    }
  }, [isRecording]);

  const downloadVideo = () => {
    if (!recordedBlobUrl) return;
    const a = document.createElement('a');
    a.href = recordedBlobUrl;
    a.download = `HazardScout_3D_Cinematic_Demonstration.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const jumpToScene = (sec: number) => {
    audioService.playClick();
    setCurrentTimeSec(sec);
    setIsPlaying(true);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fadeIn font-mono">
      <div 
        ref={containerRef}
        className="relative w-full max-w-6xl bg-[#070b13] border-2 border-cyan-500/60 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh]"
      >
        {/* Top Control Header */}
        <div className="px-4 py-2.5 bg-[#0b1220] border-b border-hazard-border flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <Video className="w-5 h-5 text-cyan-400 animate-pulse" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-white tracking-wider text-sm flex items-center gap-1">
                  HAZARD<span className="text-cyan-400">SCOUT</span> 3D CINEMATIC DEMONSTRATION
                </span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold">
                  1080p 16:9 HD
                </span>
                {isRecording && (
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    REC
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-sans">
                Photorealistic 3D Industrial Robotics Technology Showcase • 90–120s Presentation
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Download Recorded Video */}
            {recordedBlobUrl && (
              <button
                onClick={downloadVideo}
                className="flex items-center space-x-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition text-xs shadow-md"
                title="Download Captured 3D Video File (.webm)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>DOWNLOAD VIDEO</span>
              </button>
            )}

            {/* Record Toggle */}
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-600/60 font-bold transition text-xs"
                title="Capture 3D Canvas stream to video file"
              >
                <Video className="w-3.5 h-3.5 text-rose-400" />
                <span>RECORD VIDEO</span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold transition text-xs animate-pulse"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>FINISH RECORDING</span>
              </button>
            )}

            {/* Mute Audio */}
            <button
              onClick={() => {
                const next = !isAudioMuted;
                setIsAudioMuted(next);
                audioService.setMuted(next);
              }}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title={isAudioMuted ? 'Unmute Narration & Soundtrack' : 'Mute Audio'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Close 3D Demonstrator"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 16:9 1080p WebGL Viewport Container */}
        <div className="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={1920}
            height={1080}
            className="w-full h-full object-cover block"
          />

          {/* Holographic Scene Badge (Top Left) */}
          <div className="absolute top-4 left-4 bg-[#0b1220]/80 backdrop-blur border border-cyan-500/50 px-3 py-1.5 rounded text-xs space-y-0.5 shadow-xl pointer-events-none">
            <div className="text-[10px] text-cyan-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              {activeScene.badge}
            </div>
            <div className="text-white text-xs font-bold tracking-wider">
              {activeScene.title}
            </div>
          </div>

          {/* Time & Resolution Badge (Top Right) */}
          <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-slate-700 px-2.5 py-1 rounded text-[11px] text-slate-300 flex items-center gap-2 pointer-events-none">
            <span className="text-cyan-400 font-bold">{currentTimeSec.toFixed(1)}s</span>
            <span className="text-slate-600">/</span>
            <span>115.0s</span>
          </div>

          {/* DYNAMIC SCENE TECHNICAL HUD OVERLAYS */}
          {/* SCENE 1 OVERLAY */}
          {activeSceneIndex === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center animate-fadeIn">
              <div className="bg-black/75 backdrop-blur-md border border-rose-500/80 p-6 rounded-xl max-w-2xl shadow-2xl space-y-3">
                <span className="px-2.5 py-1 rounded bg-rose-950 text-rose-300 border border-rose-600 text-xs font-bold tracking-widest">
                  CRITICAL WORKPLACE CONFINED SPACE RISK
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-wider text-rose-300 leading-tight">
                  "PEOPLE ENTER BLIND INTO SPACES THAT CAN TURN LETHAL."
                </h2>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 text-left pt-2 border-t border-slate-800">
                  <div>⚠️ Toxic Sewer Gas (H2S, CO)</div>
                  <div>⚠️ Rapid Oxygen Depletion (&lt;18%)</div>
                  <div>⚠️ High Thermal Duct Heat (&gt;50°C)</div>
                  <div>⚠️ Submerged Sump Liquid Traps</div>
                </div>
              </div>
            </div>
          )}

          {/* SCENE 2 OVERLAY */}
          {activeSceneIndex === 1 && (
            <div className="absolute bottom-16 left-6 pointer-events-none animate-slideUp">
              <div className="bg-black/80 backdrop-blur border border-cyan-500/70 p-4 rounded-lg max-w-md shadow-2xl space-y-2">
                <div className="text-2xl font-extrabold text-white tracking-widest flex items-center gap-2">
                  HAZARD<span className="text-cyan-400">SCOUT</span>
                </div>
                <div className="text-xs text-cyan-300 font-bold">
                  "LET THE ROVER INSPECT BEFORE HUMANS ENTER."
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  Dual-Core ESP32 • 4WD Geared TT Motors • 5-Transducer Environmental Array
                </div>
              </div>
            </div>
          )}

          {/* SCENE 3 OVERLAY */}
          {activeSceneIndex === 2 && (
            <div className="absolute top-16 right-6 pointer-events-none animate-fadeIn">
              <div className="bg-slate-900/85 backdrop-blur border border-cyan-500/40 p-3 rounded-lg text-xs space-y-1 text-slate-300 shadow-xl">
                <div className="text-cyan-400 font-bold flex items-center gap-1.5 border-b border-slate-800 pb-1">
                  <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  RECONNAISSANCE TELEOPERATION ACTIVE
                </div>
                <div>SURFACE: Wet Conduit Floor</div>
                <div>TRACTION: 4WD Skid-Steer Treads</div>
                <div>HEADLIGHTS: Dual Volumetric 0.8W LED</div>
              </div>
            </div>
          )}

          {/* SCENE 4 OVERLAY (Macro Sensor Telemetry) */}
          {activeSceneIndex === 3 && (
            <div className="absolute top-16 right-6 pointer-events-none animate-fadeIn">
              <div className="bg-black/85 backdrop-blur-md border border-cyan-400 p-4 rounded-xl text-xs space-y-2 shadow-2xl w-80">
                <div className="text-xs font-bold text-cyan-300 border-b border-slate-800 pb-1 flex items-center justify-between">
                  <span>TRANSDUCER MICRO-INSPECTION</span>
                  <span className="text-[10px] text-emerald-400">1000ms SAMPLING</span>
                </div>
                {currentTimeSec < 49 ? (
                  <div className="space-y-1">
                    <div className="text-amber-400 font-bold">MQ-135 AIR QUALITY SENSOR</div>
                    <div className="text-2xl font-black text-white">4.2 <span className="text-xs text-slate-400">ppm index</span></div>
                    <div className="text-[10px] text-slate-400">Heated SnO2 tin-dioxide ceramic probe measuring oxidizable gas concentration</div>
                  </div>
                ) : currentTimeSec < 53 ? (
                  <div className="space-y-1">
                    <div className="text-cyan-400 font-bold">DFRobot SEN0322 OXYGEN CELL</div>
                    <div className="text-2xl font-black text-cyan-300">20.8 <span className="text-xs text-slate-400">% vol</span></div>
                    <div className="text-[10px] text-slate-400">Electrochemical galvanic reaction generating proportional linear micro-voltage</div>
                  </div>
                ) : currentTimeSec < 57 ? (
                  <div className="space-y-1">
                    <div className="text-sky-400 font-bold">DFRobot SEN0334 (SHT31-F)</div>
                    <div className="text-2xl font-black text-white">22.8°C <span className="text-sm font-normal text-slate-400">/ 62% RH</span></div>
                    <div className="text-[10px] text-slate-400">Digital I2C environmental sensor with protective PTFE dust filter</div>
                  </div>
                ) : currentTimeSec < 61 ? (
                  <div className="space-y-1">
                    <div className="text-cyan-400 font-bold">FC-37 LIQUID CONTACT PROBE</div>
                    <div className="text-xl font-black text-cyan-300">SUMP WATER DETECTED</div>
                    <div className="text-[10px] text-slate-400">Underside parallel gold tracks detect puddle conduction resistance drop</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-purple-400 font-bold">HC-SR04 ULTRASONIC RANGING</div>
                    <div className="text-2xl font-black text-purple-300">18.4 <span className="text-xs text-slate-400">cm barrier</span></div>
                    <div className="text-[10px] text-slate-400">40kHz time-of-flight acoustic pulse wave echoes back from conduit wall</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SCENE 5 OVERLAY (Dashboard & Critical Alarm Dispatch) */}
          {activeSceneIndex === 4 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 animate-fadeIn">
              <div className="bg-[#0b1220]/95 backdrop-blur-md border-2 border-rose-500 rounded-xl p-5 max-w-2xl w-full shadow-2xl space-y-3 animate-alarmFlash">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <div className="flex items-center space-x-2 text-rose-400 font-bold">
                    <ShieldAlert className="w-5 h-5 animate-bounce" />
                    <span>HAZARDSCOUT — LIVE ENVIRONMENT MONITORING</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-200 border border-rose-600 text-[10px] font-bold">
                    TELEMETRY ALERT DISPATCH
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-900 p-2 rounded border border-rose-600/70">
                    <span className="text-[10px] text-slate-400 block">OXYGEN LEVEL</span>
                    <span className="text-lg font-bold text-rose-400">16.4% vol</span>
                    <span className="text-[9px] text-rose-300 block font-bold">CRITICAL DEFICIT</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-rose-600/70">
                    <span className="text-[10px] text-slate-400 block">H2S SEWER GAS</span>
                    <span className="text-lg font-bold text-rose-400">16.8 ppm</span>
                    <span className="text-[9px] text-rose-300 block font-bold">TOXIC SURGE</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">OBSTACLE DIST</span>
                    <span className="text-lg font-bold text-purple-300">18.0 cm</span>
                    <span className="text-[9px] text-amber-300 block">PROXIMITY</span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-rose-950/90 border border-rose-500 text-rose-200 text-xs text-center font-bold uppercase tracking-wider">
                  ⚠️ WARNING: OXYGEN LEVEL BELOW CONFIGURED LIMIT — HUMAN ENTRY NOT AUTHORIZED
                </div>
              </div>
            </div>
          )}

          {/* SCENE 6 OVERLAY (Future Roadmap Concepts) */}
          {activeSceneIndex === 5 && (
            <div className="absolute bottom-16 right-6 pointer-events-none animate-slideUp">
              <div className="bg-black/85 backdrop-blur border border-emerald-500/60 p-4 rounded-xl max-w-md shadow-2xl space-y-2">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 border-b border-slate-800 pb-1">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  FUTURE INDUSTRIAL UPGRADE ROADMAP
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-200">
                  <div>✓ 3D LiDAR SLAM Point Cloud</div>
                  <div>✓ 4K Live Camera Gimbal</div>
                  <div>✓ Autonomous Traversal AI</div>
                  <div>✓ Gas Chromatography Probe</div>
                  <div>✓ Cloud Data Telemetry Log</div>
                  <div>✓ LoRaWAN Long-Range Link</div>
                </div>
              </div>
            </div>
          )}

          {/* FINAL SCENE OVERLAY */}
          {activeSceneIndex === 6 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center animate-fadeIn">
              <div className="bg-black/80 backdrop-blur-md border-2 border-cyan-400 p-8 rounded-2xl max-w-3xl shadow-2xl space-y-4">
                <div className="text-4xl sm:text-5xl font-black text-white tracking-widest">
                  HAZARD<span className="text-cyan-400">SCOUT</span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-cyan-300 tracking-wider">
                  "INSPECT FIRST. PROTECT HUMAN LIVES."
                </div>
                <p className="text-sm font-semibold text-slate-300 tracking-wide uppercase">
                  "SMARTER INSPECTION. SAFER WORKPLACES."
                </p>
                <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-center gap-4">
                  <span>National College Engineering Hackathon</span>
                  <span>•</span>
                  <span>IoT & Robotics Innovation Division</span>
                </div>
              </div>
            </div>
          )}

          {/* Subtitle / Closed Caption Bar (Bottom Center) */}
          {showCaptions && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 pointer-events-none">
              <div className="bg-black/85 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-lg text-center text-xs text-slate-100 font-sans leading-relaxed shadow-2xl">
                <span className="text-cyan-400 font-bold font-mono mr-2">[NARRATION]:</span>
                {activeScene.narration}
              </div>
            </div>
          )}
        </div>

        {/* Video Timeline & Scrubbing Toolbar */}
        <div className="p-3 bg-[#0b1220] border-t border-hazard-border space-y-2">
          {/* Progress Slider */}
          <div className="flex items-center space-x-3 text-xs">
            <span className="text-[11px] text-cyan-400 font-bold min-w-[40px]">
              {currentTimeSec.toFixed(1)}s
            </span>
            <input
              type="range"
              min="0"
              max="115"
              step="0.1"
              value={currentTimeSec}
              onChange={(e) => jumpToScene(parseFloat(e.target.value))}
              className="flex-1 accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
            <span className="text-[11px] text-slate-400 min-w-[40px]">115.0s</span>
          </div>

          {/* Bottom Control Buttons & Scene Marker Selectors */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Play / Rewind / Fast Forward */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => {
                  audioService.playClick();
                  setCurrentTimeSec(0);
                  setIsPlaying(true);
                }}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                title="Restart from beginning"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => jumpToScene(Math.max(0, currentTimeSec - 5))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                title="Rewind 5s"
              >
                <Rewind className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  audioService.playClick();
                  setIsPlaying(!isPlaying);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow-md"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>

              <button
                onClick={() => jumpToScene(Math.min(115, currentTimeSec + 5))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                title="Fast Forward 5s"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowCaptions(!showCaptions)}
                className={`px-2 py-1 rounded border text-[10px] font-bold transition ${
                  showCaptions ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                CAPTIONS: {showCaptions ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Quick Scene Buttons */}
            <div className="flex items-center space-x-1 overflow-x-auto text-[10px]">
              {SCENES.map((sc, idx) => (
                <button
                  key={sc.id}
                  onClick={() => jumpToScene(sc.startSec)}
                  className={`px-2 py-1 rounded border transition font-bold shrink-0 ${
                    activeSceneIndex === idx
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                  title={`${sc.title} (${sc.startSec}s - ${sc.endSec}s)`}
                >
                  S{sc.id}: {sc.title.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
