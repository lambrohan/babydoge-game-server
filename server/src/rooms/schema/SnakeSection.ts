import { Schema, type } from '@colyseus/schema';

export class SnakeSection extends Schema {
  constructor(x: number, y: number, index: number) {
    super();
    this.x = x;
    this.y = y;
    this.index = index;
  }

  @type('int8')
  index: number;

  @type('float32')
  x: number;

  @type('float32')
  y: number;

  setTo(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
