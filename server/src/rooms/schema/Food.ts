import { Schema, type } from '@colyseus/schema';
import { FoodAssetType } from '../../utils';

export class Food extends Schema {
  @type('string')
  id: string;

  @type('number')
  x: number;

  @type('number')
  y: number;

  @type('number')
  type: FoodAssetType;
}
