import { ArraySchema, Schema, type } from '@colyseus/schema';
import { number } from '@colyseus/schema/lib/encoding/decode';
import { Food } from './Food';
import { SnakeSection } from './SnakeSection';
export interface PlayerOptions {
  publicAddress: string;
  x: number;
  y: number;
  score: number;
  sessionId: string;
  snakeLength: number;
}
export class PlayerState extends Schema {
  constructor({
    publicAddress,
    sessionId,
    x,
    y,
    score,
    snakeLength,
  }: PlayerOptions) {
    super();
    this.publicAddress = publicAddress;
    this.sessionId = sessionId;
    this.x = x;
    this.y = y;
    this.score = score;
    this.sections = new ArraySchema();
    this.snakeLength = snakeLength;
  }
  publicAddress: string;

  @type('string')
  sessionId: string;

  @type('int16')
  x: number;

  @type('int16')
  y: number;

  @type('int16')
  score: number;

  @type('int16')
  angle: number = 0;

  @type('int8')
  snakeLength: number = 0;

  @type([SnakeSection])
  sections: ArraySchema<SnakeSection>;
}
