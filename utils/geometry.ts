import { Point, SpellType } from '../types';

/**
 * Calculates Euclidean distance between two points.
 */
export const distance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

/**
 * Calculates total length of the path.
 */
const getPathLength = (path: Point[]): number => {
  let len = 0;
  for (let i = 1; i < path.length; i++) {
    len += distance(path[i-1], path[i]);
  }
  return len;
};

/**
 * Resamples a path to a fixed number of equidistant points.
 * This removes speed variation and scale issues from the recognition.
 */
const resample = (points: Point[], n: number): Point[] => {
  if (!points || points.length === 0) return [];
  
  const totalLength = getPathLength(points);
  const I = totalLength / (n - 1);
  if (I === 0) return points; 

  let D = 0;
  const newPoints: Point[] = [points[0]];
  
  // Clone to avoid mutation issues
  const tempPoints = points.map(p => ({...p}));
  
  let i = 1;
  while (i < tempPoints.length) {
      const d = distance(tempPoints[i-1], tempPoints[i]);
      if (D + d >= I) {
          const t = (I - D) / d;
          const qx = tempPoints[i-1].x + t * (tempPoints[i].x - tempPoints[i-1].x);
          const qy = tempPoints[i-1].y + t * (tempPoints[i].y - tempPoints[i-1].y);
          const q = {x: qx, y: qy};
          newPoints.push(q);
          // Insert q into list so we continue marching from it
          tempPoints.splice(i, 0, q);
          D = 0;
          i++;
      } else {
          D += d;
          i++;
      }
  }
  
  // Handle rounding errors
  if (newPoints.length === n - 1) {
      newPoints.push(tempPoints[tempPoints.length - 1]);
  }
  
  return newPoints;
};

/**
 * Advanced Geometric Gesture Recognition
 * Analyzes curvature, corners, and winding number.
 */
export const recognizeGesture = (rawPath: Point[]): SpellType => {
  // 1. Basic filter
  if (rawPath.length < 5) return SpellType.NONE;
  const rawLen = getPathLength(rawPath);
  if (rawLen < 0.1) return SpellType.NONE; // Too small (0.1 normalized screen width)

  // 2. Resample to 32 points for consistent analysis
  const path = resample(rawPath, 32);
  if (path.length < 10) return SpellType.NONE;

  // 3. Extract Features
  const start = path[0];
  const end = path[path.length - 1];
  const distStartEnd = distance(start, end);
  const totalLength = getPathLength(path);
  
  // Closedness: Is the end near the start?
  const isClosed = distStartEnd < totalLength * 0.20;

  let totalAngleChange = 0; // Sum of absolute angle changes (how "wiggly" or "rotational" is it?)
  let windingNumber = 0;    // Sum of signed angle changes (net rotation)
  let sharpCorners = 0;     // Count of acute turns (> 45 deg)

  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i-1];
    const curr = path[i];
    const next = path[i+1];
    
    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };
    
    const angle1 = Math.atan2(v1.y, v1.x);
    const angle2 = Math.atan2(v2.y, v2.x);
    
    let diff = angle2 - angle1;
    // Normalize to -PI to PI
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    
    totalAngleChange += Math.abs(diff);
    windingNumber += diff;
    
    // Detect sharp corner (roughly > 45 degrees turn)
    if (Math.abs(diff) > Math.PI / 4) { 
       sharpCorners++;
    }
  }

  // 4. Classification Logic

  // --- SHIELD (CIRCLE) ---
  // Criteria: Closed, Winding ~ 2PI (6.28), few sharp corners (smooth)
  const isWindingCircle = Math.abs(Math.abs(windingNumber) - 2 * Math.PI) < 2.5; // Allow some slop
  if (isClosed && isWindingCircle && sharpCorners <= 2) {
      return SpellType.SHIELD;
  }

  // --- HEAL (SQUARE) ---
  // Criteria: Closed, ~4 corners.
  if (isClosed && sharpCorners >= 4 && sharpCorners <= 6) {
      return SpellType.HEAL;
  }

  // --- FIREBALL (TRIANGLE or CHEVRON) ---
  // Criteria: 
  // 1. Triangle: Closed, 3 sharp corners.
  if (isClosed && sharpCorners === 3) {
      return SpellType.FIREBALL;
  }
  
  if (!isClosed) {
      // --- FROSTBOLT (VERTICAL LINE) ---
      // Criteria: Open, Straight (start/end dist ~ total length), Low angle change
      if (distStartEnd > totalLength * 0.9 && totalAngleChange < 1.0) {
          return SpellType.FROSTBOLT;
      }

      // Check for 'V' or '^' shape (Fireball alt)
      // Must have low winding (net direction is straightish) but distinct corner
      if (sharpCorners === 1 && totalAngleChange < 4.0) {
          return SpellType.FIREBALL;
      }
      
      // Also check if it's a sloppy triangle (almost closed) with 2 corners
      if (distStartEnd < totalLength * 0.35 && sharpCorners >= 2 && sharpCorners <= 3) {
          return SpellType.FIREBALL;
      }
  }

  // --- LIGHTNING (ZIG-ZAG) ---
  // Criteria: Open, High total angle change (lots of turning), Many corners
  if (!isClosed) {
      if (sharpCorners >= 4 || totalAngleChange > 7.0) {
          return SpellType.LIGHTNING;
      }
  }

  return SpellType.NONE;
};