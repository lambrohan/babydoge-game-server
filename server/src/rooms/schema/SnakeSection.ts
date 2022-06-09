import { Schema, type } from '@colyseus/schema';

export class SnakeSection extends Schema {
  constructor(x: number = 0, y: number = 0) {
    super();
    this.x = x;
    this.y = y;
  }

  @type('float32')
  x: number = 0;

  @type('float32')
  y: number = 0;

  setTo(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
