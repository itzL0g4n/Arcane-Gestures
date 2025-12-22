
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
  LINE_V = 'LINE_V',        // Bolt
  LINE_H = 'LINE_H',        // Slash
  ZIGZAG = 'ZIGZAG',        // Lightning
  CHECKMARK = 'CHECKMARK',  // Meteor
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
