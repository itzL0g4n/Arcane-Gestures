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
 */
const resample = (points: Point[], n: number): Point[] => {
  if (!points || points.length === 0) return [];
  
  const totalLength = getPathLength(points);
  const I = totalLength / (n - 1);
  if (I === 0) return points; 

  let D = 0;
  const newPoints: Point[] = [points[0]];
  
  // Clone to avoid mutation
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
          tempPoints.splice(i, 0, q);
          D = 0;
          i++;
      } else {
          D += d;
          i++;
      }
  }
  
  if (newPoints.length === n - 1) {
      newPoints.push(tempPoints[tempPoints.length - 1]);
  }
  
  return newPoints;
};

/**
 * Translates points so that their centroid is at the origin.
 */
const translateToOrigin = (points: Point[]): Point[] => {
    const centroid = points.reduce((acc, p) => ({x: acc.x + p.x, y: acc.y + p.y}), {x: 0, y: 0});
    centroid.x /= points.length;
    centroid.y /= points.length;
    return points.map(p => ({x: p.x - centroid.x, y: p.y - centroid.y}));
};

/**
 * Scales points to fit within a unit box [0,1]x[0,1]
 * Preserving aspect ratio might be good, but non-uniform scaling helps distinguish similar shapes like square vs rectangle.
 * For this game, we'll use non-uniform scaling to square to make it robust against sloppy drawing sizes.
 */
const scaleToSquare = (points: Point[], size: number): Point[] => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(p => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    });
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    return points.map(p => ({
        x: p.x * (size / width),
        y: p.y * (size / height)
    }));
};

/**
 * Calculates the average distance between corresponding points in two paths.
 */
const pathDistance = (path1: Point[], path2: Point[]): number => {
    let d = 0;
    const len = Math.min(path1.length, path2.length);
    for (let i = 0; i < len; i++) {
        d += distance(path1[i], path2[i]);
    }
    return d / len;
};

// --- TEMPLATES ---
// Define ideal shapes. Order of points matters (direction).
// Coordinates are roughly 0..1

const createLineTemplate = (): Point[] => {
    const p: Point[] = [];
    for(let i=0; i<32; i++) p.push({x: 0.5, y: i/31}); // Vertical line down
    return p;
};

const createCircleTemplate = (): Point[] => {
    const p: Point[] = [];
    for(let i=0; i<32; i++) {
        const theta = (i/31) * Math.PI * 2;
        // Start at top (roughly) for natural drawing? 
        // Most people draw circle starting top-right (counter-clockwise) or top-left (clockwise).
        // Let's assume standard math angle 0 is right.
        // Let's just define points manually for a "Clockwise from Top" circle
        const angle = -Math.PI/2 + (i/31) * Math.PI * 2; 
        p.push({x: 0.5 + 0.5 * Math.cos(angle), y: 0.5 + 0.5 * Math.sin(angle)});
    }
    return p;
};

const createTriangleTemplate = (): Point[] => {
    const p: Point[] = [];
    // 0-10: Left leg down
    // 10-20: Base
    // 20-31: Right leg up
    // Wait, Fireball is usually V or Triangle. Let's make a Triangle.
    // Apex -> Bottom Right -> Bottom Left -> Apex
    const apex = {x: 0.5, y: 0};
    const br = {x: 1, y: 1};
    const bl = {x: 0, y: 1};
    
    for(let i=0; i<=10; i++) p.push({x: apex.x + (br.x-apex.x)*(i/10), y: apex.y + (br.y-apex.y)*(i/10)});
    for(let i=0; i<=10; i++) p.push({x: br.x + (bl.x-br.x)*(i/10), y: br.y + (bl.y-br.y)*(i/10)});
    for(let i=0; i<=10; i++) p.push({x: bl.x + (apex.x-bl.x)*(i/10), y: bl.y + (apex.y-bl.y)*(i/10)});
    
    return resample(p, 32);
};

