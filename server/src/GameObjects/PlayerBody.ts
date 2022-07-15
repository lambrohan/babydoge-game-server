import _ from 'lodash';
import Matter, { Bodies, Body, Bounds, Composite, Engine } from 'matter-js';
import { GameSessionResponse } from '../api/types';
import { Food } from '../rooms/schema/Food';
import { PlayerState } from '../rooms/schema/Player';
import { SnakeSection } from '../rooms/schema/SnakeSection';
import {
  BODY_LABELS,
  COLLISION_CATEGORIES,
  COLLISION_GROUPS,
  CONSTANTS,
  degToRad,
  GAME_META,
  getRandomArbitrary,
  labelWithID,
  Point,
} from '../utils';
import { GameMath } from '../utils/math';

export class Player {
  head: Body;
  state: PlayerState;
  engine: Engine;
  snakePath: Array<Point>;
  sections: Array<Body>;
  inputQueue: any[] = [];
  SPEED = CONSTANTS.DEF_SPEED;
  target = 0;
  bodyComposite: Composite;
  lastSpeedupTimestamp = 0;
  ejectCallback: Function;
  destroyCallback: Function;
  killed = false;
  destroyed = false;

  constructor(
    engine: Engine,
    sessionId: string,
    nickname = '',
    gameSession: GameSessionResponse,
    skin: string,
    destroyCallback: Function
  ) {
    this.engine = engine;
    this.sections = new Array();
    this.snakePath = new Array();
    this.destroyCallback = destroyCallback;
    this.state = new PlayerState({
      publicAddress: gameSession.public_address,
      sessionId: sessionId,
      x: _.random(200, GAME_META.width - 400),
      y: _.random(500, GAME_META.height - 200),
      snakeLength:
        CONSTANTS.MIN_SNAKE_LENGTH +
        Math.round(gameSession.tokens_staked / 120000000),
      nickname,
      cooldown: true,
      playSessionId: gameSession.id,
      skin,
    });

    setTimeout(() => {
      this.state.cooldown = false;
    }, 5000);

    this.init();
  }

  init() {
    this.bodyComposite = Composite.create();
    Composite.add(this.engine.world, this.bodyComposite);
    this.head = Bodies.circle(
      this.state.x,
      this.state.y,
      CONSTANTS.SNAKE_HEAD_RAD * this.state.scale,
      {
        position: { x: this.state.x, y: this.state.y },
        angle: 0,
        velocity: { x: this.SPEED, y: 0 },
        isSensor: true,
        mass: 0,
        friction: 0,
        frictionAir: 0,
        label: labelWithID(BODY_LABELS.SNAKE_HEAD, this.state.sessionId),
        collisionFilter: {
          group: COLLISION_GROUPS.SNAKE_HEAD,
          category:
            COLLISION_CATEGORIES.FOOD |
            COLLISION_CATEGORIES.SNAKE_HEAD |
            COLLISION_CATEGORIES.SNAKE_BODY,
        },
      }
    );

    // TODO - init scale fix

    Composite.add(this.engine.world, this.head);

    // add n sections behind player head
    this.initSections(this.state.snakeLength);
  }

  initSections(num: number) {
    for (let i = 0; i < num; i++) {
      const x = this.head.position.x;
      const y = this.head.position.y;
      //add a point to the head path so that the section stays there
      const sec = Bodies.circle(
        x,
        y,
        CONSTANTS.SNAKE_HEAD_RAD * this.state.scale,
        {
          isSensor: true,
          force: {
            x: 0,
            y: 0,
          },
          mass: 0,
          inertia: 0,
          friction: 0,
          speed: 0,
          angularSpeed: 0,
          velocity: {
            x: 0,
            y: 0,
          },

          label: labelWithID(BODY_LABELS.SNAKE_BODY, this.state.sessionId),
          collisionFilter: {
            group: COLLISION_GROUPS.FOOD,
            category: COLLISION_CATEGORIES.SNAKE_HEAD,
          },
        }
      );

      Composite.add(this.bodyComposite, sec);
      this.sections.push(sec);
      if (i > 0) {
        this.state.sections.push(
          new SnakeSection(sec.position.x, sec.position.y)
        );
      }
    }

    for (let i = 0; i < num * this.state.spacer; i++) {
      this.snakePath.push(
        new Point(this.head.position.x, this.head.position.y, this.head.angle)
      );
    }
  }

