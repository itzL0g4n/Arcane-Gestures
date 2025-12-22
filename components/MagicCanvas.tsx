import React, { useEffect, useRef, useState } from 'react';
import { GameState, Point, GestureType, Particle, ElementType } from '../types';
import { distance, recognizeGesture } from '../utils/geometry';

// -- Constants --
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [5, 9], [9, 10], [10, 11], [11, 12], // Middle
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring
  [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [0, 17] // Wrist to Pinky
];

const PINCH_START_THRESHOLD = 0.06; 
const PINCH_RELEASE_THRESHOLD = 0.12; 

// Tuning for smoothness
const SMOOTHING_FACTOR = 0.35; // Lower = smoother but more lag. 0.35 is a sweet spot.
const MIN_POINT_DISTANCE = 4; // Minimum pixels between points to register

interface VisualEffect {
  isDead: boolean;
  update: (ctx: CanvasRenderingContext2D, width: number, height: number, spawnParticle: (x: number, y: number, color: string, speed?: number, life?: number) => void) => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

// -- EFFECTS --
// Generic Projectile for bolts/missiles
class ProjectileEffect implements VisualEffect {
  x: number; y: number; vx: number; vy: number; isDead: boolean = false; targetX: number; targetY: number;
  color: string; trailColors: string[];
  constructor(startX: number, startY: number, targetX: number, targetY: number, color: string, trailColors: string[]) {
    this.x = startX; this.y = startY; this.targetX = targetX; this.targetY = targetY;
    this.color = color; this.trailColors = trailColors;
    const angle = Math.atan2(targetY - startY, targetX - startX);
    const speed = 25; this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
  }
  update(ctx: CanvasRenderingContext2D, w: number, h: number, spawnParticle: Function) {
    this.x += this.vx; this.y += this.vy;
    for(let i=0; i<4; i++) spawnParticle(this.x + (Math.random()-0.5)*20, this.y + (Math.random()-0.5)*20, this.trailColors[Math.floor(Math.random()*this.trailColors.length)], 2, 0.6);
    const dist = Math.sqrt(Math.pow(this.x - this.targetX, 2) + Math.pow(this.y - this.targetY, 2));
    if (dist < 30 || this.x < 0 || this.x > w || this.y < 0 || this.y > h) {
      this.isDead = true;
      for(let i=0; i<40; i++) spawnParticle(this.x, this.y, this.color, 8, 1.2);
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.shadowBlur = 30; ctx.shadowColor = this.color; ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, 15, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }
}

class ShieldEffect implements VisualEffect {
  life: number = 1.0; isDead: boolean = false; color: string;
  constructor(color: string) { this.color = color; }
  update() { this.life -= 0.015; if (this.life <= 0) this.isDead = true; }
  draw(ctx: CanvasRenderingContext2D) {
    const w = ctx.canvas.width; const h = ctx.canvas.height; const cx = w / 2; const cy = h / 2;
    ctx.save(); ctx.globalAlpha = Math.min(1, this.life);
    ctx.strokeStyle = this.color; ctx.lineWidth = 4; ctx.shadowBlur = 30; ctx.shadowColor = this.color;
    ctx.beginPath(); ctx.arc(cx, cy, 150 * (2 - this.life), 0, Math.PI * 2); 
    ctx.fillStyle = this.color.replace(')', ', 0.2)').replace('rgb', 'rgba'); 
    ctx.fill(); ctx.stroke();
    if (this.life > 0.8) { ctx.fillStyle = this.color.replace(')', ', 0.1)').replace('rgb', 'rgba'); ctx.fillRect(0,0,w,h); }
    ctx.restore();
  }
}

class LightningEffect implements VisualEffect {
  segments: {x: number, y: number}[] = []; life: number = 1.0; isDead: boolean = false;
  constructor(w: number, h: number) {
    let currX = w / 2 + (Math.random() - 0.5) * 400; let currY = 0; this.segments.push({x: currX, y: currY});
    while (currY < h) { currY += Math.random() * 50 + 30; currX += (Math.random() - 0.5) * 150; this.segments.push({x: currX, y: currY}); }
  }
  update(ctx: CanvasRenderingContext2D, w: number, h: number, spawnParticle: Function) {
    this.life -= 0.04; if (this.life <= 0) this.isDead = true;
    if (this.life > 0.5) { this.segments.forEach(p => { if(Math.random() > 0.6) spawnParticle(p.x, p.y, '#ffff00', 4, 0.6); }); }
  }
  draw(ctx: CanvasRenderingContext2D) {
    if (this.segments.length < 2) return;
    ctx.save(); ctx.globalAlpha = Math.random() * this.life; ctx.shadowBlur = 30; ctx.shadowColor = '#ffff00'; ctx.strokeStyle = '#ffffcc'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(this.segments[0].x, this.segments[0].y); for(let i=1; i<this.segments.length; i++) ctx.lineTo(this.segments[i].x, this.segments[i].y); ctx.stroke();
    ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)'; ctx.stroke();
    ctx.restore();
  }
}

class MeteorEffect implements VisualEffect {
    x: number; y: number; isDead = false;
    constructor(w: number) { this.x = w/2; this.y = -100; }
    update(ctx: CanvasRenderingContext2D, w: number, h: number, spawnParticle: Function) {
        this.y += 25;
        spawnParticle(this.x + (Math.random()-0.5)*50, this.y, '#ff4400', 2, 1);
        if (this.y > h/2) {
            this.isDead = true;
            for(let i=0; i<100; i++) spawnParticle(this.x, this.y, '#ffaa00', 15, 2.0);
        }
    }
    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#ff4400';
        ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000';
        ctx.beginPath(); ctx.arc(this.x, this.y, 60, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    }
}

class AreaEffect implements VisualEffect {
    life: number = 1.0; isDead: boolean = false; particles: any[] = []; color: string;
    constructor(w: number, h: number, color: string) {
        this.color = color;
        for(let i=0; i<50; i++) this.particles.push({x: w/2 + (Math.random() - 0.5) * 300, y: h, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 8 - 4, size: Math.random() * 8 + 3});
    }
    update(ctx: CanvasRenderingContext2D, w: number, h: number) {
        this.life -= 0.02; if(this.life <= 0) this.isDead = true;
        this.particles.forEach(p => { p.x += p.vx; p.y += p.vy; });
    }
    draw(ctx: CanvasRenderingContext2D) {
        ctx.save(); ctx.globalAlpha = this.life; ctx.fillStyle = this.color; ctx.shadowBlur = 20; ctx.shadowColor = this.color;
        this.particles.forEach(p => { ctx.beginPath(); ctx.fillRect(p.x - p.size/2, p.y - p.size * 1.5, p.size, p.size * 3); });
        ctx.restore();
    }
}

class TimeWarpEffect implements VisualEffect {
    life = 1.0; isDead = false;
    update() { this.life -= 0.01; if(this.life <= 0) this.isDead = true; }
    draw(ctx: CanvasRenderingContext2D) {
        const cx = ctx.canvas.width/2; const cy = ctx.canvas.height/2;
        ctx.save(); ctx.strokeStyle = '#8888ff'; ctx.lineWidth = 5; ctx.globalAlpha = 0.5 * this.life;
        ctx.beginPath();
        for(let i=0; i<100; i++) {
            const angle = 0.2 * i + Date.now() * 0.005; const r = 5 * i * (1-this.life);
            const x = cx + Math.cos(angle)*r; const y = cy + Math.sin(angle)*r;
            if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.stroke(); ctx.restore();
    }
}

interface MagicCanvasProps {
  onSpellCast: (gesture: GestureType) => void;
  setGameState: (state: GameState) => void;
  gameState: GameState;
  isMirrored: boolean;
  fitMode: 'cover' | 'contain';
  selectedElement: ElementType;
}

const MagicCanvas: React.FC<MagicCanvasProps> = ({ 
  onSpellCast, 
  setGameState, 
  isMirrored,
  fitMode,
  selectedElement
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  const isPinching = useRef<boolean>(false);
  const pathRef = useRef<Point[]>([]);
  // We don't need pointBufferRef for average anymore, we use EMA on cursorRef directly
  const smoothedCursorRef = useRef<{x: number, y: number} | null>(null);

  const particlesRef = useRef<Particle[]>([]);
  const effectsRef = useRef<VisualEffect[]>([]);
  const requestRef = useRef<number>(0);
  
  const propsRef = useRef({ onSpellCast, setGameState, isMirrored, fitMode, selectedElement });

  useEffect(() => {
    propsRef.current = { onSpellCast, setGameState, isMirrored, fitMode, selectedElement };
  }, [onSpellCast, setGameState, isMirrored, fitMode, selectedElement]);

  useEffect(() => {
    const handleResize = () => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let hands: any = null;
    let stream: MediaStream | null = null;
    let isMounted = true;

    const setup = async () => {
        let attempts = 0;
        while (!(window as any).Hands && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
        }
        const Hands = (window as any).Hands;
        if (!Hands) {
            if(isMounted) setCameraError("MediaPipe failed to load. Refresh.");
            return;
        }
        hands = new Hands({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.6,
            selfieMode: false, 
        });
        hands.onResults(onResults);
        if (videoRef.current) {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                });
                if (!isMounted) { stream.getTracks().forEach(t => t.stop()); return; }
                videoRef.current.srcObject = stream;
                await new Promise((resolve) => {
                    if (videoRef.current) {
                        if (videoRef.current.readyState >= 1) resolve(true);
                        else videoRef.current.onloadedmetadata = () => resolve(true);
                    }
                });
                if (!isMounted) return;
                try { await videoRef.current.play(); } catch (e) {}
                requestRef.current = requestAnimationFrame(processFrame);
            } catch (err: any) {
                if (isMounted) setCameraError(err.message || "Camera error");
            }
        }
    };

    const processFrame = async () => {
        if (!isMounted) return;
        if (!videoRef.current || !hands) return;
        if (videoRef.current.readyState >= 2 && videoRef.current.srcObject) {
             try { await hands.send({ image: videoRef.current }); } catch(e) {}
        }
        if (isMounted) requestRef.current = requestAnimationFrame(processFrame);
    };

    setup();
    return () => {
        isMounted = false;
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (hands) try { hands.close(); } catch(e) { }
        if (stream) stream.getTracks().forEach(t => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  const onResults = (results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { isMirrored, fitMode, setGameState, onSpellCast, selectedElement } = propsRef.current;
    const sw = canvas.width;
    const sh = canvas.height;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (vw === 0 || vh === 0) return;

    let scale = fitMode === 'cover' ? Math.max(sw / vw, sh / vh) : Math.min(sw / vw, sh / vh);
    const scaledW = vw * scale;
    const scaledH = vh * scale;
    const offsetX = (sw - scaledW) / 2;
    const offsetY = (sh - scaledH) / 2;

    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, sw, sh); 
    ctx.translate(offsetX, offsetY);
    if (isMirrored) { ctx.translate(scaledW, 0); ctx.scale(-1, 1); }
    ctx.globalAlpha = 0.8;
    ctx.drawImage(video, 0, 0, scaledW, scaledH);
    ctx.globalAlpha = 1.0;
    ctx.restore();

    const toScreen = (p: {x: number, y: number}) => {
        let x = p.x;
        if (isMirrored) x = 1 - x; 
        return { x: offsetX + x * scaledW, y: offsetY + p.y * scaledH };
    };

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const rawLandmarks = results.multiHandLandmarks[0];
        const screenLandmarks = rawLandmarks.map(toScreen);
        drawExoskeleton(ctx, screenLandmarks, selectedElement);
        handleGestures(ctx, screenLandmarks, rawLandmarks, isMirrored, sw, sh);
    } else {
        smoothedCursorRef.current = null;
        if (isPinching.current) {
           isPinching.current = false;
           pathRef.current = [];
           setGameState(GameState.IDLE);
        }
    }

    drawCursor(ctx, selectedElement);
    drawPath(ctx, selectedElement);
    updateEffects(ctx, sw, sh);
    updateParticles(ctx);
  };

  const getElementColor = (el: ElementType) => {
    switch(el) {
        case ElementType.FIRE: return '#ff4400';
        case ElementType.WATER: return '#00ffff';
        case ElementType.LIGHTNING: return '#ffff00';
        case ElementType.AIR: return '#ccffcc';
        default: return '#ffffff';
    }
  }

  const drawExoskeleton = (ctx: CanvasRenderingContext2D, landmarks: any[], el: ElementType) => {
    const color = getElementColor(el);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw Bones
    for (const [start, end] of HAND_CONNECTIONS) {
       const p1 = landmarks[start];
       const p2 = landmarks[end];
       
       // Glow
       ctx.shadowBlur = 10;
       ctx.shadowColor = color;
       ctx.strokeStyle = color.replace('rgb', 'rgba').replace(')', ', 0.6)');
       ctx.lineWidth = 4;
       ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
       
       // Core
       ctx.shadowBlur = 0;
       ctx.strokeStyle = '#ffffff';
       ctx.lineWidth = 1;
       ctx.globalAlpha = 0.7;
       ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
       ctx.globalAlpha = 1.0;
    }

    // Draw Joints
    landmarks.forEach((p, index) => {
        // Fingertips are indices 4, 8, 12, 16, 20
        const isTip = [4, 8, 12, 16, 20].includes(index);
        const radius = isTip ? 6 : 3;
        
        ctx.shadowBlur = isTip ? 15 : 5;
        ctx.shadowColor = color;
        ctx.fillStyle = '#ffffff';
        
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); 
        ctx.fill();

        if (isTip) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath(); 
            ctx.arc(p.x, p.y, radius + 4, 0, Math.PI * 2); 
            ctx.stroke();
        }
    });
  };

