export interface HandMetrics {
  fingerCount: number;
  isFist: boolean;
  position: { x: number; y: number; z: number }; // Normalized 0-1
  palmDepth: number; // Approximate distance from camera
}

export enum ShapeType {
  HEART = 0,
  FLOWER = 1,
  PORTAL = 2,    // Doctor Strange style rings
  HEXAGRAM = 3,
  TREE = 4,      // Christmas Tree
}

export interface ParticleConfig {
  count: number;
  color: string;
}