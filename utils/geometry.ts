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

const createVerticalLine = (): Point[] => {
    const p: Point[] = [];
    for(let i=0; i<32; i++) p.push({x: 0.5, y: i/31}); 
    return p;
};

const createHorizontalLine = (): Point[] => {
    const p: Point[] = [];
    for(let i=0; i<32; i++) p.push({x: i/31, y: 0.5}); 
    return p;
};

const createCircle = (): Point[] => {
    const p: Point[] = [];
    for(let i=0; i<32; i++) {
        const angle = -Math.PI/2 + (i/31) * Math.PI * 2; 
        p.push({x: 0.5 + 0.5 * Math.cos(angle), y: 0.5 + 0.5 * Math.sin(angle)});
    }
    return p;
};

const createTriangle = (): Point[] => {
    const p: Point[] = [];
    const apex = {x: 0.5, y: 0};
    const br = {x: 1, y: 1};
    const bl = {x: 0, y: 1};
    for(let i=0; i<=10; i++) p.push({x: apex.x + (br.x-apex.x)*(i/10), y: apex.y + (br.y-apex.y)*(i/10)});
    for(let i=0; i<=10; i++) p.push({x: br.x + (bl.x-br.x)*(i/10), y: br.y + (bl.y-br.y)*(i/10)});
    for(let i=0; i<=10; i++) p.push({x: bl.x + (apex.x-bl.x)*(i/10), y: bl.y + (apex.y-bl.y)*(i/10)});
    return resample(p, 32);
};

const createSquare = (): Point[] => {
    const p: Point[] = [];
    const tl = {x:0, y:0}; const tr = {x:1, y:0}; const br = {x:1, y:1}; const bl = {x:0, y:1};
    for(let i=0; i<8; i++) p.push({x: tl.x + (tr.x-tl.x)*(i/8), y: tl.y + (tr.y-tl.y)*(i/8)});
    for(let i=0; i<8; i++) p.push({x: tr.x + (br.x-tr.x)*(i/8), y: tr.y + (br.y-tr.y)*(i/8)});
    for(let i=0; i<8; i++) p.push({x: br.x + (bl.x-br.x)*(i/8), y: br.y + (bl.y-br.y)*(i/8)});
    for(let i=0; i<8; i++) p.push({x: bl.x + (tl.x-bl.x)*(i/8), y: bl.y + (tl.y-bl.y)*(i/8)});
    return resample(p, 32);
};

const createLightning = (): Point[] => {
    const p: Point[] = [];
    const p1={x:0.3, y:0}; const p2={x:0.9, y:0.35}; const p3={x:0.1, y:0.65}; const p4={x:0.7, y:1};
    for(let i=0; i<10; i++) p.push({x: p1.x + (p2.x-p1.x)*(i/10), y: p1.y + (p2.y-p1.y)*(i/10)});
    for(let i=0; i<10; i++) p.push({x: p2.x + (p3.x-p2.x)*(i/10), y: p2.y + (p3.y-p2.y)*(i/10)});
    for(let i=0; i<=10; i++) p.push({x: p3.x + (p4.x-p3.x)*(i/10), y: p3.y + (p4.y-p3.y)*(i/10)});
    return resample(p, 32);
};

const createV = (): Point[] => {
    const p: Point[] = [];
    const p1={x:0, y:0}; const p2={x:0.5, y:1}; const p3={x:1, y:0};
    for(let i=0; i<16; i++) p.push({x: p1.x + (p2.x-p1.x)*(i/16), y: p1.y + (p2.y-p1.y)*(i/16)});
    for(let i=0; i<16; i++) p.push({x: p2.x + (p3.x-p2.x)*(i/16), y: p2.y + (p3.y-p2.y)*(i/16)});
    return resample(p, 32);
}

const createCheckmark = (): Point[] => {
    const p: Point[] = [];
    // Down right, then Up right (long)
    const p1 = {x:0, y:0.5}; const p2 = {x:0.4, y:1}; const p3 = {x:1, y:0};
    for(let i=0; i<10; i++) p.push({x: p1.x + (p2.x-p1.x)*(i/10), y: p1.y + (p2.y-p1.y)*(i/10)});
    for(let i=0; i<22; i++) p.push({x: p2.x + (p3.x-p2.x)*(i/22), y: p2.y + (p3.y-p2.y)*(i/22)});
    return resample(p, 32);
}

const createS = (): Point[] => {
    const p: Point[] = [];
    // Approximate S curve using sine wave
    for(let i=0; i<32; i++) {
        const t = i/31; // 0 to 1
        const x = Math.sin(t * Math.PI * 2) * 0.5 + 0.5; // -1 to 1 -> 0 to 1 (x follows sine)
        // Actually standard S: Top Right -> Top Left -> Center -> Bottom Right -> Bottom Left
        // Let's use simple parametric:
        // x = cos(t), y = t? No.
        // Let's just define key points
        // 1. Top Right (1, 0)
        // 2. Top Left (0, 0.25)
        // 3. Middle (0.5, 0.5)
        // 4. Bottom Right (1, 0.75)
        // 5. Bottom Left (0, 1)
        // Smooth sine is better: x = 0.5 + 0.5 * cos(t * pi + pi/2)?
        // Let's just do manual points
        const angle = Math.PI/2 - t * Math.PI; // Top curve
        // This is hard to generate procedurally perfectly.
        // Let's use a simpler 4 point bezier approx
    }
    // Re-do S: Top-Right -> Left -> Right -> Left (Downwards)
    const p0={x:1, y:0}; const p1={x:0, y:0.2}; const p2={x:1, y:0.8}; const p3={x:0, y:1};
    // Linear interp for now, resample smooths it
    for(let i=0; i<10; i++) p.push({x: p0.x + (p1.x-p0.x)*(i/10), y: p0.y + (p1.y-p0.y)*(i/10)});
    for(let i=0; i<10; i++) p.push({x: p1.x + (p2.x-p1.x)*(i/10), y: p1.y + (p2.y-p1.y)*(i/10)});
    for(let i=0; i<=10; i++) p.push({x: p2.x + (p3.x-p2.x)*(i/10), y: p2.y + (p3.y-p2.y)*(i/10)});
    return resample(p, 32);
}

// Prepare normalized templates
const RAW_TEMPLATES = {
    [SpellType.FROSTBOLT]: [createVerticalLine()],
    [SpellType.MISSILES]: [createHorizontalLine()],
    [SpellType.SHIELD]: [createCircle()], 
    [SpellType.HEAL]: [createSquare()],
    [SpellType.FIREBALL]: [createTriangle(), createV()], 
    [SpellType.LIGHTNING]: [createLightning()],
    [SpellType.METEOR]: [createCheckmark()],
    [SpellType.TIME_WARP]: [createS()],
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
  if (rawLen < 0.1) return SpellType.NONE; 

  // 2. Pre-process input
  let points = resample(rawPath, 32);
  points = translateToOrigin(points);
  points = scaleToSquare(points, 1.0);

  // 3. Match against templates
  let bestScore = Infinity;
  let bestType: SpellType = SpellType.NONE;

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

  test(points);
  
  // Allow reverse for circle/squares but maybe not for checkmarks
  const reversedPoints = [...points].reverse();
  test(reversedPoints);

  console.log(`Score: ${bestScore.toFixed(3)} matched ${bestType}`);

  // S-shape and Checkmarks are complex, allow slightly looser matching
  const threshold = (bestType === SpellType.TIME_WARP || bestType === SpellType.METEOR) ? 0.45 : 0.35;

  return bestScore < threshold ? bestType : SpellType.NONE;
};