const createSquareTemplate = (): Point[] => {
    const p: Point[] = [];
    // TL -> TR -> BR -> BL -> TL
    const tl = {x:0, y:0}; const tr = {x:1, y:0}; const br = {x:1, y:1}; const bl = {x:0, y:1};
    
    for(let i=0; i<8; i++) p.push({x: tl.x + (tr.x-tl.x)*(i/8), y: tl.y + (tr.y-tl.y)*(i/8)});
    for(let i=0; i<8; i++) p.push({x: tr.x + (br.x-tr.x)*(i/8), y: tr.y + (br.y-tr.y)*(i/8)});
    for(let i=0; i<8; i++) p.push({x: br.x + (bl.x-br.x)*(i/8), y: br.y + (bl.y-br.y)*(i/8)});
    for(let i=0; i<8; i++) p.push({x: bl.x + (tl.x-bl.x)*(i/8), y: bl.y + (tl.y-bl.y)*(i/8)});
    
    return resample(p, 32);
};

const createLightningTemplate = (): Point[] => {
    const p: Point[] = [];
    // Zig Zag: TopLeft -> Right -> Left -> Right (Downwards)
    // (0.3, 0) -> (0.8, 0.3) -> (0.2, 0.6) -> (0.7, 1.0)
    const p1={x:0.3, y:0}; const p2={x:0.9, y:0.35}; const p3={x:0.1, y:0.65}; const p4={x:0.7, y:1};
    
    for(let i=0; i<10; i++) p.push({x: p1.x + (p2.x-p1.x)*(i/10), y: p1.y + (p2.y-p1.y)*(i/10)});
    for(let i=0; i<10; i++) p.push({x: p2.x + (p3.x-p2.x)*(i/10), y: p2.y + (p3.y-p2.y)*(i/10)});
    for(let i=0; i<=10; i++) p.push({x: p3.x + (p4.x-p3.x)*(i/10), y: p3.y + (p4.y-p3.y)*(i/10)});
    
    return resample(p, 32);
};

const createVTemplate = (): Point[] => {
    const p: Point[] = [];
    // TL -> Bottom Middle -> TR
    const p1={x:0, y:0}; const p2={x:0.5, y:1}; const p3={x:1, y:0};
    for(let i=0; i<16; i++) p.push({x: p1.x + (p2.x-p1.x)*(i/16), y: p1.y + (p2.y-p1.y)*(i/16)});
    for(let i=0; i<16; i++) p.push({x: p2.x + (p3.x-p2.x)*(i/16), y: p2.y + (p3.y-p2.y)*(i/16)});
    return resample(p, 32);
}

// Prepare normalized templates
const RAW_TEMPLATES = {
    [SpellType.FROSTBOLT]: [createLineTemplate()],
    [SpellType.SHIELD]: [createCircleTemplate()], // Could add reverse circle
    [SpellType.HEAL]: [createSquareTemplate()],
    [SpellType.FIREBALL]: [createTriangleTemplate(), createVTemplate()], // Support both V and Triangle
    [SpellType.LIGHTNING]: [createLightningTemplate()],
};

// Normalize templates once at startup
const TEMPLATES: Record<string, Point[][]> = {};
Object.entries(RAW_TEMPLATES).forEach(([key, list]) => {
    TEMPLATES[key] = list.map(points => {
        const p = translateToOrigin(points);
        return scaleToSquare(p, 1.0);
    });
});

export const recognizeGesture = (rawPath: Point[]): SpellType => {
  // 1. Basic filter
  if (rawPath.length < 8) return SpellType.NONE;
  const rawLen = getPathLength(rawPath);
  if (rawLen < 0.1) return SpellType.NONE; // Too small

  // 2. Pre-process input
  let points = resample(rawPath, 32);
  points = translateToOrigin(points);
  points = scaleToSquare(points, 1.0);

  // 3. Match against templates
  let bestScore = Infinity;
  let bestType = SpellType.NONE;

  // Helper to test a set of points against all templates
  const test = (testPoints: Point[]) => {
      for (const [type, templates] of Object.entries(TEMPLATES)) {
          if (type === SpellType.NONE) continue;
          for(const template of templates) {
              const d = pathDistance(testPoints, template);
              if (d < bestScore) {
                  bestScore = d;
                  bestType = type as SpellType;
              }
          }
      }
  };

  // Test original direction
  test(points);
  
  // Test reverse direction (allows drawing circle/shapes backwards)
  const reversedPoints = [...points].reverse();
  test(reversedPoints);

  console.log(`Score: ${bestScore.toFixed(3)} matched ${bestType}`);

  // 4. Threshold
  // Lower score is better match. 0 is identical.
  // 0.25 is a reasonable "loose" threshold.
  return bestScore < 0.35 ? bestType : SpellType.NONE;
};