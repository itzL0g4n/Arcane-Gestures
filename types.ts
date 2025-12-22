
export interface Point {
  x: number;
  y: number;
}

export enum ElementType {
  FIRE = 'FIRE',
  WATER = 'WATER',
  LIGHTNING = 'LIGHTNING',
  AIR = 'AIR'
}

export enum GestureType {
  NONE = 'NONE',
  TRIANGLE = 'TRIANGLE',    // Fireball
  CIRCLE = 'CIRCLE',        // Shield
  SQUARE = 'SQUARE',        // Heal
  V_SHAPE = 'V_SHAPE',      // Bolt/Zap (Replaces Line V)
  ZIGZAG = 'ZIGZAG',        // Lightning
  CHECKMARK = 'CHECKMARK',  // Meteor/Slash
  S_SHAPE = 'S_SHAPE',      // Tornado
}

export interface Spell {
  id: string;
  name: string;
  element: ElementType;
  gesture: GestureType;
  timestamp: number;
  color: string;
}

export enum GameState {
  IDLE = 'IDLE',       
  DRAWING = 'DRAWING', 
  CASTING = 'CASTING', 
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
