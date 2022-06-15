import { Food } from '../rooms/schema/Food';
import { nanoid } from 'nanoid';
import { MapSchema } from '@colyseus/schema';
import { FoodAssetType, GAME_META, getRandomArbitrary } from '.';
import _ from 'lodash';
export function generateDummyFood() {
  const foodGroup: MapSchema<Food> = new MapSchema();
  for (var i = 0; i < 400; i++) {
    const f = new Food(
      _.random(100, GAME_META.width - 100),
      _.random(GAME_META.height - 100),
      1,
      _.random(3)
    );
    f.scale = f.type == FoodAssetType.COIN ? 1 : _.random(10, 16) / 10;
    foodGroup.set(f.id, f);
  }

  return foodGroup;
}
