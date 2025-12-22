import React, { useEffect, useRef, useState } from 'react';
import { GameState, Point, SpellType, Particle } from '../types';
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

// Relaxed threshold for easier drawing start
const PINCH_START_THRESHOLD = 0.06; 
const PINCH_RELEASE_THRESHOLD = 0.12; 

// -- Visual Effects System --

interface VisualEffect {
  isDead: boolean;
  update: (ctx: CanvasRenderingContext2D, width: number, height: number, spawnParticle: (x: number, y: number, color: string, speed?: number, life?: number) => void) => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

// ... EXISTING EFFECTS ...
class FireballEffect implements VisualEffect {
  x: number; y: number; vx: number; vy: number; isDead: boolean = false; targetX: number; targetY: number;
  constructor(startX: number, startY: number, targetX: number, targetY: number) {
    this.x = startX; this.y = startY; this.targetX = targetX; this.targetY = targetY;
    const angle = Math.atan2(targetY - startY, targetX - startX);
    const speed = 25; this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
  }
  update(ctx: CanvasRenderingContext2D, w: number, h: number, spawnParticle: Function) {
    this.x += this.vx; this.y += this.vy;
    for(let i=0; i<5; i++) spawnParticle(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, Math.random() > 0.5 ? '#ff4400' : '#ffff00', 2, 0.5);
    const dist = Math.sqrt(Math.pow(this.x - this.targetX, 2) + Math.pow(this.y - this.targetY, 2));
    if (dist < 30 || this.x < 0 || this.x > w || this.y < 0 || this.y > h) {
      this.isDead = true;
      for(let i=0; i<60; i++) { spawnParticle(this.x, this.y, '#ffaa00', 10, 1.5); spawnParticle(this.x, this.y, '#ff4400', 6, 1.2); }
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.shadowBlur = 40; ctx.shadowColor = '#ff4400'; ctx.fillStyle = '#ffaa00';
    ctx.beginPath(); ctx.arc(this.x, this.y, 15, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }
}

class FrostboltEffect implements VisualEffect {
    x: number; y: number; vx: number; vy: number; isDead: boolean = false; targetX: number; targetY: number;
    constructor(startX: number, startY: number, targetX: number, targetY: number) {
      this.x = startX; this.y = startY; this.targetX = targetX; this.targetY = targetY;
      const angle = Math.atan2(targetY - startY, targetX - startX);
      const speed = 22; this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
    }
    update(ctx: CanvasRenderingContext2D, w: number, h: number, spawnParticle: Function) {
      this.x += this.vx; this.y += this.vy;
      for(let i=0; i<4; i++) spawnParticle(this.x + (Math.random() - 0.5) * 15, this.y + (Math.random() - 0.5) * 15, Math.random() > 0.5 ? '#aaddff' : '#ffffff', 1.5, 0.8);
      const dist = Math.sqrt(Math.pow(this.x - this.targetX, 2) + Math.pow(this.y - this.targetY, 2));
      if (dist < 30 || this.x < 0 || this.x > w || this.y < 0 || this.y > h) {
        this.isDead = true;
        for(let i=0; i<40; i++) { spawnParticle(this.x, this.y, '#ccffff', 8, 1.2); spawnParticle(this.x, this.y, '#00ffff', 5, 1.0); }
      }
    }
    draw(ctx: CanvasRenderingContext2D) {
      ctx.shadowBlur = 25; ctx.shadowColor = '#00ffff'; ctx.fillStyle = '#ccffff';
      ctx.beginPath(); ctx.arc(this.x, this.y, 12, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
}

class ShieldEffect implements VisualEffect {
  life: number = 1.0; isDead: boolean = false;
  update() { this.life -= 0.015; if (this.life <= 0) this.isDead = true; }
  draw(ctx: CanvasRenderingContext2D) {
    const w = ctx.canvas.width; const h = ctx.canvas.height; const cx = w / 2; const cy = h / 2;
    ctx.save(); ctx.globalAlpha = Math.min(1, this.life);
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 4; ctx.shadowBlur = 30; ctx.shadowColor = '#00ff88';
    ctx.beginPath(); ctx.arc(cx, cy, 150 * (2 - this.life), 0, Math.PI * 2); ctx.fillStyle = 'rgba(0, 255, 136, 0.2)'; ctx.fill(); ctx.stroke();
    if (this.life > 0.8) { ctx.fillStyle = `rgba(0, 255, 136, ${this.life * 0.2})`; ctx.fillRect(0,0,w,h); }
    ctx.restore();
  }
}

class HealEffect implements VisualEffect {
    life: number = 1.0; isDead: boolean = false; particles: any[] = [];
    constructor(w: number, h: number) {
        for(let i=0; i<50; i++) this.particles.push({x: w/2 + (Math.random() - 0.5) * 300, y: h, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 8 - 4, size: Math.random() * 8 + 3});
    }
    update(ctx: CanvasRenderingContext2D, w: number, h: number) {
        this.life -= 0.02; if(this.life <= 0) this.isDead = true;
        this.particles.forEach(p => { p.x += p.vx; p.y += p.vy; });
    }
    draw(ctx: CanvasRenderingContext2D) {
        ctx.save(); ctx.globalAlpha = this.life; ctx.fillStyle = '#00ff88'; ctx.shadowBlur = 20; ctx.shadowColor = '#00ff88';
        this.particles.forEach(p => { ctx.beginPath(); ctx.fillRect(p.x - p.size/2, p.y - p.size * 1.5, p.size, p.size * 3); ctx.fillRect(p.x - p.size * 1.5, p.y - p.size/2, p.size * 3, p.size); });
        const gradient = ctx.createRadialGradient(ctx.canvas.width/2, ctx.canvas.height/2, 0, ctx.canvas.width/2, ctx.canvas.height/2, ctx.canvas.height);
        gradient.addColorStop(0.5, 'rgba(0,0,0,0)'); gradient.addColorStop(1, 'rgba(0, 255, 136, 0.3)'); ctx.fillStyle = gradient; ctx.fillRect(0,0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
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
    if (this.life > 0.5) { this.segments.forEach(p => { if(Math.random() > 0.6) spawnParticle(p.x, p.y, '#ffffff', 4, 0.6); }); }
  }
  draw(ctx: CanvasRenderingContext2D) {
    if (this.segments.length < 2) return;
    ctx.save(); ctx.globalAlpha = Math.random() * this.life; ctx.shadowBlur = 30; ctx.shadowColor = '#ffff00'; ctx.strokeStyle = '#ffffcc'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(this.segments[0].x, this.segments[0].y); for(let i=1; i<this.segments.length; i++) ctx.lineTo(this.segments[i].x, this.segments[i].y); ctx.stroke();
    ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)'; ctx.stroke();
    if (this.life > 0.8) { ctx.fillStyle = `rgba(255, 255, 255, ${this.life * 0.5})`; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); }
    ctx.restore();
  }
}

// -- NEW EFFECTS --

class MissilesEffect implements VisualEffect {
    missiles: {x: number, y: number, vx: number, vy: number}[] = [];
    isDead: boolean = false;
    
    constructor(startX: number, startY: number, targetX: number, targetY: number) {
        for(let i=0; i<8; i++) {
            const angle = Math.atan2(targetY - startY, targetX - startX) + (Math.random()-0.5) * 0.5;
            const speed = 20 + Math.random() * 10;
            this.missiles.push({
                x: startX + (Math.random()-0.5)*50,
                y: startY + (Math.random()-0.5)*50,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed
            });
        }
    }

    update(ctx: CanvasRenderingContext2D, w: number, h: number, spawnParticle: Function) {
        if(this.missiles.length === 0) this.isDead = true;
        
        for(let i = this.missiles.length-1; i>=0; i--) {
            const m = this.missiles[i];
            m.x += m.vx; m.y += m.vy;
            spawnParticle(m.x, m.y, '#ff00ff', 0.5, 0.3);
            
            if (m.y < 0 || m.x < 0 || m.x > w || m.y > h || (Math.abs(m.x - w/2) < 50 && Math.abs(m.y - h/2) < 50)) {
                // Hit
                for(let k=0; k<10; k++) spawnParticle(m.x, m.y, '#ff00ff', 3, 0.8);
                this.missiles.splice(i, 1);
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#ffccff';
        ctx.shadowBlur = 10; ctx.shadowColor = '#ff00ff';
        this.missiles.forEach(m => {
            ctx.beginPath(); ctx.arc(m.x, m.y, 6, 0, Math.PI*2); ctx.fill();
        });
        ctx.shadowBlur = 0;
    }
}

class MeteorEffect implements VisualEffect {
    x: number; y: number; isDead = false;
    constructor(w: number) { this.x = w/2; this.y = -100; }
    update(ctx: CanvasRenderingContext2D, w: number, h: number, spawnParticle: Function) {
        this.y += 25;
        spawnParticle(this.x + (Math.random()-0.5)*50, this.y, '#ff0000', 2, 1);
        if (this.y > h/2) {
            this.isDead = true;
            for(let i=0; i<100; i++) spawnParticle(this.x, this.y, '#ff0000', 15, 2.0);
        }
    }
    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#ff4400';
        ctx.beginPath(); ctx.arc(this.x, this.y, 60, 0, Math.PI*2); ctx.fill();
    }
}

class TimeWarpEffect implements VisualEffect {
    life = 1.0; isDead = false;
    update() { this.life -= 0.01; if(this.life <= 0) this.isDead = true; }
    draw(ctx: CanvasRenderingContext2D) {
        const cx = ctx.canvas.width/2; const cy = ctx.canvas.height/2;
        ctx.save();
        ctx.strokeStyle = '#8888ff';
        ctx.lineWidth = 5;
        ctx.globalAlpha = 0.5 * this.life;
        
        // Draw spiral
        ctx.beginPath();
        for(let i=0; i<100; i++) {
            const angle = 0.2 * i + Date.now() * 0.005;
            const r = 5 * i * (1-this.life);
            const x = cx + Math.cos(angle)*r;
            const y = cy + Math.sin(angle)*r;
            if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.stroke();
        
        // Overlay
        ctx.fillStyle = `rgba(0,0,50, ${this.life * 0.3})`;
        ctx.fillRect(0,0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }
}

interface MagicCanvasProps {
  onSpellCast: (spell: SpellType) => void;
  setGameState: (state: GameState) => void;
  gameState: GameState;
  isMirrored: boolean;
  fitMode: 'cover' | 'contain';
}

const MagicCanvas: React.FC<MagicCanvasProps> = ({ 
  onSpellCast, 
  setGameState, 
  gameState,
  isMirrored,
  fitMode
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  const isPinching = useRef<boolean>(false);
  const pathRef = useRef<Point[]>([]);
  
  // Rolling Average Buffer for smoothing
  const pointBufferRef = useRef<Point[]>([]);
  const BUFFER_SIZE = 4; // Higher = Smoother but more latency

  const cursorRef = useRef<{x: number, y: number} | null>(null);
  
  const particlesRef = useRef<Particle[]>([]);
  const effectsRef = useRef<VisualEffect[]>([]);
  const requestRef = useRef<number>(0);
  
  const propsRef = useRef({ onSpellCast, setGameState, isMirrored, fitMode });

  useEffect(() => {
    propsRef.current = { onSpellCast, setGameState, isMirrored, fitMode };
  }, [onSpellCast, setGameState, isMirrored, fitMode]);

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
            console.error("MediaPipe Hands script not loaded");
            if(isMounted) setCameraError("MediaPipe failed to load. Please refresh.");
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
                    video: {
                        facingMode: 'user',
                    },
                });
                
                if (!isMounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                
                videoRef.current.srcObject = stream;
                
                await new Promise((resolve) => {
                    if (videoRef.current) {
                        if (videoRef.current.readyState >= 1) {
                            resolve(true);
                        } else {
                            videoRef.current.onloadedmetadata = () => resolve(true);
                        }
                    }
                });

                if (!isMounted) return;

                try {
                  await videoRef.current.play();
                } catch (playErr) {
                  console.warn("Autoplay blocked:", playErr);
                }
                
                requestRef.current = requestAnimationFrame(processFrame);
            } catch (err: any) {
                console.error("Camera Error:", err);
                if (isMounted) setCameraError(err.message || "Camera error");
            }
        }
    };

    const processFrame = async () => {
        if (!isMounted) return;
        if (!videoRef.current || !hands) return;
        
        if (videoRef.current.readyState >= 2 && videoRef.current.srcObject) {
             try {
                await hands.send({ image: videoRef.current });
             } catch(e) {}
        }
        
        if (isMounted) {
            requestRef.current = requestAnimationFrame(processFrame);
        }
    };

    setup();

    return () => {
        isMounted = false;
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (hands) {
            try {
              hands.close();
            } catch(e) { }
        }
        if (stream) stream.getTracks().forEach(t => t.stop());
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };
  }, []);

  const onResults = (results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const { isMirrored, fitMode, setGameState, onSpellCast } = propsRef.current;

    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sw = canvas.width;
    const sh = canvas.height;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (vw === 0 || vh === 0) return;

    let scale = 1;
    if (fitMode === 'cover') {
        scale = Math.max(sw / vw, sh / vh);
    } else {
        scale = Math.min(sw / vw, sh / vh);
    }
    
    const scaledW = vw * scale;
    const scaledH = vh * scale;
    const offsetX = (sw - scaledW) / 2;
    const offsetY = (sh - scaledH) / 2;

    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, sw, sh); 
    
    ctx.translate(offsetX, offsetY);
    if (isMirrored) {
        ctx.translate(scaledW, 0);
        ctx.scale(-1, 1);
    }
    // Darken video slightly to make effects pop
    ctx.globalAlpha = 0.8;
    ctx.drawImage(video, 0, 0, scaledW, scaledH);
    ctx.globalAlpha = 1.0;
    ctx.restore();

    const toScreen = (p: {x: number, y: number}) => {
        let x = p.x;
        if (isMirrored) x = 1 - x; 
        
        return {
            x: offsetX + x * scaledW,
            y: offsetY + p.y * scaledH
        };
    };

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const rawLandmarks = results.multiHandLandmarks[0];
        const screenLandmarks = rawLandmarks.map(toScreen);

        drawExoskeleton(ctx, screenLandmarks);
        handleGestures(ctx, screenLandmarks, rawLandmarks, isMirrored, sw, sh);
    } else {
        cursorRef.current = null;
        if (isPinching.current) {
           isPinching.current = false;
           pathRef.current = [];
           pointBufferRef.current = [];
           setGameState(GameState.IDLE);
        }
    }

