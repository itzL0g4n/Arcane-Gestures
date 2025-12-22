import { Point, GestureType } from '../types';

export const distance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

const getPathLength = (path: Point[]): number => {
  let len = 0;
  for (let i = 1; i < path.length; i++) {
    len += distance(path[i-1], path[i]);
  }
  return len;
};

const resample = (points: Point[], n: number): Point[] => {
  if (!points || points.length === 0) return [];
  const totalLength = getPathLength(points);
  const I = totalLength / (n - 1);
  if (I === 0) return points; 

  let D = 0;
  const newPoints: Point[] = [points[0]];
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

const translateToOrigin = (points: Point[]): Point[] => {
    const centroid = points.reduce((acc, p) => ({x: acc.x + p.x, y: acc.y + p.y}), {x: 0, y: 0});
    centroid.x /= points.length;
    centroid.y /= points.length;
    return points.map(p => ({x: p.x - centroid.x, y: p.y - centroid.y}));
};

const scaleToSquare = (points: Point[], size: number): Point[] => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(p => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    });
    
    const width = Math.max(0.01, maxX - minX);
    const height = Math.max(0.01, maxY - minY);
    
    return points.map(p => ({
        x: p.x * (size / width),
        y: p.y * (size / height)
    }));
};

const pathDistance = (path1: Point[], path2: Point[]): number => {
    let d = 0;
    const len = Math.min(path1.length, path2.length);
    for (let i = 0; i < len; i++) {
        d += distance(path1[i], path2[i]);
    }
    return d / len;
};

// --- TEMPLATES ---

const createCircle = (): Point[] => {
    const p: Point[] = [];
    for(let i=0; i<32; i++) {
        const angle = -Math.PI/2 + (i/31) * Math.PI * 2; 
        p.push({x: 0.5 + 0.5 * Math.cos(angle), y: 0.5 + 0.5 * Math.sin(angle)});
    }
    return p;
};

const createTriangleTop = (): Point[] => {
    const p: Point[] = [];
    // Closed Triangle - Start at Top
    const apex = {x: 0.5, y: 0};
    const br = {x: 1, y: 1};
    const bl = {x: 0, y: 1};
    // 3 segments: Apex -> BR -> BL -> Apex
    for(let i=0; i<10; i++) p.push({x: apex.x + (br.x-apex.x)*(i/10), y: apex.y + (br.y-apex.y)*(i/10)});
    for(let i=0; i<10; i++) p.push({x: br.x + (bl.x-br.x)*(i/10), y: br.y + (bl.y-br.y)*(i/10)});
    for(let i=0; i<=10; i++) p.push({x: bl.x + (apex.x-bl.x)*(i/10), y: bl.y + (apex.y-bl.y)*(i/10)});
    return resample(p, 32);
};

const createTriangleBottomLeft = (): Point[] => {
    const p: Point[] = [];
    // Closed Triangle - Start at Bottom Left
    const bl = {x: 0, y: 1};
    const apex = {x: 0.5, y: 0};
    const br = {x: 1, y: 1};
    // 3 segments: BL -> Apex -> BR -> BL
    for(let i=0; i<10; i++) p.push({x: bl.x + (apex.x-bl.x)*(i/10), y: bl.y + (apex.y-bl.y)*(i/10)});
    for(let i=0; i<10; i++) p.push({x: apex.x + (br.x-apex.x)*(i/10), y: apex.y + (br.y-apex.y)*(i/10)});
    for(let i=0; i<=10; i++) p.push({x: br.x + (bl.x-br.x)*(i/10), y: br.y + (bl.y-br.y)*(i/10)});
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
    // Classic 3-stroke bolt: Right-Down, Left-Down, Right-Down
    const p1={x:0.3, y:0}; const p2={x:0.9, y:0.35}; const p3={x:0.1, y:0.65}; const p4={x:0.7, y:1};
    for(let i=0; i<10; i++) p.push({x: p1.x + (p2.x-p1.x)*(i/10), y: p1.y + (p2.y-p1.y)*(i/10)});
    for(let i=0; i<10; i++) p.push({x: p2.x + (p3.x-p2.x)*(i/10), y: p2.y + (p3.y-p2.y)*(i/10)});
    for(let i=0; i<=10; i++) p.push({x: p3.x + (p4.x-p3.x)*(i/10), y: p3.y + (p4.y-p3.y)*(i/10)});
    return resample(p, 32);
};

const createLightningMirrored = (): Point[] => {
    const p: Point[] = [];
    // Mirrored bolt: Left-Down, Right-Down, Left-Down
    const p1={x:0.7, y:0}; const p2={x:0.1, y:0.35}; const p3={x:0.9, y:0.65}; const p4={x:0.3, y:1};
    for(let i=0; i<10; i++) p.push({x: p1.x + (p2.x-p1.x)*(i/10), y: p1.y + (p2.y-p1.y)*(i/10)});
    for(let i=0; i<10; i++) p.push({x: p2.x + (p3.x-p2.x)*(i/10), y: p2.y + (p3.y-p2.y)*(i/10)});
    for(let i=0; i<=10; i++) p.push({x: p3.x + (p4.x-p3.x)*(i/10), y: p3.y + (p4.y-p3.y)*(i/10)});
    return resample(p, 32);
};

