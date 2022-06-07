import { Schema, type } from '@colyseus/schema';

export class SnakeSection extends Schema {
  constructor(x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
  }
  @type('float32')
  x: number;

  @type('float32')
  y: number;

  setTo(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
