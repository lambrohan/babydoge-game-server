import { MapSchema, Reflection } from '@colyseus/schema';
import { Room, Client, Delayed, ServerError } from 'colyseus';
import { Request } from 'express';
import _ from 'lodash';
import Matter, {
  Engine,
  Body,
  Runner,
  Composite,
  World,
  Bodies,
  IEventCollision,
  IPair,
  Bounds,
} from 'matter-js';
import { Player } from '../GameObjects/PlayerBody';
import {
  BODY_LABELS,
  COLLISION_CATEGORIES,
  COLLISION_GROUPS,
  CONSTANTS,
  GAME_META,
  generateFoodFromTokens,
  getIDFromLabel,
  getRandomArbitrary,
  GetTokensFromFoodType,
  IsFoodBody,
  IsSnakeBody,
  IsSnakeHead,
  labelWithID,
  MAX_CLIENTS_PER_ROOM,
} from '../utils';
import { generateDummyFood } from '../utils/dummy';
import { Food } from './schema/Food';
import { MyRoomState } from './schema/MyRoomState';
import { SnakeSection } from './schema/SnakeSection';
import * as Web3Token from 'web3-token';
import { ApiService } from '../api';
import {
  FoodObjType,
  FoodType,
  FoodTypeItems,
  GameSessionResponse,
  JoinOptions,
  RoomInstance,
  RoomResponse,
} from '../api/types';
import { PlayerState } from './schema/Player';
import moment from 'moment';
const TICK_RATE = 1000 / 60; // 20 ticks per second

export class MyRoom extends Room<MyRoomState> {
  delayedInterval!: Delayed;
  maxClients: number = MAX_CLIENTS_PER_ROOM;
  engine: Matter.Engine;
  players: Map<string, Player> = new Map();
  foodBodies: Map<string, Body> = new Map();
  apiService: ApiService;
  sortedPlayers: string[] = [];
  sortInterval: NodeJS.Timer;
  roomData: RoomResponse;
  foodTypeItems: FoodTypeItems[] = [];
  apiRoomInstance: RoomInstance;
  foodEnumObj: FoodObjType = {};

  async onCreate(roomData: RoomResponse) {
    console.log('room created');
    this.setMetadata({
      tokens: 0,
    });
    this.apiService = new ApiService();

    this.roomData = roomData;
    this.foodTypeItems = await this.apiService.getFoodTypes();
    this.foodTypeItems.forEach((f) => {
      this.foodEnumObj[f.type] = f.value;
    });
    this.apiRoomInstance = await this.apiService.createRoomInstance(
      roomData.id,
      this.roomId
    );
    this.sortInterval = setInterval(() => {
      this.refreshRank();
    }, 2000);
    this.engine = Engine.create({
      gravity: { x: 0, y: 0 },
    });
    Runner.run(this.engine);
    this.engine.world.bounds = {
      min: { x: 0, y: 0 },
      max: {
        x: GAME_META.width,
        y: GAME_META.height,
      },
    };

    const roomState = new MyRoomState();
    this.setState(roomState);

    generateFoodFromTokens(
      this.apiRoomInstance.tokens,
      this.foodEnumObj
    ).forEach((f) => {
      this.addFoodToWorld(f);
    });

    let elapsedTime = 0;
    this.setSimulationInterval((delta) => {
      elapsedTime += delta;
      while (elapsedTime >= TICK_RATE) {
        elapsedTime -= TICK_RATE;
        this.update(TICK_RATE);
      }
    });
    this.onMessage('input', (client, loc: any) => {
      this.players.get(client.sessionId)?.inputQueue.push(loc);
    });

    this.onMessage('speed', (client, speedUp: boolean) => {
      this.players.get(client.sessionId)?.toggleSpeed(speedUp, (sec: Body) => {
        if (!sec) return;
        const f = new Food(sec.position.x, sec.position.y, 1, FoodType.RED);
        f.tokensInMil = this.foodEnumObj.RED;
        this.addFoodToWorld(f);
        Composite.remove(this.engine.world, sec);
      });
    });

    Matter.Events.on(this.engine, 'collisionStart', async (event) => {
      await this.handleCollision(event);
    });
  }

