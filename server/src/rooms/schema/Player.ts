import { ArraySchema, Schema, type } from '@colyseus/schema';
import { SnakeSkin } from '../../utils';
import { SnakeSection } from './SnakeSection';
export interface PlayerOptions {
  publicAddress: string;
  x: number;
  y: number;
  sessionId: string;
  snakeLength: number;
  skin: SnakeSkin;
  nickname?: string;
}
export class PlayerState extends Schema {
  constructor({
    publicAddress,
    sessionId,
    x,
    y,
    snakeLength,
    skin,
    nickname,
  }: PlayerOptions) {
    super();
    this.publicAddress = publicAddress;
    this.sessionId = sessionId;
    this.x = x;
    this.y = y;
    this.sections = new ArraySchema();
    this.snakeLength = snakeLength;
    this.skin = skin;
    this.startAt = Date.now();
    this.nickname = nickname || '';
  }
  publicAddress: string;

  @type('string')
  sessionId: string;

  @type('string')
  nickname: string = '';

  @type('float32')
  x: number;

  @type('float32')
  y: number;

  @type('number')
  angle: number = 0;

  @type('number')
  snakeLength: number = 0;

  @type('int8')
  skin: SnakeSkin = SnakeSkin.GREEN_WHITE_LINE;

  @type([SnakeSection])
  sections: ArraySchema<SnakeSection>;

  @type('int8')
  kills: number = 0;

  @type('number')
  tokens: number = 0;

  @type('boolean')
  isSpeeding: boolean = false;

  @type('number')
  startAt: number = 0;

  @type('number')
  endAt: number = 0;

  @type('number')
  scale = 1;
}
