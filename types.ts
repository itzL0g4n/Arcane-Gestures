
export interface Point {
  x: number;
  y: number;
}

export enum SpellType {
  NONE = 'NONE',
  FIREBALL = 'FIREBALL', // Triangle/V
  SHIELD = 'SHIELD', // Circle
  LIGHTNING = 'LIGHTNING', // ZigZag
  HEAL = 'HEAL', // Square
  FROSTBOLT = 'FROSTBOLT', // Vertical Line
  METEOR = 'METEOR', // Checkmark
  MISSILES = 'MISSILES', // Horizontal Line
  TIME_WARP = 'TIME_WARP', // S Shape
}

export interface Spell {
  id: string;
  type: SpellType;
  name: string;
  color: string;
  icon: string;
  timestamp: number;
}

export enum GameState {
  IDLE = 'IDLE',       // Hand detected, waiting
  DRAWING = 'DRAWING', // Pinching, recording path
  CASTING = 'CASTING', // Spell recognized, playing effect
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}