  async onAuth(client: Client, options: JoinOptions, request: Request) {
    try {
      const jwt = options.accessToken;
      const userData = await Web3Token.verify(jwt);
      const session = await this.apiService.initSession(
        userData.address,
        this.roomData.name,
        options.stakeAmtUsd,
        options?.nickname || ''
      );
      session.public_address = userData.address;
      if (!session) throw new ServerError(400, 'unable to create session');

      return session;
    } catch (error: any) {
      if (error.response) {
        throw new ServerError(400, error.response.data.message);
        return;
      }
      throw new ServerError(400, error.message);
    }
  }

  async handleCollision(event: IEventCollision<Matter.Engine>) {
    const [pair] = event.pairs;
    if (
      (IsFoodBody(pair.bodyA) && IsSnakeHead(pair.bodyB)) ||
      (IsFoodBody(pair.bodyB) && IsSnakeHead(pair.bodyA))
    ) {
      // player food collision
      this.initFoodEatingSeq(pair);
      return;
    }

    // player head to body collision
    if (
      (IsSnakeBody(pair.bodyA) && IsSnakeHead(pair.bodyB)) ||
      (IsSnakeBody(pair.bodyB) && IsSnakeHead(pair.bodyA))
    ) {
      this.handleP2PCollision(pair);
    }
  }

  onJoin(client: Client, options: any, auth: GameSessionResponse) {
    console.log(client.sessionId, 'joined!');
    const player = new Player(
      this.engine,
      client.sessionId,
      options?.nickname,
      auth,
      options.skin,
      async (state: PlayerState) => {
        client.send('gameover', state.playSessionId);
        client.leave();
      }
    );
    this.players.set(client.sessionId, player);
    this.state.players.set(client.sessionId, player.state);
  }