    drawCursor(ctx);
    drawPath(ctx);
    updateEffects(ctx, sw, sh);
    updateParticles(ctx);
  };

  const drawExoskeleton = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    // Cybernetic/Tech Style
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Draw connecting lines (The bones)
    for (const [start, end] of HAND_CONNECTIONS) {
       const p1 = landmarks[start];
       const p2 = landmarks[end];
       
       // Outer Glow
       ctx.shadowBlur = 10;
       ctx.shadowColor = '#00ffff';
       ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
       ctx.lineWidth = 6;
       ctx.beginPath();
       ctx.moveTo(p1.x, p1.y);
       ctx.lineTo(p2.x, p2.y);
       ctx.stroke();

       // Inner Core
       ctx.shadowBlur = 0;
       ctx.strokeStyle = '#ffffff';
       ctx.lineWidth = 2;
       ctx.beginPath();
       ctx.moveTo(p1.x, p1.y);
       ctx.lineTo(p2.x, p2.y);
       ctx.stroke();
    }

    // 2. Draw Joints
    for (const lm of landmarks) {
       // Outer Ring
       ctx.beginPath();
       ctx.arc(lm.x, lm.y, 6, 0, 2 * Math.PI);
       ctx.fillStyle = '#003333';
       ctx.fill();
       ctx.strokeStyle = '#00ffff';
       ctx.lineWidth = 2;
       ctx.stroke();
       
       // Inner Dot
       ctx.beginPath();
       ctx.arc(lm.x, lm.y, 2, 0, 2 * Math.PI);
       ctx.fillStyle = '#ffffff';
       ctx.fill();
    }
  };

  const drawCursor = (ctx: CanvasRenderingContext2D) => {
      if (!cursorRef.current) return;
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = isPinching.current ? '#ff00ff' : '#00ffff';
      ctx.fillStyle = isPinching.current ? '#ff00ff' : '#00ffff';
      
      // Main pointer
      ctx.beginPath();
      ctx.arc(cursorRef.current.x, cursorRef.current.y, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // HUD Reticle
      ctx.strokeStyle = isPinching.current ? '#ff00ff' : 'rgba(0, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cursorRef.current.x, cursorRef.current.y, 20, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cursorRef.current.x - 25, cursorRef.current.y);
      ctx.lineTo(cursorRef.current.x - 15, cursorRef.current.y);
      ctx.moveTo(cursorRef.current.x + 15, cursorRef.current.y);
      ctx.lineTo(cursorRef.current.x + 25, cursorRef.current.y);
      ctx.moveTo(cursorRef.current.x, cursorRef.current.y - 25);
      ctx.lineTo(cursorRef.current.x, cursorRef.current.y - 15);
      ctx.moveTo(cursorRef.current.x, cursorRef.current.y + 15);
      ctx.lineTo(cursorRef.current.x, cursorRef.current.y + 25);
      ctx.stroke();

      ctx.restore();
  }

  const handleGestures = (
      ctx: CanvasRenderingContext2D, 
      screenLms: any[], 
      rawLms: any[], 
      isMirrored: boolean,
      screenWidth: number,
      screenHeight: number
    ) => {
      const indexTip = screenLms[8];
      
      // --- Rolling Average Smoothing ---
      // Add current point to buffer
      pointBufferRef.current.push(indexTip);
      if (pointBufferRef.current.length > BUFFER_SIZE) {
          pointBufferRef.current.shift();
      }

      // Calculate average point
      let avgX = 0, avgY = 0;
      for(const p of pointBufferRef.current) {
          avgX += p.x;
          avgY += p.y;
      }
      avgX /= pointBufferRef.current.length;
      avgY /= pointBufferRef.current.length;

      const smoothedPoint = { x: avgX, y: avgY };
      cursorRef.current = smoothedPoint;
      
      const rawIndex = rawLms[8];
      const rawThumb = rawLms[4];
      const dist = distance(rawIndex, rawThumb);

      const isPinchActive = isPinching.current 
          ? dist < PINCH_RELEASE_THRESHOLD 
          : dist < PINCH_START_THRESHOLD;

      if (isPinchActive) {
          if (!isPinching.current) {
              isPinching.current = true;
              pathRef.current = [];
              // Don't clear buffer, just start tracking from smoothed point
              propsRef.current.setGameState(GameState.DRAWING);
          }
          
          pathRef.current.push(smoothedPoint);

          // Spawn draw particles
          if (Math.random() > 0.4) spawnParticle(smoothedPoint.x, smoothedPoint.y, '#00ffff', 0.5, 0.5);
      } else {
          if (isPinching.current) {
              isPinching.current = false;
              
              const normalizedPath = pathRef.current.map(p => ({
                  x: p.x / screenWidth,
                  y: p.y / screenHeight
              }));

              const spell = recognizeGesture(normalizedPath);
              
              if (spell !== SpellType.NONE) {
                  propsRef.current.onSpellCast(spell);
                  const lastP = pathRef.current[pathRef.current.length - 1];
                  
                  // Spawn specific effects
                  if (spell === SpellType.FIREBALL) {
                      effectsRef.current.push(new FireballEffect(lastP.x, lastP.y, screenWidth / 2, screenHeight / 2));
                  } else if (spell === SpellType.SHIELD) {
                      effectsRef.current.push(new ShieldEffect());
                  } else if (spell === SpellType.LIGHTNING) {
                      effectsRef.current.push(new LightningEffect(screenWidth, screenHeight));
                  } else if (spell === SpellType.HEAL) {
                      effectsRef.current.push(new HealEffect(screenWidth, screenHeight));
                  } else if (spell === SpellType.FROSTBOLT) {
                      effectsRef.current.push(new FrostboltEffect(lastP.x, lastP.y, screenWidth / 2, screenHeight / 2));
                  } else if (spell === SpellType.MISSILES) {
                      effectsRef.current.push(new MissilesEffect(lastP.x, lastP.y, screenWidth / 2, screenHeight / 2));
                  } else if (spell === SpellType.METEOR) {
                      effectsRef.current.push(new MeteorEffect(screenWidth));
                  } else if (spell === SpellType.TIME_WARP) {
                      effectsRef.current.push(new TimeWarpEffect());
                  }

                  // Mana burst
                  for(let i=0; i<20; i++) spawnParticle(lastP.x, lastP.y, getSpellColor(spell), 2.0);
                  
                  propsRef.current.setGameState(GameState.CASTING);
                  setTimeout(() => {
                      pathRef.current = [];
                      propsRef.current.setGameState(GameState.IDLE);
                  }, 500);
              } else {
                  propsRef.current.setGameState(GameState.IDLE);
                  pathRef.current = [];
              }
          }
      }
  };

  const drawPath = (ctx: CanvasRenderingContext2D) => {
      if (pathRef.current.length < 2) return;
      
      // Outer glow
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pathRef.current[0].x, pathRef.current[0].y);
      for (let i=1; i < pathRef.current.length; i++) {
         ctx.lineTo(pathRef.current[i].x, pathRef.current[i].y);
      }
      ctx.lineWidth = 12;
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
      ctx.stroke();

      // Core
      ctx.beginPath();
      ctx.moveTo(pathRef.current[0].x, pathRef.current[0].y);
      for (let i=1; i < pathRef.current.length; i++) {
         ctx.lineTo(pathRef.current[i].x, pathRef.current[i].y);
      }
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Inner Core
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
  };

  const spawnParticle = (x: number, y: number, color: string, speedMult: number = 1.0, lifeMult: number = 1.0) => {
    const angle = Math.random() * 2 * Math.PI;
    const speed = (Math.random() * 4 + 2) * speedMult;
    particlesRef.current.push({
       x, y, color,
       vx: Math.cos(angle) * speed,
       vy: Math.sin(angle) * speed,
       life: 1.0 * lifeMult, maxLife: 1.0 * lifeMult, size: Math.random() * 5 + 2
    });
  };

  const updateParticles = (ctx: CanvasRenderingContext2D) => {
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
         const p = particlesRef.current[i];
         p.x += p.vx;
         p.y += p.vy;
         p.life -= 0.02;
         if (p.life <= 0) {
             particlesRef.current.splice(i, 1);
             continue;
         }
         ctx.globalAlpha = p.life / p.maxLife;
         ctx.fillStyle = p.color;
         ctx.beginPath();
         ctx.arc(p.x, p.y, p.size, 0, 2*Math.PI);
         ctx.fill();
         ctx.globalAlpha = 1.0;
      }
  };

  const updateEffects = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      for (let i = effectsRef.current.length - 1; i >= 0; i--) {
          const effect = effectsRef.current[i];
          effect.update(ctx, w, h, spawnParticle);
          effect.draw(ctx);
          if (effect.isDead) {
              effectsRef.current.splice(i, 1);
          }
      }
  }

  const getSpellColor = (type: SpellType) => {
      switch(type) {
          case SpellType.FIREBALL: return '#ff4400';
          case SpellType.SHIELD: return '#00ff44';
          case SpellType.LIGHTNING: return '#ffff00';
          case SpellType.HEAL: return '#00ff88';
          case SpellType.FROSTBOLT: return '#00ffff';
          case SpellType.METEOR: return '#ff0000';
          case SpellType.MISSILES: return '#ff00ff';
          case SpellType.TIME_WARP: return '#8888ff';
          default: return '#ffffff';
      }
  };

  return (
    <div className="relative w-full h-full bg-black">
       {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center z-50">
             <div className="bg-white text-red-600 p-4 rounded font-bold">{cameraError}</div>
          </div>
       )}
       <video 
         ref={videoRef} 
         className="absolute top-0 left-0 w-full h-full opacity-0 pointer-events-none" 
         playsInline 
         autoPlay
         muted 
       />
       <canvas 
         ref={canvasRef} 
         width={dimensions.width}
         height={dimensions.height}
         className="block"
       />
    </div>
  );
};

export default MagicCanvas;