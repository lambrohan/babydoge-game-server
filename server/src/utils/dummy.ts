import { Food } from '../rooms/schema/Food';
import { nanoid } from 'nanoid';
import { MapSchema } from '@colyseus/schema';
import { GAME_META, getRandomArbitrary } from '.';
export function generateDummyFood() {
  const foodGroup: MapSchema<Food> = new MapSchema();
  for (var i = 0; i < 400; i++) {
    const f = new Food();
    f.id = nanoid(4);
    f.size = 1;
    f.x = getRandomArbitrary(0, GAME_META.width);
    f.y = getRandomArbitrary(0, GAME_META.height);
    foodGroup.set(f.id, f);
  }

  return foodGroup;
}
