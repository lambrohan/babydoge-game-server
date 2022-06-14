import Matter from 'matter-js';
import { setToPolar } from '.';

export class GameMath {
  static angleBetween(x1: number, y1: number, x2: number, y2: number) {
    return Math.atan2(y2 - y1, x2 - x1);
  }

  static wrapAngle(angle: number) {
    return this.wrap(angle, -Math.PI, Math.PI);
  }

  static wrap(value: number, min: number, max: number) {
    let range = max - min;

    return min + ((((value - min) % range) + range) % range);
  }

  static within(a: number, b: number, tolerance: number) {
    return Math.abs(a - b) <= tolerance;
  }

  static radToDeg(radians: number) {
    return (radians * 180) / Math.PI;
  }

  static velocityFromRotation(rotation: number, speed: number): Matter.Vector {
    return setToPolar(rotation, speed);
  }

  static rotateTo(currentAngle: number, targetAngle: number, lerp: number) {
    if (lerp === undefined) {
      lerp = 0.05;
    }

    if (currentAngle === targetAngle) {
      return currentAngle;
    }

    if (
      Math.abs(targetAngle - currentAngle) <= lerp ||
      Math.abs(targetAngle - currentAngle) >= Math.PI * 2 - lerp
    ) {
      currentAngle = targetAngle;
    } else {
      if (Math.abs(targetAngle - currentAngle) > Math.PI) {
        if (targetAngle < currentAngle) {
          targetAngle += Math.PI * 2;
        } else {
          targetAngle -= Math.PI * 2;
        }
      }

      if (targetAngle > currentAngle) {
        currentAngle += lerp;
      } else if (targetAngle < currentAngle) {
        currentAngle -= lerp;
      }
    }

    return currentAngle;
  }
}
