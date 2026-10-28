import { 
  RoverPose, 
  SewerMapObstacle, 
  SensorReadings, 
  ScenarioType, 
  WaterHazardZone, 
  GasHazardZone, 
  Waypoint, 
  AutonomousSubState, 
  ThresholdConfig 
} from '../types/telemetry';
import { SEWER_OBSTACLES, WATER_HAZARD_ZONES, GAS_HAZARD_ZONES } from '../constants/initialState';

export const ROVER_COLLISION_RADIUS = 18; // Rover bounding circle radius in canvas pixels

/**
 * Checks whether a proposed circular position overlaps with any rectangular obstacle
 */
export function checkCollision(
  proposedX: number,
  proposedY: number,
  obstacles: SewerMapObstacle[] = SEWER_OBSTACLES,
  radius: number = ROVER_COLLISION_RADIUS
): { collided: boolean; obstacleName?: string } {
  for (const obs of obstacles) {
    // Find closest point on rectangle to circle center
    const closestX = Math.max(obs.x, Math.min(proposedX, obs.x + obs.width));
    const closestY = Math.max(obs.y, Math.min(proposedY, obs.y + obs.height));

    const distanceX = proposedX - closestX;
    const distanceY = proposedY - closestY;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;

    if (distanceSquared < radius * radius) {
      return { collided: true, obstacleName: obs.label || obs.id };
    }
  }
  return { collided: false };
}

/**
 * Raycasts from rover front sensor at a specific angle to determine distance to nearest obstacle
 */
export function raycastDistance(
  originX: number,
  originY: number,
  angleRad: number,
  obstacles: SewerMapObstacle[] = SEWER_OBSTACLES,
  maxRangePx: number = 240
): number {
  const stepPx = 3;
  const dirX = Math.cos(angleRad);
  const dirY = Math.sin(angleRad);

  for (let dist = 6; dist <= maxRangePx; dist += stepPx) {
    const testX = originX + dirX * dist;
    const testY = originY + dirY * dist;

    for (const obs of obstacles) {
      if (
        testX >= obs.x &&
        testX <= obs.x + obs.width &&
        testY >= obs.y &&
        testY <= obs.y + obs.height
      ) {
        return Math.round(dist * 1.5); // Convert to simulated cm
      }
    }
  }
  return Math.round(maxRangePx * 1.5);
}

/**
 * Raycasts from rover front sensor to determine distance to nearest obstacle
 * Mimics HC-SR04 ultrasonic cone (15-degree beam angle)
 */
export function calculateUltrasonicDistance(
  roverX: number,
  roverY: number,
  headingDeg: number,
  obstacles: SewerMapObstacle[] = SEWER_OBSTACLES
): number {
  const headingRad = (headingDeg * Math.PI) / 180;
  const sensorOffsetX = Math.cos(headingRad) * 16;
  const sensorOffsetY = Math.sin(headingRad) * 16;
  const originX = roverX + sensorOffsetX;
  const originY = roverY + sensorOffsetY;

  const leftDist = raycastDistance(originX, originY, headingRad - 0.2, obstacles);
  const centerDist = raycastDistance(originX, originY, headingRad, obstacles);
  const rightDist = raycastDistance(originX, originY, headingRad + 0.2, obstacles);

  return Math.max(4, Math.min(400, Math.min(leftDist, centerDist, rightDist)));
}

/**
 * Checks if rover is in any standing water puddle zone
 */
export function checkWaterSubmersion(
  roverX: number,
  roverY: number,
  waterZones: WaterHazardZone[] = WATER_HAZARD_ZONES
): boolean {
  for (const zone of waterZones) {
    const dx = roverX - zone.x;
    const dy = roverY - zone.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < zone.radius + 10) {
      return true;
    }
  }
  return false;
}

export interface AutoNavResult {
  nextPose: RoverPose;
  subState: AutonomousSubState;
  reachedWaypoint: boolean;
  sonarScan: { angleDeg: number; distanceCm: number }[];
  distanceIncrementM: number;
}

/**
 * Core Autonomous Reactive Navigation Controller
 * Combines Proportional Target Steering, Multi-Ray Acoustic Obstacle Avoidance,
 * and Critical Hazard Interlock Retreat
 */
