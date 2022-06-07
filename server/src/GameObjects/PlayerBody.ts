import Matter, {
  Bodies,
  Body,
  Composite,
  Composites,
  Engine,
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
  distanceFormula,
  GAME_META,
  getRandomArbitrary,
  INIT_WITH_LENGTH,
  labelWithID,
  Point,
  velocityFromAngle,
} from '../utils';

export class Player {
  head: Body;
  state: PlayerState;
  engine: Engine;
  headPath: Array<Point>;
  lastHeadPosition: Point;
  scale = 1.4;
  preferredDistance = 17 * this.scale;
  sections: Array<Body>;
  queuedSections = 0;

  constructor(engine: Engine, sessionId: string) {
    this.engine = engine;
    this.sections = new Array();
    this.headPath = new Array();
    this.state = new PlayerState({
      publicAddress: nanoid(4),
      sessionId: sessionId,
      x: getRandomArbitrary(100, 500),
      y: getRandomArbitrary(100, 500),
      score: 0,
      snakeLength: 0,
    });

    this.init();
  }

  init() {
    this.head = Bodies.circle(
      this.state.x,
      this.state.y,
      CONSTANTS.SNAKE_HEAD_RAD,
      {
        position: { x: this.state.x, y: this.state.y },
        angle: -90,
        angularSpeed: 0,
        velocity: { x: 0, y: 0 },
        speed: 0,
        mass: 0,
        inertia: 0,
        isSensor: true,
        friction: 0,
        frictionAir: 0,
        label: labelWithID(BODY_LABELS.SNAKE_HEAD, this.state.sessionId),
        force: {
          x: 0,
          y: 0,
        },
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
    Body.setVelocity(
      this.head,
      velocityFromAngle(this.head.angle, CONSTANTS.SNAKE_SPEED)
    );

    Composite.add(this.engine.world, this.head);

    // add n sections behind player head
    this.initSections(INIT_WITH_LENGTH);
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
    const sec = Bodies.circle(x, y, CONSTANTS.SNAKE_BODY_RAD, {
      isSensor: true,
      label: BODY_LABELS.SNAKE_BODY,
      collisionFilter: {
        group: COLLISION_GROUPS.FOOD,
        category: COLLISION_CATEGORIES.SNAKE_HEAD,
      },
    });

    Composite.add(this.engine.world, sec);

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
    //remove the last element of an array that contains points which
    //the head traveled through
    //then move this point to the front of the array and change its value
    //to be where the head is located
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

      this.state.sections[i].setTo(
        this.sections[i].position.x,
        this.sections[i].position.y
      );

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

    this.updateState();
  }

  updateState() {
    this.state.x = this.head.position.x;
    this.state.y = this.head.position.y;
    this.state.angle = this.head.angle;
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
    Body.setVelocity(
      this.head,
      velocityFromAngle(this.head.angle, CONSTANTS.SNAKE_SPEED)
    );
  }

  eatFood(foodState: Food) {
    this.addSectionsAfterLast(foodState.size);
  }

  destroy() {
    Composite.remove(this.engine.world, this.head);
    this.sections.forEach((sec) => {
      Composite.remove(this.engine.world, sec);
    });
  }
}
