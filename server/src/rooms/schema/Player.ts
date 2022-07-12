import { ArraySchema, Schema, type } from '@colyseus/schema';
import { SnakeSection } from './SnakeSection';
export interface PlayerOptions {
  publicAddress: string;
  x: number;
  y: number;
  sessionId: string;
  snakeLength: number;
  nickname?: string;
  cooldown?: boolean;
  playSessionId: string;
  skin: string;
}
export class PlayerState extends Schema {
  constructor({
    publicAddress,
    sessionId,
    x,
    y,
    snakeLength,
    nickname,
    cooldown = false,
    playSessionId,
    skin = 'blue.png',
  }: PlayerOptions) {
    super();
    this.publicAddress = publicAddress;
    this.sessionId = sessionId;
    this.x = x;
    this.y = y;
    this.sections = new ArraySchema();
    this.snakeLength = snakeLength;
    this.startAt = Date.now();
    this.nickname = nickname || '';
    this.cooldown = cooldown;
    this.playSessionId = playSessionId;
    this.skin = skin;
  }
  publicAddress: string;

  playSessionId: string;

  @type('number')
  rank: number = 0;

  @type('string')
  sessionId: string;

  @type('string')
  nickname: string = '';

  @type('int16')
  spacer: number = 3;

  @type('float32')
  x: number;

  @type('float32')
  y: number;

  @type('number')
  angle: number = 0;

  @type('number')
  snakeLength: number = 0;

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
  scale = 0.8;

  @type('boolean')
  cooldown = false;

  @type('string')
  skin: string = 'blue.png';
}
