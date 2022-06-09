import { number } from '@colyseus/schema/lib/encoding/decode';
import Matter, { Vector } from 'matter-js';

export const MAX_CLIENTS_PER_ROOM = 500;

export const GAME_META = {
  width: 3000,
  height: 3000,
};

export function getRandomArbitrary(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function degToRad(angle: number): number {
  return (angle * Math.PI) / 180;
}
export function setToPolar(
  azimuth: number,
  radius: number
): { x: number; y: number } {
  if (radius == null) radius = 1;
  return {
    x: Math.cos(azimuth) * radius,
    y: Math.sin(azimuth) * radius,
  };
}

export const COLLISION_CATEGORIES = {
  FOOD: 0b0001,
  SNAKE_HEAD: 0b0010,
  BOUNDARY: 0b0100,
  SNAKE_BODY: 0b1000,
};

export const INIT_WITH_LENGTH = 2;

export class Point {
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  x: number;
  y: number;

  setTo(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export function velocityFromAngle(angle: number, speed = 1) {
  const rad = degToRad(angle);
  return Vector.create(Math.cos(rad) * speed, Math.sin(rad) * speed);
}

export const COLLISION_GROUPS = {
  FOOD: -1,
  SNAKE_HEAD: 5,
  SNAKE_BODY: 6,
};

export function labelWithID(label: BODY_LABELS, id: string) {
  return `${label}id=${id}`;
}

export function getIDFromLabel(label: string) {
  return label.split('id=').pop();
}

export const CONSTANTS = {
  SNAKE_SPEED: 4,
  SNAKE_HEAD_RAD: 20,
  SNAKE_BODY_RAD: 20,
  FOOD_RADIUS_MULTIPLIER: 1,
  FOOD_RADIUS: 35,
};
export function distanceFormula(
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  var withinRoot = Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2);
  var dist = Math.pow(withinRoot, 0.5);
  return dist;
}

export enum BODY_LABELS {
  FOOD = 'food',
  SNAKE_HEAD = 'snake_head',
  BOUNDARY = 'boundary',
  SNAKE_BODY = 'snake_body',
}

export function identifyGameObject(label: string): BODY_LABELS {
  if (/snake_head/gm.test(label)) {
    return BODY_LABELS.SNAKE_HEAD;
  }
  if (/food/gm.test(label)) {
    return BODY_LABELS.FOOD;
  }

  if (/boundary/gm.test(label)) {
    return BODY_LABELS.BOUNDARY;
  }

  if (/snake_body/gm.test(label)) {
    return BODY_LABELS.SNAKE_BODY;
  }

  return undefined;
}

export function IsSnakeHead(body: Matter.Body) {
  return identifyGameObject(body.label) === BODY_LABELS.SNAKE_HEAD;
}

export function IsSnakeBody(body: Matter.Body) {
  return identifyGameObject(body.label) === BODY_LABELS.SNAKE_BODY;
}

export function IsFoodBody(body: Matter.Body) {
  return identifyGameObject(body.label) === BODY_LABELS.FOOD;
}

export function MONGOOSE_CONFIG(): string {
  const host = process.env.MONGO_HOST || 'mongodb';
  const port = process.env.MONGO_PORT || 27017;
  const username = process.env.MONGO_USER;
  const password = process.env.MONGO_PASSWORD;

  return (
    process.env.MONGO_URI || `mongodb://${username}:${password}@${host}:${port}`
  );
}

export function lerp(p0: number, p1: number, t: number) {
  return (p1 - p0) * t + p0;
}
