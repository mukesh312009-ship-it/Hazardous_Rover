export type SystemState = 'IDLE' | 'SCANNING' | 'RETURNING' | 'HAZARD_DETECTED' | 'PAUSED';

export type NavigationMode = 'AUTONOMOUS' | 'MANUAL';

export type AutonomousSubState = 
  | 'IDLE' 
  | 'TRAVERSING_WAYPOINT' 
  | 'AVOIDING_OBSTACLE' 
  | 'SAMPLE_HOLD' 
  | 'HAZARD_RETREAT' 
  | 'RETURNING_HOME' 
  | 'PATROL_COMPLETE';

export type AlertSeverity = 'NORMAL' | 'WARNING' | 'CRITICAL';

export type ScenarioType = 
  | 'NORMAL' 
  | 'LOW_OXYGEN' 
  | 'GAS_LEAK' 
  | 'HIGH_TEMP' 
  | 'WATER_INTRUSION' 
  | 'MULTIPLE_HAZARDS';

export interface SensorReadings {
  oxygenPct: number;          // % vol, baseline ~20.9%
  h2sPpm: number;             // ppm, baseline ~0.0 - 0.5 ppm
  coPpm: number;              // ppm, baseline ~1 - 4 ppm
  temperatureC: number;       // °C, baseline ~23°C
  humidityRh: number;         // % RH, baseline ~60%
  waterDetected: boolean;     // FC-37 boolean state
  obstacleDistanceCm: number; // HC-SR04 ultrasonic distance in cm
}

export interface TelemetryPoint extends SensorReadings {
  timestamp: string;          // ISO string
  timeLabel: string;          // HH:mm:ss
  batteryPct: number;         // 0 - 100%
  rssiDbm: number;            // -90 to -40 dBm
  simulatedDistanceM: number; // meters from spawn
}

export interface ThresholdConfig {
  o2WarnLow: number;          // Default: 19.5%
  o2CritLow: number;          // Default: 18.0%
  h2sWarnHigh: number;        // Default: 5 ppm
  h2sCritHigh: number;        // Default: 10 ppm
  coWarnHigh: number;         // Default: 25 ppm
  coCritHigh: number;         // Default: 50 ppm
  tempWarnHigh: number;       // Default: 40°C
  tempCritHigh: number;       // Default: 50°C
  obstacleWarnDistCm: number; // Default: 25 cm
}

export interface AlertEvent {
  id: string;
  timestamp: string;
  channel: 'OXYGEN' | 'H2S' | 'CO' | 'TEMPERATURE' | 'WATER' | 'OBSTACLE' | 'BATTERY' | 'SYSTEM';
  severity: 'WARNING' | 'CRITICAL';
  message: string;
  valueString: string;
  acknowledged: boolean;
  ackTimestamp?: string;
}

export interface MissionLogEntry {
  id: string;
  timestamp: string;
  type: 'INFO' | 'ACTION' | 'HAZARD' | 'RETURN' | 'COLLISION' | 'AUTONOMOUS';
  description: string;
}

export interface RoverPose {
  x: number;            // simulation canvas coordinates
  y: number;
  headingDeg: number;   // 0 = right, 90 = down, 180 = left, 270 = up
  speed: number;        // pixels per frame
  isMoving: boolean;
  isStuck: boolean;     // true when colliding with obstacle
}

export interface Waypoint {
  id: string;
  label: string;
  x: number;
  y: number;
  description: string;
  completed: boolean;
}

export interface SewerMapObstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'wall' | 'debris' | 'pipe' | 'junction';
  label?: string;
}

export interface WaterHazardZone {
  id: string;
  x: number;
  y: number;
  radius: number;
  intensity: 'shallow' | 'flooded';
}

export interface GasHazardZone {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: 'h2s_pocket' | 'low_o2_pocket' | 'heat_pocket';
  peakH2s?: number;
  troughO2?: number;
  peakTemp?: number;
}
