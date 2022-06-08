import { Schema, Context, type, MapSchema } from '@colyseus/schema';
import { Food } from './Food';
import { PlayerState } from './Player';

export class MyRoomState extends Schema {
  @type({ map: PlayerState })
  players: MapSchema<PlayerState> = new MapSchema<PlayerState>();

  @type({ map: Food })
  foodItems: MapSchema<Food> = new MapSchema<Food>();
}