const createZ = (): Point[] => {
    const p: Point[] = [];
    // Standard Z: Right, Down-Left, Right
    const p1={x:0, y:0}; const p2={x:1, y:0}; const p3={x:0, y:1}; const p4={x:1, y:1};
    for(let i=0; i<10; i++) p.push({x: p1.x + (p2.x-p1.x)*(i/10), y: p1.y + (p2.y-p1.y)*(i/10)});
    for(let i=0; i<10; i++) p.push({x: p2.x + (p3.x-p2.x)*(i/10), y: p2.y + (p3.y-p2.y)*(i/10)});
    for(let i=0; i<=10; i++) p.push({x: p3.x + (p4.x-p3.x)*(i/10), y: p3.y + (p4.y-p3.y)*(i/10)});
    return resample(p, 32);
};

const createV = (): Point[] => {
    const p: Point[] = [];
    const p1={x:0, y:0}; const p2={x:0.5, y:1}; const p3={x:1, y:0};
    // Simple 2 stroke down-up
    for(let i=0; i<16; i++) p.push({x: p1.x + (p2.x-p1.x)*(i/16), y: p1.y + (p2.y-p1.y)*(i/16)});
    for(let i=0; i<16; i++) p.push({x: p2.x + (p3.x-p2.x)*(i/16), y: p2.y + (p3.y-p2.y)*(i/16)});
    return resample(p, 32);
}

const createCheckmark = (): Point[] => {
    const p: Point[] = [];
    // Start mid-left, down to low-center, up to high-right (asymmetric V)
    const p1 = {x:0, y:0.5}; const p2 = {x:0.4, y:1}; const p3 = {x:1, y:0};
    for(let i=0; i<10; i++) p.push({x: p1.x + (p2.x-p1.x)*(i/10), y: p1.y + (p2.y-p1.y)*(i/10)});
    for(let i=0; i<22; i++) p.push({x: p2.x + (p3.x-p2.x)*(i/22), y: p2.y + (p3.y-p2.y)*(i/22)});
    return resample(p, 32);
}

const createS = (): Point[] => {
    const p: Point[] = [];
    const p0={x:1, y:0}; const p1={x:0, y:0.2}; const p2={x:1, y:0.8}; const p3={x:0, y:1};
    for(let i=0; i<10; i++) p.push({x: p0.x + (p1.x-p0.x)*(i/10), y: p0.y + (p1.y-p0.y)*(i/10)});
    for(let i=0; i<10; i++) p.push({x: p1.x + (p2.x-p1.x)*(i/10), y: p1.y + (p2.y-p1.y)*(i/10)});
    for(let i=0; i<=10; i++) p.push({x: p2.x + (p3.x-p2.x)*(i/10), y: p2.y + (p3.y-p2.y)*(i/10)});
    return resample(p, 32);
}

// Map Gestures 
// Note: TRIANGLE only uses createTriangle (closed)
// V_SHAPE uses createV (open)
const RAW_TEMPLATES = {
    [GestureType.CIRCLE]: [createCircle()], 
    [GestureType.SQUARE]: [createSquare()],
    [GestureType.TRIANGLE]: [createTriangleTop(), createTriangleBottomLeft()], 
    [GestureType.V_SHAPE]: [createV()],
    [GestureType.ZIGZAG]: [createLightning(), createLightningMirrored(), createZ()],
    [GestureType.CHECKMARK]: [createCheckmark()],
    [GestureType.S_SHAPE]: [createS()],
};

const TEMPLATES: Record<string, Point[][]> = {};
Object.entries(RAW_TEMPLATES).forEach(([key, list]) => {
    TEMPLATES[key] = list.map(points => {
        const p = translateToOrigin(points);
        return scaleToSquare(p, 1.0);
    });
});

export const recognizeGesture = (rawPath: Point[]): GestureType => {
  if (rawPath.length < 5) return GestureType.NONE;
  const rawLen = getPathLength(rawPath);
  if (rawLen < 0.05) return GestureType.NONE; 

  // Just strict template matching now, no heuristics
  let points = resample(rawPath, 32);
  points = translateToOrigin(points);
  points = scaleToSquare(points, 1.0);

  let bestScore = Infinity;
  let bestType: GestureType = GestureType.NONE;

  // Use array of candidates (normal + reversed) to avoid closure mutation issues with TS flow analysis
  const candidates = [points, [...points].reverse()];

  for (const candidate of candidates) {
      for (const [type, templates] of Object.entries(TEMPLATES)) {
          if (type === GestureType.NONE) continue;
          for(const template of templates) {
              const d = pathDistance(candidate, template);
              if (d < bestScore) {
                  bestScore = d;
                  bestType = type as GestureType;
              }
          }
      }
  }

  console.log(`Score: ${bestScore.toFixed(3)} matched ${bestType}`);
  
  // V_SHAPE and CHECKMARK are open and can look similar. 
  // TRIANGLE is closed. 
  // Allow looser matching for complex shapes, stricter for V vs Checkmark if needed.
  
  let threshold = 0.40;
  if (bestType === GestureType.S_SHAPE) threshold = 0.50;
  if (bestType === GestureType.V_SHAPE) threshold = 0.35; // Stricter for simple shapes
  if (bestType === GestureType.ZIGZAG) threshold = 0.55; // Relaxed for ZigZag
  if (bestType === GestureType.TRIANGLE) threshold = 0.55; // Relaxed for Triangle (corners often rounded)
  
  return bestScore < threshold ? bestType : GestureType.NONE;
};