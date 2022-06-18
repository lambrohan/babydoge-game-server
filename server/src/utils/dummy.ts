import { Food } from '../rooms/schema/Food';
import { nanoid } from 'nanoid';
import { MapSchema } from '@colyseus/schema';
import {
  FoodAssetType,
  GAME_META,
  getRandomArbitrary,
  GetTokensFromFoodType,
} from '.';
import _ from 'lodash';
export function generateDummyFood() {
  const foodGroup: MapSchema<Food> = new MapSchema();
  for (var i = 0; i < 400; i++) {
    const f = new Food(
      _.random(50, GAME_META.width - 50),
      _.random(50, GAME_META.height - 50),
      1,
      _.random(4)
    );
    f.scale = f.type == FoodAssetType.COIN ? 1 : _.random(0.5, 1.0);
    f.tokensInMil = Math.round(GetTokensFromFoodType(f.type) * f.scale);
    foodGroup.set(f.id, f);
  }

  return foodGroup;
}
