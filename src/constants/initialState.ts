import { ThresholdConfig, SewerMapObstacle, WaterHazardZone, GasHazardZone, Waypoint } from '../types/telemetry';

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  o2WarnLow: 19.5,
  o2CritLow: 18.0,
  h2sWarnHigh: 5.0,
  h2sCritHigh: 10.0,
  coWarnHigh: 25.0,
  coCritHigh: 50.0,
  tempWarnHigh: 40.0,
  tempCritHigh: 50.0,
  obstacleWarnDistCm: 25.0
};

export const SENSOR_METADATA = {
  OXYGEN: {
    channel: 'Oxygen (O2)',
    unit: '% vol',
    normalRange: '19.5 - 21.0 %',
    proposedHardware: 'DFRobot SEN0322 (Electrochemical)',
    statusNote: 'SIMULATED - Dedicated galvanic cell sensor model',
    iconName: 'Wind',
    color: '#00f0ff'
  },
  H2S: {
    channel: 'Hydrogen Sulfide (H2S)',
    unit: 'ppm',
    normalRange: '0.0 - 1.0 ppm',
    proposedHardware: 'Hypothetical Gas-Selective Sensor (e.g. ME4-H2S)',
    statusNote: 'SIMULATED - Independent hypothetical channel (MQ-135 is NOT gas-selective)',
    iconName: 'Biohazard',
    color: '#ef4444'
  },
  CO: {
    channel: 'Carbon Monoxide (CO)',
    unit: 'ppm',
    normalRange: '0 - 10 ppm',
    proposedHardware: 'Hypothetical Gas-Selective Sensor (e.g. ME4-CO / MQ-7)',
    statusNote: 'SIMULATED - Independent hypothetical channel (MQ-135 is NOT gas-selective)',
    iconName: 'Flame',
    color: '#f59e0b'
  },
  TEMPERATURE: {
    channel: 'Ambient Temperature',
    unit: '°C',
    normalRange: '15.0 - 32.0 °C',
    proposedHardware: 'DFRobot SEN0334 (Sensirion SHT31-F)',
    statusNote: 'SIMULATED - Digital I2C environmental probe',
    iconName: 'Thermometer',
    color: '#38bdf8'
  },
  HUMIDITY: {
    channel: 'Relative Humidity',
    unit: '% RH',
    normalRange: '45.0 - 75.0 % RH',
    proposedHardware: 'DFRobot SEN0334 (Sensirion SHT31-F)',
    statusNote: 'SIMULATED - Digital I2C environmental probe',
    iconName: 'Droplets',
    color: '#60a5fa'
  },
  WATER: {
    channel: 'Water Ingress Detection',
    unit: 'State',
    normalRange: 'DRY',
    proposedHardware: 'FC-37 / YL-83 Conductive Rain/Water Sensor',
    statusNote: 'SIMULATED - Ground probe resistive detection array',
    iconName: 'Waves',
    color: '#06b6d4'
  },
  OBSTACLE: {
    channel: 'Ultrasonic Proximity',
    unit: 'cm',
    normalRange: '> 25.0 cm',
    proposedHardware: 'HC-SR04 Ultrasonic Ranging Transducer',
    statusNote: 'SIMULATED - Time-of-flight acoustic sensor (2cm - 400cm)',
    iconName: 'Radar',
    color: '#a855f7'
  }
};