  update() {
    this.dequeueInputs();

    const angle = GameMath.rotateTo(
      degToRad(this.head.angle),
      this.target,
      0.08
    );

    Body.setAngle(this.head, GameMath.radToDeg(angle));

    const a = GameMath.velocityFromRotation(
      degToRad(this.head.angle),
      this.SPEED
    );
    Body.setVelocity(this.head, a);

    if (
      this.lastSpeedupTimestamp &&
      this.sections.length > CONSTANTS.MIN_SNAKE_LENGTH &&
      Date.now() - this.lastSpeedupTimestamp >= 300
    ) {
      this.lastSpeedupTimestamp = Date.now();
      this.ejectFood();
    }

    const part = this.snakePath.pop()!;
    part.setTo(this.head.position.x, this.head.position.y, this.head.angle);
    this.snakePath.unshift(part);

    for (let i = 0; i < this.sections.length; i++) {
      const el = this.snakePath[i * this.state.spacer];
      Body.setPosition(this.sections[i], el);
      Body.setAngle(this.sections[i], el.angle);
    }

    this.updateState();
  }

  updateState() {
    this.state.x = Number(this.head.position.x.toFixed(2));
    this.state.y = Number(this.head.position.y.toFixed(2));
    this.state.angle = Number(this.head.angle.toFixed(2));
  }

  ejectFood() {
    if (typeof this.ejectCallback !== 'function') return;
    const sec = this.sections.pop();
    this.state.sections.pop();
    this.state.snakeLength--;
    for (let i = 0; i < this.state.spacer; i++) {
      this.snakePath.pop();
    }
    Composite.remove(this.engine.world, sec, true);
    this.ejectCallback(sec);
    this.state.tokens > 0 ? this.state.tokens-- : '';
    this.scaleDown();
    if (this.sections.length <= CONSTANTS.MIN_SNAKE_LENGTH) {
      this.stopSpeeding();
    }
  }

  stopSpeeding() {
    this.SPEED = CONSTANTS.DEF_SPEED;
    this.state.isSpeeding = false;
    this.lastSpeedupTimestamp = 0;
  }

  rotateTowards(x: number, y: number) {
    const angle = Math.atan2(
      y - this.head.position.y,
      x - this.head.position.x
    );

    const currentAngle = this.head.angle;
    this.target = angle;

    // Body.rotate(this.head, angle - currentAngle);
  }

  dequeueInputs() {
    let input: number;
    while ((input = this.inputQueue.shift())) {
      this.target = input;
    }
  }

  scaleUp() {
    this.state.scale = this.state.scale * 1.005;
    Body.scale(this.head, 1.005, 1.005);
    Composite.scale(this.bodyComposite, 1.005, 1.005, { x: 0.5, y: 0.5 });
  }
  scaleDown() {
    this.state.scale = this.state.scale / 1.005;
    Body.scale(this.head, 1 / 1.005, 1 / 1.005);
    Composite.scale(this.bodyComposite, 1 / 1.005, 1 / 1.005, {
      x: 0.5,
      y: 0.5,
    });
  }

  eatFood(foodState: Food) {
    if (!foodState) return;
    this.state.tokens += foodState.tokensInMil;
    this.addSection();
    this.scaleUp();
  }

  addSection() {
    const last = this.sections[this.sections.length - 1];
    const sec = Bodies.circle(
      last.position.x,
      last.position.y,
      CONSTANTS.SNAKE_HEAD_RAD * this.state.scale,
      {
        isSensor: true,
        force: {
          x: 0,
          y: 0,
        },
        mass: 0,
        inertia: 0,
        friction: 0,
        speed: 0,
        angularSpeed: 0,
        velocity: {
          x: 0,
          y: 0,
        },

        label: labelWithID(BODY_LABELS.SNAKE_BODY, this.state.sessionId),
        collisionFilter: {
          group: COLLISION_GROUPS.FOOD,
          category: COLLISION_CATEGORIES.SNAKE_HEAD,
        },
      }
    );

    Body.setAngle(sec, last.angle);
    Composite.add(this.bodyComposite, sec);
    this.sections.push(sec);
    this.state.sections.push(new SnakeSection(sec.position.x, sec.position.y));
    this.state.snakeLength++;

    for (let i = 0; i < this.state.spacer; i++) {
      this.snakePath.push(
        new Point(last.position.x, last.position.y, last.angle)
      );
    }
  }

  toggleSpeed(speedUp: boolean, callback: Function) {
    if (this.state.isSpeeding && speedUp) {
      return;
    }
    this.lastSpeedupTimestamp = speedUp ? Date.now() : 0;

    if (this.sections.length <= CONSTANTS.MIN_SNAKE_LENGTH) return;
    this.ejectCallback = callback;
    this.SPEED = speedUp ? CONSTANTS.BOOST_SPEED : CONSTANTS.DEF_SPEED;
    this.state.isSpeeding = speedUp === true;
  }

  async destroy(killed: boolean = false) {
    console.log('destroy');
    if (this.destroyed) return;
    this.killed = killed;
    this.destroyed = true;
    this.state.endAt = Date.now();
    await this.destroyCallback(this.state);
    Composite.remove(this.engine.world, this.head);
    this.sections.forEach((s) => {
      Composite.remove(this.engine.world, s);
    });

    Composite.remove(this.engine.world, this.bodyComposite, true);
  }
}
