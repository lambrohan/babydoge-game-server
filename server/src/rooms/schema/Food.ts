import { Schema, type } from '@colyseus/schema';

export class Food extends Schema {
  @type('string')
  id: string;

  @type('number')
  x: number;

  @type('number')
  y: number;

  @type('number')
  size: number;
}
