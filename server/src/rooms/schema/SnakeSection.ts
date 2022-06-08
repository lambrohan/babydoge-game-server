import { Schema, type } from '@colyseus/schema';

export class SnakeSection extends Schema {
  constructor(x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
  }

  @type('int16')
  x: number;

  @type('int16')
  y: number;

  setTo(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
