import { Schema, Context, type, MapSchema } from '@colyseus/schema';
import { Food } from './Food';
import { PlayerState } from './Player';

export class MyRoomState extends Schema {
  @type('string')
  mySynchronizedProperty: string = 'Hello world';

  @type({ map: PlayerState })
  players: MapSchema<PlayerState> = new MapSchema<PlayerState>();

  @type({ map: Food })
  foodItems: MapSchema<Food> = new MapSchema<Food>();

  addFoodItem(food: Food): MapSchema<Food> {
    this.foodItems.set(food.id, food);
    return this.foodItems;
  }

  update(currentTime: number) {
    console.log('update');
  }
}