  const drawCursor = (ctx: CanvasRenderingContext2D, el: ElementType) => {
      if (!smoothedCursorRef.current) return;
      const color = getElementColor(el);
      const x = smoothedCursorRef.current.x;
      const y = smoothedCursorRef.current.y;

      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
      
      // Center
      ctx.fillStyle = isPinching.current ? '#ffffff' : color;
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      
      // Reticle
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();

      // Crosshair
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      const r = 20;
      ctx.beginPath();
      ctx.moveTo(x - r, y); ctx.lineTo(x - (r-5), y);
      ctx.moveTo(x + r, y); ctx.lineTo(x + (r-5), y);
      ctx.moveTo(x, y - r); ctx.lineTo(x, y - (r-5));
      ctx.moveTo(x, y + r); ctx.lineTo(x, y + (r-5));
      ctx.stroke();

      ctx.restore();
  }

  const handleGestures = (ctx: CanvasRenderingContext2D, screenLms: any[], rawLms: any[], isMirrored: boolean, w: number, h: number) => {
      const indexTip = screenLms[8];
      
      // --- EXPONENTIAL MOVING AVERAGE (EMA) SMOOTHING ---
      if (!smoothedCursorRef.current) {
          smoothedCursorRef.current = indexTip;
      } else {
          // NewVal = OldVal * (1 - alpha) + Input * alpha
          // alpha = SMOOTHING_FACTOR. Higher = faster/jittery, Lower = smooth/laggy
          smoothedCursorRef.current = {
              x: smoothedCursorRef.current.x * (1 - SMOOTHING_FACTOR) + indexTip.x * SMOOTHING_FACTOR,
              y: smoothedCursorRef.current.y * (1 - SMOOTHING_FACTOR) + indexTip.y * SMOOTHING_FACTOR
          };
      }
      
      const cursor = smoothedCursorRef.current;
      
      const rawIndex = rawLms[8];
      const rawThumb = rawLms[4];
      const dist = distance(rawIndex, rawThumb);
      const isPinchActive = isPinching.current ? dist < PINCH_RELEASE_THRESHOLD : dist < PINCH_START_THRESHOLD;

      if (isPinchActive) {
          if (!isPinching.current) {
              isPinching.current = true;
              pathRef.current = [];
              propsRef.current.setGameState(GameState.DRAWING);
          }
          
          // --- POINT FILTERING ---
          // Only add point if it moved enough pixels from last point
          // This prevents "knots" and cleans up the data for the recognizer
          const lastPoint = pathRef.current.length > 0 ? pathRef.current[pathRef.current.length - 1] : null;
          
          if (!lastPoint || distance(lastPoint, cursor) > MIN_POINT_DISTANCE) {
              pathRef.current.push(cursor);
          }

          if (Math.random() > 0.4) spawnParticle(cursor.x, cursor.y, getElementColor(propsRef.current.selectedElement), 0.5, 0.5);
      } else {
          if (isPinching.current) {
              isPinching.current = false;
              const normalizedPath = pathRef.current.map(p => ({ x: p.x / w, y: p.y / h }));
              const gesture = recognizeGesture(normalizedPath);
              if (gesture !== GestureType.NONE) {
                  propsRef.current.onSpellCast(gesture);
                  spawnSpellVisuals(gesture, propsRef.current.selectedElement, pathRef.current[pathRef.current.length - 1], w, h);
                  propsRef.current.setGameState(GameState.CASTING);
                  setTimeout(() => { pathRef.current = []; propsRef.current.setGameState(GameState.IDLE); }, 500);
              } else {
                  propsRef.current.setGameState(GameState.IDLE);
                  pathRef.current = [];
              }
          }
      }
  };

