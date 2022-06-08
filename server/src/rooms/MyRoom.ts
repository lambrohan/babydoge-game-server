import { Room, Client, Delayed } from 'colyseus';
import Matter, {
  Engine,
  Body,
  Runner,
  Vector,
  Composite,
  Bounds,
  World,
  Bodies,
  IEventCollision,
  IPair,
} from 'matter-js';
import { nanoid } from 'nanoid';
import { Player } from '../GameObjects/PlayerBody';
import {
  BODY_LABELS,
  COLLISION_CATEGORIES,
  COLLISION_GROUPS,
  CONSTANTS,
  GAME_META,
  getIDFromLabel,
  identifyGameObject,
  IsFoodBody,
  IsSnakeBody,
  IsSnakeHead,
  labelWithID,
  MAX_CLIENTS_PER_ROOM,
} from '../utils';
import { generateDummyFood } from '../utils/dummy';
import { Food } from './schema/Food';
import { MyRoomState } from './schema/MyRoomState';
const TICK_RATE = 20; // 20 ticks per second

export class MyRoom extends Room<MyRoomState> {
  delayedInterval!: Delayed;
  maxClients: number = MAX_CLIENTS_PER_ROOM;
  engine: Matter.Engine = Engine.create({
    gravity: { x: 0, y: 0 },
  });
  players: Map<string, Player> = new Map();
  foodBodies: Map<string, Body> = new Map();
  onCreate() {
    Runner.run(this.engine);
    this.engine.world.bounds = {
      min: { x: 0, y: 0 },
      max: { x: GAME_META.width, y: GAME_META.height },
    };
    const leftWall = Matter.Bodies.rectangle(
      0,
      GAME_META.height / 2,
      1,
      GAME_META.height,
      {
        isStatic: true,
        label: BODY_LABELS.BOUNDARY,
      }
    );
    const topWall = Matter.Bodies.rectangle(
      GAME_META.width / 2,
      0,
      GAME_META.width,
      1,
      {
        isStatic: true,
        label: BODY_LABELS.BOUNDARY,
      }
    );
    const rightWall = Matter.Bodies.rectangle(
      GAME_META.width,
      GAME_META.height / 2,

      1,
      GAME_META.height,
      { isStatic: true, label: BODY_LABELS.BOUNDARY }
    );
    const bottomWall = Matter.Bodies.rectangle(
      GAME_META.width / 2,
      GAME_META.height,
      GAME_META.width,
      1,
      { isStatic: true, label: BODY_LABELS.BOUNDARY }
    );

    Composite.add(this.engine.world, [
      leftWall,
      topWall,
      rightWall,
      bottomWall,
    ]);

    console.log('room created');

    const roomState = new MyRoomState();
    this.setState(roomState);

    // generateDummyFood().forEach((f) => {
    //   this.addFoodToWorld(f);
    // });

    const fd = new Food();
    fd.x = 600;
    fd.y = 600;
    fd.size = 1;
    fd.id = nanoid(2);
    this.addFoodToWorld(fd);

    this.setSimulationInterval((delta) => this.update(delta));

    this.onMessage('input', (client, loc) => this.handleInput(client, loc));

    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      this.handleCollision(event);
    });
  }

  handleCollision(event: IEventCollision<Matter.Engine>) {
    const [pair] = event.pairs;
    if (
      (IsFoodBody(pair.bodyA) && IsSnakeHead(pair.bodyB)) ||
      (IsFoodBody(pair.bodyB) && IsSnakeHead(pair.bodyA))
    ) {
      // player food collision
      this.initFoodEatingSeq(pair);
    }

    if (
      identifyGameObject(pair.bodyA.label) === BODY_LABELS.BOUNDARY &&
      identifyGameObject(pair.bodyB.label) === BODY_LABELS.SNAKE_HEAD
    ) {
      // player and boundary collision
      const player = this.players.get(getIDFromLabel(pair.bodyB.label));
      player?.rotateTowards(
        `${GAME_META.width / 2}`,
        `${GAME_META.height / 2}`
      );
    }

    // player head to body collision
    if (
      (IsSnakeBody(pair.bodyA) && IsSnakeHead(pair.bodyB)) ||
      (IsSnakeBody(pair.bodyB) && IsSnakeHead(pair.bodyA))
    ) {
      this.handleP2PCollision(pair);
    }
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, 'joined!');

    const player = new Player(this.engine, client.sessionId);
    this.players.set(client.sessionId, player);
    this.state.players.set(client.sessionId, player.state);
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, 'left!');
    if (!this.players.has(client.sessionId)) return;
    this.players.get(client.sessionId).destroy();

    this.players.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log('room', this.roomId, 'disposing...');
  }

  // game loop
  update(delta: number) {
    this.state.players.forEach((p) => {
      const player = this.players.get(p.sessionId);
      player ? player.update() : '';
    });
  }

  handleInput(client: Client, pointerLoc: string) {
    const [x, y] = pointerLoc.split(':');
    this.players.get(client.sessionId)?.rotateTowards(x, y);
  }

  initFoodEatingSeq(pair: IPair) {
    const foodBody = IsFoodBody(pair.bodyA) ? pair.bodyA : pair.bodyB;
    const snakeBody = IsSnakeHead(pair.bodyA) ? pair.bodyA : pair.bodyB;
    // nom nom
    /**
     * 1. Add the size player length
     * 2. Remove the food from gameplay
     */
    const foodId = getIDFromLabel(foodBody.label);
    const playerId = getIDFromLabel(snakeBody.label);
    const food = this.state.foodItems.get(foodId);
    const player = this.state.players.get(playerId);
    this.players.get(player.sessionId).eatFood(food);
    this.state.foodItems.delete(foodId);
    this.foodBodies.delete(foodId);
    World.remove(this.engine.world, foodBody);
  }

  handleP2PCollision(pair: IPair) {
    const snakeHead = IsSnakeHead(pair.bodyA) ? pair.bodyA : pair.bodyB;
    const snakeBody = IsSnakeBody(pair.bodyA) ? pair.bodyA : pair.bodyB;
    // destory player with snake haead
    const headPlayerId = getIDFromLabel(snakeHead.label);
    const bodyPlayerId = getIDFromLabel(snakeBody.label);
    if (headPlayerId === bodyPlayerId) return;

    // generate food items to be dropped
    const player = this.players.get(headPlayerId);
    for (let i = 0; i < player.sections.length; i++) {
      const section = player.sections[i];
      const fd = new Food();
      fd.id = nanoid(4);
      fd.x = section.position.x;
      fd.y = section.position.y;
      // TODO fix sizes later
      fd.size = 1;
      this.addFoodToWorld(fd);
    }

    this.players.get(headPlayerId).destroy();
    this.state.players.delete(headPlayerId);

    this.players.delete(headPlayerId);
  }

  addFoodToWorld(f: Food) {
    const fBody = Bodies.circle(f.x, f.y, CONSTANTS.FOOD_RADIUS, {
      position: {
        x: f.x,
        y: f.y,
      },
      isSensor: true,
      angularSpeed: 0,
      velocity: { x: 0, y: 0 },
      speed: 0,
      mass: 0,
      inertia: 0,
      friction: 0,
      frictionAir: 0,
      label: labelWithID(BODY_LABELS.FOOD, f.id),
      force: {
        x: 0,
        y: 0,
      },
      collisionFilter: {
        group: COLLISION_GROUPS.FOOD,
        category: COLLISION_CATEGORIES.SNAKE_HEAD,
      },
    });
    this.state.foodItems.set(f.id, f);
    Composite.add(this.engine.world, fBody);
    this.foodBodies.set(f.id, fBody);
  }
}