export function computeAutonomousStep(
  currentPose: RoverPose,
  targetWaypoint: Waypoint,
  obstacles: SewerMapObstacle[] = SEWER_OBSTACLES,
  readings: SensorReadings,
  thresholds: ThresholdConfig,
  isCriticalHazard: boolean
): AutoNavResult {
  const headingRad = (currentPose.headingDeg * Math.PI) / 180;
  const sensorOffsetX = Math.cos(headingRad) * 16;
  const sensorOffsetY = Math.sin(headingRad) * 16;
  const originX = currentPose.x + sensorOffsetX;
  const originY = currentPose.y + sensorOffsetY;

  // 1. Multibeam Sonar Scan: Left (-35°), Center-Left (-15°), Center (0°), Center-Right (+15°), Right (+35°)
  const scanAngles = [-35, -15, 0, 15, 35];
  const sonarScan = scanAngles.map((degOffset) => {
    const rad = ((currentPose.headingDeg + degOffset) * Math.PI) / 180;
    const distCm = raycastDistance(originX, originY, rad, obstacles);
    return { angleDeg: currentPose.headingDeg + degOffset, distanceCm: distCm };
  });

  const forwardDist = sonarScan[2].distanceCm;
  const leftDist = (sonarScan[0].distanceCm + sonarScan[1].distanceCm) / 2;
  const rightDist = (sonarScan[3].distanceCm + sonarScan[4].distanceCm) / 2;

  // 2. Critical Hazard Retreat Interlock
  if (isCriticalHazard) {
    // Reverse away smoothly from the hazard zone
    const revRad = ((currentPose.headingDeg + 180) * Math.PI) / 180;
    const nextX = currentPose.x + Math.cos(revRad) * 2.0;
    const nextY = currentPose.y + Math.sin(revRad) * 2.0;

    const col = checkCollision(nextX, nextY, obstacles);
    if (!col.collided) {
      return {
        nextPose: {
          x: nextX,
          y: nextY,
          headingDeg: currentPose.headingDeg,
          speed: -2.0,
          isMoving: true,
          isStuck: false
        },
        subState: 'HAZARD_RETREAT',
        reachedWaypoint: false,
        sonarScan,
        distanceIncrementM: 0.04
      };
    }
  }

  // 3. Waypoint Proximity Check
  const dx = targetWaypoint.x - currentPose.x;
  const dy = targetWaypoint.y - currentPose.y;
  const distToTarget = Math.hypot(dx, dy);

  if (distToTarget < 22) {
    return {
      nextPose: {
        ...currentPose,
        isMoving: false,
        speed: 0
      },
      subState: 'SAMPLE_HOLD',
      reachedWaypoint: true,
      sonarScan,
      distanceIncrementM: 0
    };
  }

  // 4. Target Heading Computation
  let targetAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (targetAngleDeg < 0) targetAngleDeg += 360;

  // 5. Reactive Acoustic Obstacle Avoidance Bias
  let desiredHeading = targetAngleDeg;
  let subState: AutonomousSubState = 'TRAVERSING_WAYPOINT';

  if (forwardDist < 38) {
    subState = 'AVOIDING_OBSTACLE';
    // If forward corridor is blocked, bias steering toward side with greater clearance
    if (leftDist > rightDist) {
      desiredHeading = currentPose.headingDeg - 55;
    } else {
      desiredHeading = currentPose.headingDeg + 55;
    }
  }

  if (desiredHeading < 0) desiredHeading += 360;
  if (desiredHeading >= 360) desiredHeading -= 360;

  // Proportional smooth angular turn
  let angleDiff = desiredHeading - currentPose.headingDeg;
  while (angleDiff > 180) angleDiff -= 360;
  while (angleDiff < -180) angleDiff += 360;

  const maxTurnStep = forwardDist < 30 ? 7.0 : 4.5;
  const turnAmount = Math.max(-maxTurnStep, Math.min(maxTurnStep, angleDiff * 0.4));
  let nextHeading = currentPose.headingDeg + turnAmount;
  if (nextHeading < 0) nextHeading += 360;
  if (nextHeading >= 360) nextHeading -= 360;

  // Speed regulation: slow down if turning sharply or close to obstacles
  const speedScale = Math.max(0.35, 1 - Math.abs(angleDiff) / 120);
  const moveSpeed = (forwardDist < 25 ? 1.2 : 2.8) * speedScale;

  const nextHeadingRad = (nextHeading * Math.PI) / 180;
  const nextX = currentPose.x + Math.cos(nextHeadingRad) * moveSpeed;
  const nextY = currentPose.y + Math.sin(nextHeadingRad) * moveSpeed;

  // Check collision before applying
  const collision = checkCollision(nextX, nextY, obstacles);
  if (collision.collided) {
    // If blocked, turn away from collision point
    const altHeading = (currentPose.headingDeg + (leftDist > rightDist ? -40 : 40) + 360) % 360;
    return {
      nextPose: {
        ...currentPose,
        headingDeg: altHeading,
        isMoving: false,
        isStuck: false
      },
      subState: 'AVOIDING_OBSTACLE',
      reachedWaypoint: false,
      sonarScan,
      distanceIncrementM: 0
    };
  }

  return {
    nextPose: {
      x: nextX,
      y: nextY,
      headingDeg: nextHeading,
      speed: moveSpeed,
      isMoving: true,
      isStuck: false
    },
    subState,
    reachedWaypoint: false,
    sonarScan,
    distanceIncrementM: parseFloat((moveSpeed * 0.02).toFixed(3))
  };
}