// Underground Sewer / Conduit Obstacles (Canvas dimensions: 800 x 500)
export const SEWER_OBSTACLES: SewerMapObstacle[] = [
  // Outer perimeter boundary walls
  { id: 'wall-top', x: 20, y: 20, width: 760, height: 16, type: 'wall', label: 'Concrete Conduit North Wall' },
  { id: 'wall-bottom', x: 20, y: 464, width: 760, height: 16, type: 'wall', label: 'Concrete Conduit South Wall' },
  { id: 'wall-left', x: 20, y: 20, width: 16, height: 460, type: 'wall', label: 'Access Shaft Bulkhead' },
  { id: 'wall-right', x: 764, y: 20, width: 16, height: 460, type: 'wall', label: 'Outfall Gate Bulkhead' },
  
  // Internal conduit divider walls creating realistic inspection tunnel paths
  { id: 'int-pipe-1', x: 200, y: 20, width: 24, height: 180, type: 'pipe', label: 'Cast Iron Drainage Riser' },
  { id: 'int-pipe-2', x: 200, y: 280, width: 24, height: 200, type: 'pipe', label: 'Ventilation Diverter Pier' },
  { id: 'int-pipe-3', x: 380, y: 120, width: 28, height: 240, type: 'wall', label: 'Weir Partition Wall' },
  { id: 'int-pipe-4', x: 560, y: 20, width: 24, height: 200, type: 'pipe', label: 'Stormwater Siphon Pipe' },
  { id: 'int-pipe-5', x: 560, y: 300, width: 24, height: 180, type: 'pipe', label: 'Sewer Sediment Baffle' },

  // Debris & obstacles inside channels
  { id: 'debris-1', x: 80, y: 270, width: 34, height: 34, type: 'debris', label: 'Collapsed Masonry Debris' },
  { id: 'debris-2', x: 290, y: 60, width: 36, height: 30, type: 'debris', label: 'Rusted Flange Obstruction' },
  { id: 'debris-3', x: 470, y: 420, width: 34, height: 34, type: 'debris', label: 'Sediment Silt Blockage' },
  { id: 'debris-4', x: 670, y: 200, width: 36, height: 36, type: 'debris', label: 'Submerged Root Mass' }
];

// Standing Water Pools in Conduit
export const WATER_HAZARD_ZONES: WaterHazardZone[] = [
  { id: 'water-1', x: 290, y: 380, radius: 46, intensity: 'flooded' },
  { id: 'water-2', x: 670, y: 110, radius: 40, intensity: 'shallow' },
  { id: 'water-3', x: 470, y: 80, radius: 36, intensity: 'shallow' }
];

// Subterranean Gas Accumulation Pockets
export const GAS_HAZARD_ZONES: GasHazardZone[] = [
  { id: 'gas-1', x: 470, y: 240, radius: 80, type: 'h2s_pocket', peakH2s: 18.5, troughO2: 17.2 },
  { id: 'gas-2', x: 680, y: 380, radius: 75, type: 'low_o2_pocket', troughO2: 15.8, peakH2s: 14.0 },
  { id: 'gas-3', x: 120, y: 120, radius: 55, type: 'heat_pocket', peakTemp: 48.0 }
];

export const INITIAL_ROVER_POSE = {
  x: 75,
  y: 380,
  headingDeg: 0,
  speed: 0,
  isMoving: false,
  isStuck: false
};

// Autonomous Inspection Reconnaissance Waypoints
export const AUTONOMOUS_WAYPOINTS: Waypoint[] = [
  {
    id: 'wp-1',
    label: 'WP-1: Shaft Basin',
    x: 140,
    y: 380,
    description: 'Initial atmospheric baseline sweep at manhole base',
    completed: false
  },
  {
    id: 'wp-2',
    label: 'WP-2: West Chute',
    x: 140,
    y: 240,
    description: 'Northward conduit clearance & pipe junction check',
    completed: false
  },
  {
    id: 'wp-3',
    label: 'WP-3: Conduit Pier Hub',
    x: 290,
    y: 240,
    description: 'Drainage riser junction & central manifold',
    completed: false
  },
  {
    id: 'wp-4',
    label: 'WP-4: South Sump Basin',
    x: 290,
    y: 370,
    description: 'Puddle contact & liquid level conductive sampling',
    completed: false
  },
  {
    id: 'wp-5',
    label: 'WP-5: Gas Plume Zone',
    x: 470,
    y: 240,
    description: 'Atmospheric pocket evaluation (H2S / CO / O2)',
    completed: false
  },
  {
    id: 'wp-6',
    label: 'WP-6: Outfall Chamber',
    x: 650,
    y: 260,
    description: 'Subterranean outfall gate inspection',
    completed: false
  },
  {
    id: 'wp-7',
    label: 'WP-7: North Vent Gallery',
    x: 650,
    y: 80,
    description: 'Upper ventilation shaft airflow & thermal scan',
    completed: false
  },
  {
    id: 'wp-8',
    label: 'WP-8: Weir Partition North',
    x: 320,
    y: 80,
    description: 'High heat zone bypass & flange structural check',
    completed: false
  },
  {
    id: 'wp-9',
    label: 'WP-9: Return Inflow',
    x: 140,
    y: 140,
    description: 'West return conduit descent',
    completed: false
  },
  {
    id: 'wp-10',
    label: 'WP-10: Recovery Station',
    x: 75,
    y: 380,
    description: 'Autonomous recovery docking at Manhole Access #1',
    completed: false
  }
];
