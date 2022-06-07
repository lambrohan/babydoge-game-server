import { Schema, type } from '@colyseus/schema';

//TODO - change integer and float type as per precise usage later
export class Food extends Schema {
  @type('string')
  id: string;

  @type('int16')
  x: number;

  @type('int16')
  y: number;

  @type('number')
  size: number;

  @type('boolean')
  eaten: boolean = false;
}
