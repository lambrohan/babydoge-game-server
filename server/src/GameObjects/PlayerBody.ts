import { ArraySchema } from '@colyseus/schema';
import Matter, {
  Bodies,
  Body,
  Composite,
  Composites,
  Engine,
  Vector,
  World,
} from 'matter-js';
import { nanoid } from 'nanoid';
import { Food } from '../rooms/schema/Food';
import { PlayerState } from '../rooms/schema/Player';
import { SnakeSection } from '../rooms/schema/SnakeSection';
import {
  BODY_LABELS,
  COLLISION_CATEGORIES,
  COLLISION_GROUPS,
  CONSTANTS,
  degToRad,
  distanceFormula,
  GAME_META,
  getRandomArbitrary,
  labelWithID,
  Point,
  SnakeSkin,
} from '../utils';
import { GameMath } from '../utils/math';

export class Player {
  head: Body;
  state: PlayerState;
  engine: Engine;
  headPath: Array<Point>;
  lastHeadPosition: Point;
  scale = 1;
  preferredDistance = CONSTANTS.PREF_DISTANCE * this.scale;
  sections: Array<Body>;
  queuedSections = 0;
  inputQueue: any[] = [];
  SPEED = 2.5;
  ROTATION_SPEED = 1 * Math.PI;
  TOLERANCE = 0.02 * this.ROTATION_SPEED;
  target = 0;
  bodyComposite: Composite;

  constructor(engine: Engine, sessionId: string) {
    this.engine = engine;
    this.sections = new Array();
    this.headPath = new Array();
    this.state = new PlayerState({
      publicAddress: nanoid(4),
      sessionId: sessionId,
      x: getRandomArbitrary(0, GAME_META.width / 2),
      y: getRandomArbitrary(0, GAME_META.height / 2),
      snakeLength: 0,
      skin: 2,
    });

    this.init();
  }