  async onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, 'left!');
    const player = this.players.get(client.sessionId);
    if (!player) return;
    const won = this.isWinning(player.state);
    await this.apiService
      .endSession(
        player.state.playSessionId,
        player.state.kills,
        player.state.tokens,
        won,
        player.state.rank,
        player.state.snakeLength
      )
      .catch((e) => {
        console.log(e.response.data);
      });
    const tokens = player.state.tokens;
    const sections = player.sections.map(
      (s) => ({ x: s.position.x, y: s.position.y } as SnakeSection)
    );

    if (!won) {
      if (player.killed) {
        this.dropFoodAtSections(sections, BigInt(tokens * Math.pow(10, 6)));
      } else {
        this.dropFoodRandomly(BigInt(tokens * Math.pow(10, 6)));
      }
    }
    if (!player.destroyed) player.destroy();

    this.players.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
  }

  async onDispose() {
    console.log('room', this.roomId, 'disposing...');
    let tokensToRestore = BigInt(0);
    this.state.foodItems.forEach((f) => {
      tokensToRestore =
        BigInt(tokensToRestore) + BigInt(f.tokensInMil * Math.pow(10, 6));
    });
    await this.apiService
      .desposeRoomInstance(this.roomId, tokensToRestore)
      .catch((e) => {
        console.log(e.response.data.message);
      });
    Engine.clear(this.engine);
    this.players = new MapSchema();
    this.foodBodies = new MapSchema();
    clearInterval(this.sortInterval);
    console.log('room', this.roomId, 'disposed');
  }

  // game loop
  update(delta: number) {
    this.state.players.forEach((p) => {
      const player = this.players.get(p.sessionId);
      if (player) {
        player.update();

        // if player out of bound remove
        if (!Bounds.contains(this.engine.world.bounds, player.head.position)) {
          if (process.env.NODE_ENV === 'loadtest') {
            player.rotateTowards(GAME_META.width / 2, GAME_META.height / 2);
          } else {
            player.destroy(true);
          }
        }
      }
    });
  }

  handleInput(client: Client, pointerLoc: any) {
    if (!pointerLoc) return;
    const [x, y] = `${pointerLoc}`.split('.');
    this.players.get(client.sessionId).inputQueue.push({ x, y });
  }

  handleJoystick(client: Client, loc: any) {
    this.players.get(client.sessionId).inputQueue.push(loc);
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
    this.metadata.tokens -= food.tokensInMil;
    const player = this.state.players.get(playerId);
    this.players.get(player.sessionId).eatFood(food);
    this.state.foodItems.delete(foodId);
    this.foodBodies.delete(foodId);
    World.remove(this.engine.world, foodBody);
  }

  /**
   * Handle player to player collision
   * @param pair PairBody
   * @returns
   */

  handleP2PCollision(pair: IPair) {
    if (process.env.NODE_ENV === 'loadtest') {
      return;
    }
    const snakeHead = IsSnakeHead(pair.bodyA) ? pair.bodyA : pair.bodyB;
    const snakeBody = IsSnakeBody(pair.bodyA) ? pair.bodyA : pair.bodyB;
    // destory player with snake haead
    const headPlayerId = getIDFromLabel(snakeHead.label);
    const bodyPlayerId = getIDFromLabel(snakeBody.label);
    if (headPlayerId === bodyPlayerId) return;

    // generate food items to be dropped
    const player = this.players.get(headPlayerId);
    if (player.state.cooldown) return;
    this.players.get(headPlayerId).destroy(true);
    this.state.players.get(bodyPlayerId).kills++;
  }

  /**
   * Adds food items into matter engine
   * @param f foodItem
   */
  addFoodToWorld(f: Food) {
    this.metadata.tokens += f.tokensInMil;
    const fBody = Bodies.circle(f.x, f.y, CONSTANTS.FOOD_RADIUS, {
      position: {
        x: f.x,
        y: f.y,
      },

      isSensor: true,
      isStatic: true,
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
    Body.scale(fBody, f.scale, f.scale);
    Composite.add(this.engine.world, fBody);
    this.foodBodies.set(f.id, fBody);
  }

  /**
   * Create walls around world so that snakes can collide
   */

  createWalls() {
    const leftWall = Matter.Bodies.rectangle(
      0,
      GAME_META.height / 2,
      CONSTANTS.WALL_WIDTH,
      GAME_META.height,
      {
        isStatic: true,
        label: BODY_LABELS.BOUNDARY,
        mass: 10,
      }
    );
    const topWall = Matter.Bodies.rectangle(
      GAME_META.width / 2,
      0,
      GAME_META.width,
      CONSTANTS.WALL_WIDTH,
      {
        isStatic: true,
        label: BODY_LABELS.BOUNDARY,
        mass: 10,
      }
    );
    const rightWall = Matter.Bodies.rectangle(
      GAME_META.width,
      GAME_META.height / 2,

      CONSTANTS.WALL_WIDTH,
      GAME_META.height,
      {
        isStatic: true,
        label: BODY_LABELS.BOUNDARY,

        mass: 10,
      }
    );
    const bottomWall = Matter.Bodies.rectangle(
      GAME_META.width / 2,
      GAME_META.height,
      GAME_META.width,
      CONSTANTS.WALL_WIDTH,
      { isStatic: true, label: BODY_LABELS.BOUNDARY, mass: 10 }
    );

    Composite.add(this.engine.world, [
      leftWall,
      topWall,
      rightWall,
      bottomWall,
    ]);
  }

  createCircularWall() {
    Matter.Bodies.circle(
      GAME_META.width / 2,
      GAME_META.height / 2,
      GAME_META.width / 2,
      { isSensor: true, mass: 0 }
    );
  }

  dropFoodRandomly(tokens: bigint) {
    const food = generateFoodFromTokens(tokens, this.foodEnumObj);
    food.forEach((f) => {
      this.addFoodToWorld(f);
    });
  }

  dropFoodAtSections(sections: SnakeSection[], tokens: bigint) {
    const food = generateFoodFromTokens(tokens, this.foodEnumObj);
    while (food.size > 0) {
      for (let i = 1; i < sections.length; i++) {
        const sec = sections[i];
        const x =
          sec.x +
          getRandomArbitrary(3, 10) * Math.sign(getRandomArbitrary(-1, 1));
        const y =
          sec.y +
          getRandomArbitrary(3, 10) * Math.sign(getRandomArbitrary(-1, 1));

        if (!food.size) return;

        const key = food.keys().next().value;
        const f = food.get(key);
        f.x = x;
        f.y = y;
        this.addFoodToWorld(f);
        food.delete(key);
      }
    }
  }

  isWinning(state: PlayerState): boolean {
    return state.kills >= 3 && moment().diff(state.startAt, 'minutes') > 10;
  }

  refreshRank() {
    let maxScore = 0;
    const pls: string[] = [];
    this.state.players.forEach((p) => {
      if (p.tokens > maxScore) {
        pls.unshift(p.sessionId);
        maxScore = p.tokens;
      } else {
        pls.push(p.sessionId);
      }
    });

    this.sortedPlayers = pls;
    this.sortedPlayers.forEach((id, i) => {
      this.state.players.get(id).rank = i + 1;
    });
  }
}