  const spawnSpellVisuals = (gesture: GestureType, element: ElementType, pos: Point, w: number, h: number) => {
      // Logic for visuals based on (Gesture + Element)
      // Defaults
      let color = getElementColor(element);
      
      // Special Overrides per element
      if (element === ElementType.FIRE) {
          if (gesture === GestureType.TRIANGLE) effectsRef.current.push(new ProjectileEffect(pos.x, pos.y, w/2, h/2, '#ff4400', ['#ff0000', '#ffff00']));
          else if (gesture === GestureType.CHECKMARK) effectsRef.current.push(new MeteorEffect(w));
          else if (gesture === GestureType.CIRCLE) effectsRef.current.push(new ShieldEffect('#ff4400'));
          else effectsRef.current.push(new ProjectileEffect(pos.x, pos.y, w/2, h/2, '#ffaa00', ['#ff4400']));
      } 
      else if (element === ElementType.WATER) {
          if (gesture === GestureType.CIRCLE) effectsRef.current.push(new ShieldEffect('#00ffff'));
          else if (gesture === GestureType.SQUARE) effectsRef.current.push(new AreaEffect(w, h, '#00ff88'));
          else effectsRef.current.push(new ProjectileEffect(pos.x, pos.y, w/2, h/2, '#00ffff', ['#ffffff', '#0000ff']));
      }
      else if (element === ElementType.LIGHTNING) {
          if (gesture === GestureType.ZIGZAG) effectsRef.current.push(new LightningEffect(w, h));
          else if (gesture === GestureType.CIRCLE) effectsRef.current.push(new ShieldEffect('#ffff00'));
          else effectsRef.current.push(new ProjectileEffect(pos.x, pos.y, w/2, h/2, '#ffff00', ['#ffffff']));
      }
      else if (element === ElementType.AIR) {
          if (gesture === GestureType.S_SHAPE) effectsRef.current.push(new TimeWarpEffect());
          else if (gesture === GestureType.CIRCLE) effectsRef.current.push(new ShieldEffect('#ccffcc'));
          else effectsRef.current.push(new ProjectileEffect(pos.x, pos.y, w/2, h/2, '#ffffff', ['#ccffcc']));
      }

      // Burst
      for(let i=0; i<20; i++) spawnParticle(pos.x, pos.y, color, 2.0);
  };