  init() {
    this.bodyComposite = Composite.create();
    Composite.add(this.engine.world, this.bodyComposite);
    this.head = Bodies.circle(
      this.state.x,
      this.state.y,
      CONSTANTS.SNAKE_HEAD_RAD,
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
    this.lastHeadPosition = new Point(this.state.x, this.state.y);

    Composite.add(this.engine.world, this.head);

    // add n sections behind player head
    this.initSections(2);
  }

  initSections(num: number) {
    for (let i = 1; i <= num; i++) {
      const x = this.head.position.x;
      const y = this.head.position.x + i * this.preferredDistance;
      this.addSectionAtPosition(x, y);
      //add a point to the head path so that the section stays there
      this.headPath.push(new Point(this.head.position.x, this.head.position.y));
    }
  }

  findNextPointIndex(currentIndex: number) {
    //we are trying to find a point at approximately this distance away
    //from the point before it, where the distance is the total length of
    //all the lines connecting the two points
    let prefDist = this.preferredDistance;
    let len = 0;
    let dif = len - prefDist;
    let i = currentIndex;
    let prevDif = null;
    //this loop sums the distances between points on the path of the head
    //starting from the given index of the function and continues until
    //this sum nears the preferred distance between two snake sections
    while (i + 1 < this.headPath.length && (dif === null || dif < 0)) {
      //get distance between next two points
      let dist = distanceFormula(
        this.headPath[i].x,
        this.headPath[i].y,
        this.headPath[i + 1].x,
        this.headPath[i + 1].y
      );
      len += dist;
      prevDif = dif;
      //we are trying to get the difference between the current sum and
      //the preferred distance close to zero
      dif = len - prefDist;
      i++;
    }

    //choose the index that makes the difference closer to zero
    //once the loop is complete
    if (prevDif === null || Math.abs(prevDif) > Math.abs(dif)) {
      return i;
    } else {
      return i - 1;
    }
  }

  addSectionAtPosition(x: number, y: number) {
    //initialize a new section
    const sec = Bodies.circle(x, y, CONSTANTS.SNAKE_HEAD_RAD, {
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
    });

    Composite.add(this.bodyComposite, sec);
    this.state.snakeLength++;

    this.sections.push(sec);
    this.state.sections.push(new SnakeSection(x, y));

    return sec;
  }

  onCycleComplete() {
    if (this.queuedSections > 0) {
      let lastSec = this.sections[this.sections.length - 1];
      this.addSectionAtPosition(lastSec.position.x, lastSec.position.y);
      this.queuedSections--;
    }
  }

  addSectionsAfterLast(amount: number) {
    this.queuedSections += amount;
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

    this.updateState();

    if (!this.head) return;
    let point = this.headPath.pop()!;
    point.setTo(this.head.position.x, this.head.position.y);
    this.headPath.unshift(point);

    //place each section of the snake on the path of the snake head,
    //a certain distance from the section before it
    let index = 0;
    let lastIndex = null;
    for (let i = 0; i < this.state.snakeLength; i++) {
      Body.setPosition(
        this.sections[i],
        Matter.Vector.create(this.headPath[index].x, this.headPath[index].y)
      );

      // this.updateSectionState(i)

      //hide sections if they are at the same position
      // if (lastIndex && index == lastIndex) {
      // 	this.sections[i].alpha = 0
      // } else {
      // 	this.sections[i].alpha = 1
      // }

      lastIndex = index;
      //this finds the index in the head path array that the next point
      //should be at
      index = this.findNextPointIndex(index);
    }

    if (index >= this.headPath.length - 1) {
      let lastPos = this.headPath[this.headPath.length - 1];
      this.headPath.push(new Point(lastPos.x, lastPos.y));
    } else {
      this.headPath.pop();
    }

    //this calls onCycleComplete every time a cycle is completed
    //a cycle is the time it takes the second section of a snake to reach
    //where the head of the snake was at the end of the last cycle
    let i = 0;
    let found = false;
    while (
      this.headPath[i].x != this.sections[1].position.x &&
      this.headPath[i].y != this.sections[1].position.y
    ) {
      if (
        this.headPath[i].x == this.lastHeadPosition.x &&
        this.headPath[i].y == this.lastHeadPosition.y
      ) {
        found = true;
        break;
      }
      i++;
    }
    if (!found) {
      this.lastHeadPosition = new Point(
        this.head.position.x,
        this.head.position.y
      );
      this.onCycleComplete();
    }
  }

  updateSectionState(i: number) {
    this.state.sections[i].setTo(
      Number(this.sections[i].position.x.toFixed(2)),
      Number(this.sections[i].position.y.toFixed(2))
    );
  }

  updateState() {
    this.state.x = Number(this.head.position.x.toFixed(2));
    this.state.y = Number(this.head.position.y.toFixed(2));
    this.state.angle = Number(this.head.angle.toFixed(2));
  }

  rotateTowards(x: string, y: string) {
    const angle =
      (Math.atan2(
        parseInt(y) - this.head.position.y,
        parseInt(x) - this.head.position.x
      ) *
        180) /
      Math.PI;
    const currentAngle = this.head.angle;

    Body.rotate(this.head, angle - currentAngle);
  }

  dequeueInputs() {
    let input: number;
    while ((input = this.inputQueue.shift())) {
      this.target = input;
    }
  }

  setScale() {
    this.scale = this.scale * 1.01;
    this.preferredDistance = CONSTANTS.PREF_DISTANCE * this.scale;
    Body.scale(this.head, 1.01, 1.01);
    Composite.scale(this.bodyComposite, 1.01, 1.01, { x: 0.5, y: 0.5 });
  }

  eatFood(foodState: Food) {
    this.addSectionsAfterLast(1);
    this.setScale();
  }

  destroy() {
    Composite.remove(this.engine.world, this.head);
    Composite.clear(this.bodyComposite, false, true);
    this.sections = [];
  }
}
