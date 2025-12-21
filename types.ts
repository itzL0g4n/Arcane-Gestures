export interface Point {
  x: number;
  y: number;
}

export enum SpellType {
  NONE = 'NONE',
  FIREBALL = 'FIREBALL',
  SHIELD = 'SHIELD',
  LIGHTNING = 'LIGHTNING',
  HEAL = 'HEAL',
  FROSTBOLT = 'FROSTBOLT',
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