  const drawPath = (ctx: CanvasRenderingContext2D, el: ElementType) => {
      if (pathRef.current.length < 2) return;
      const color = getElementColor(el);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      
      // Core glow
      ctx.shadowColor = color; 
      ctx.shadowBlur = 20;
      
      // Outer Line (Faint)
      ctx.strokeStyle = color.replace('rgb', 'rgba').replace(')', ', 0.2)');
      ctx.lineWidth = 12;
      ctx.beginPath();
      
      // Quadratic Curve Interpolation for Smoothness
      if (pathRef.current.length > 2) {
          ctx.moveTo(pathRef.current[0].x, pathRef.current[0].y);
          for (let i = 1; i < pathRef.current.length - 2; i++) {
              const xc = (pathRef.current[i].x + pathRef.current[i + 1].x) / 2;
              const yc = (pathRef.current[i].y + pathRef.current[i + 1].y) / 2;
              ctx.quadraticCurveTo(pathRef.current[i].x, pathRef.current[i].y, xc, yc);
          }
          // Connect last two points straight
          ctx.quadraticCurveTo(
              pathRef.current[pathRef.current.length - 2].x, 
              pathRef.current[pathRef.current.length - 2].y, 
              pathRef.current[pathRef.current.length - 1].x, 
              pathRef.current[pathRef.current.length - 1].y
          );
      } else {
          // Fallback for tiny lines
          ctx.moveTo(pathRef.current[0].x, pathRef.current[0].y);
          ctx.lineTo(pathRef.current[1].x, pathRef.current[1].y);
      }
      ctx.stroke();

      // Middle Line (Bright)
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.stroke();
      
      // Inner Line (White Hot)
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
  };

