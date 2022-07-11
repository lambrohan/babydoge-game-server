import { MapSchema } from '@colyseus/schema';
import _ from 'lodash';
import Matter, { Vector } from 'matter-js';
import { FoodObjType, FoodType, FoodTypeItems } from '../api/types';
import { Food } from '../rooms/schema/Food';

export const MAX_CLIENTS_PER_ROOM = 50;

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

export class Point {
  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    this.angle = angle;
  }
  x: number;
  y: number;
  angle: number;

  setTo(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    this.angle = angle;
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
  SNAKE_HEAD_RAD: 50,
  FOOD_RADIUS_MULTIPLIER: 1,
  FOOD_RADIUS: 25,
  LERP: 0.08,
  ROT_LERP: 0.2,
  PREF_DISTANCE: 12,
  DEF_SPEED: 3.5,
  BOOST_SPEED: 5,
  MIN_SNAKE_LENGTH: 2,
  WALL_WIDTH: 50,
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

export function GetTokensFromFoodType(type: FoodType): number {
  switch (type) {
    case FoodType.RED:
      return 1;
    case FoodType.GREEN:
      return 2;
    case FoodType.ORANGE:
      return 10;
    case FoodType.BLUE:
      return 100;
    case FoodType.COIN:
      return 1000;
    default:
      return 0;
  }
}

export function generateFoodFromTokens(tokens: bigint, foodObj: FoodObjType) {
  const foodMap = new MapSchema<Food>();
  const foodTypes = Object.keys(foodObj);
  while (tokens > BigInt(0)) {
    const r = _.random(0, foodTypes.length - 1);
    const key = foodTypes[r] as keyof typeof FoodType;
    const val = foodObj[key];
    const valInMils = BigInt(val * Math.pow(10, 6));
    if (valInMils > tokens) {
      foodTypes.splice(r, 1);
      continue;
    }
    const f = new Food(
      _.random(CONSTANTS.WALL_WIDTH, GAME_META.width - CONSTANTS.WALL_WIDTH),
      _.random(CONSTANTS.WALL_WIDTH, GAME_META.height - CONSTANTS.WALL_WIDTH),
      1,
      FoodType[key as keyof typeof FoodType]
    );
    f.scale = f.type === FoodType.COIN ? 1 : _.random(0.8, 1);
    f.tokensInMil = val;
    foodMap.set(f.id, f);
    tokens = BigInt(tokens) - valInMils;
  }

  return foodMap;
}
