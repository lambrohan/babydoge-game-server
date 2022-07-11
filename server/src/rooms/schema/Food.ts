import { Schema, type } from '@colyseus/schema';
import _ from 'lodash';
import { nanoid } from 'nanoid';
import { FoodType } from '../../api/types';

export class Food extends Schema {
  constructor(x: number, y: number, scale: number, type: FoodType) {
    super();
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.type = type;
    this.id = nanoid(4);
  }
  @type('string')
  id: string;

  @type('number')
  x: number;

  @type('number')
  y: number;

  @type('number')
  scale = 1;

  @type('number')
  type: FoodType;

  @type('number')
  tokensInMil: number = 0;
}