  const spawnParticle = (x: number, y: number, color: string, speedMult: number = 1.0, lifeMult: number = 1.0) => {
    const angle = Math.random() * 2 * Math.PI; const speed = (Math.random() * 4 + 2) * speedMult;
    particlesRef.current.push({ x, y, color, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1.0 * lifeMult, maxLife: 1.0 * lifeMult, size: Math.random() * 5 + 2 });
  };

  const updateParticles = (ctx: CanvasRenderingContext2D) => {
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
         const p = particlesRef.current[i];
         p.x += p.vx; p.y += p.vy; p.life -= 0.02;
         if (p.life <= 0) { particlesRef.current.splice(i, 1); continue; }
         ctx.globalAlpha = p.life / p.maxLife; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 2*Math.PI); ctx.fill(); ctx.globalAlpha = 1.0;
      }
  };

  const updateEffects = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      for (let i = effectsRef.current.length - 1; i >= 0; i--) {
          const effect = effectsRef.current[i];
          effect.update(ctx, w, h, spawnParticle);
          effect.draw(ctx);
          if (effect.isDead) effectsRef.current.splice(i, 1);
      }
  }

  return (
    <div className="relative w-full h-full bg-black">
       {cameraError && <div className="absolute inset-0 flex items-center justify-center z-50"><div className="bg-white text-red-600 p-4 rounded font-bold">{cameraError}</div></div>}
       <video ref={videoRef} className="absolute top-0 left-0 w-full h-full opacity-0 pointer-events-none" playsInline autoPlay muted />
       <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} className="block" />
    </div>
  );
};

export default MagicCanvas;