/**
 * Computes environmental sensor readings based on current coordinates,
 * active gas/heat pockets in the sewer map, and selected demo scenario
 */
export function computeSensorReadings(
  pose: RoverPose,
  scenario: ScenarioType,
  currentReadings: SensorReadings,
  noiseEnabled: boolean,
  obstacles: SewerMapObstacle[] = SEWER_OBSTACLES,
  waterZones: WaterHazardZone[] = WATER_HAZARD_ZONES,
  gasZones: GasHazardZone[] = GAS_HAZARD_ZONES
): SensorReadings {
  // Ultrasonic distance from actual map geometry
  const obstacleDistanceCm = calculateUltrasonicDistance(pose.x, pose.y, pose.headingDeg, obstacles);

  // Water detection from physical puddle contact
  let waterDetected = checkWaterSubmersion(pose.x, pose.y, waterZones);

  // Nominal subterranean atmosphere baseline
  let targetO2 = 20.9;
  let targetH2s = 0.2;
  let targetCo = 2.5;
  let targetTemp = 22.8;
  let targetHumidity = 62.0;

  // 1. Natural geographical micro-climate zone influences
  for (const zone of gasZones) {
    const dx = pose.x - zone.x;
    const dy = pose.y - zone.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < zone.radius) {
      const factor = 1 - dist / zone.radius;

      if (zone.type === 'h2s_pocket') {
        targetH2s += (zone.peakH2s || 16.0) * factor;
        targetO2 -= ((20.9 - (zone.troughO2 || 17.5)) * factor);
      } else if (zone.type === 'low_o2_pocket') {
        targetO2 -= ((20.9 - (zone.troughO2 || 16.0)) * factor);
        targetCo += 14.0 * factor;
      } else if (zone.type === 'heat_pocket') {
        targetTemp += ((zone.peakTemp || 46.0) - 22.8) * factor;
      }
    }
  }

  // 2. Scenario overrides
  switch (scenario) {
    case 'LOW_OXYGEN':
      targetO2 = 16.4;
      targetCo = 8.5;
      break;

    case 'GAS_LEAK':
      targetH2s = 16.8;
      targetCo = 42.0;
      targetO2 = 18.8;
      break;

    case 'HIGH_TEMP':
      targetTemp = 53.6;
      targetHumidity = 28.0;
      break;

    case 'WATER_INTRUSION':
      waterDetected = true;
      targetHumidity = 94.0;
      targetTemp = 18.5;
      break;

    case 'MULTIPLE_HAZARDS':
      targetO2 = 15.6;
      targetH2s = 21.4;
      targetCo = 58.0;
      targetTemp = 44.5;
      targetHumidity = 88.0;
      waterDetected = true;
      break;

    case 'NORMAL':
    default:
      break;
  }

  const noise = (scale: number) => (noiseEnabled ? (Math.random() - 0.5) * scale : 0);

  const lerp = (curr: number, target: number, rate: number) => {
    return curr + (target - curr) * rate;
  };

  const smoothRate = 0.25;
  const newO2 = Math.max(12, Math.min(22, lerp(currentReadings.oxygenPct, targetO2, smoothRate) + noise(0.08)));
  const newH2s = Math.max(0, Math.min(100, lerp(currentReadings.h2sPpm, targetH2s, smoothRate) + noise(0.15)));
  const newCo = Math.max(0, Math.min(200, lerp(currentReadings.coPpm, targetCo, smoothRate) + noise(0.3)));
  const newTemp = Math.max(10, Math.min(80, lerp(currentReadings.temperatureC, targetTemp, smoothRate) + noise(0.2)));
  const newHumidity = Math.max(10, Math.min(100, lerp(currentReadings.humidityRh, targetHumidity, smoothRate) + noise(0.5)));

  return {
    oxygenPct: parseFloat(newO2.toFixed(1)),
    h2sPpm: parseFloat(newH2s.toFixed(1)),
    coPpm: parseFloat(newCo.toFixed(1)),
    temperatureC: parseFloat(newTemp.toFixed(1)),
    humidityRh: parseFloat(newHumidity.toFixed(1)),
    waterDetected,
    obstacleDistanceCm
  };
}
