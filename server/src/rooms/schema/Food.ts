import { Schema, type } from '@colyseus/schema';

//TODO - change integer and float type as per precise usage later
export class Food extends Schema {
  @type('string')
  id: string;

  @type('float32')
  x: number;

  @type('float32')
  y: number;

  @type('int16')
  size: number;

  @type('boolean')
  eaten: boolean = false;
}
