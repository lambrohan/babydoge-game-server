import axios, { AxiosInstance } from 'axios';
import {
  GameSessionResponse,
  RoomInstance,
  RoomResponse,
  UserResponse,
} from './types';

export class ApiService {
  axiosInstance: AxiosInstance;
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.API_BACKEND_URL || 'http://localhost:4000',
      headers: {
        'colyseus-token': process.env.API_AUTH_TOKEN || 'changemelater',
      },
    });
  }

  async getRooms(): Promise<RoomResponse[]> {
    const { data } = await this.axiosInstance.get('/room');
    return data;
  }

  async getUser(pub_addr: string): Promise<UserResponse> {
    const { data } = await this.axiosInstance.get(`/user/${pub_addr}`);
    return data;
  }

  async initSession(
    publicAddress: string,
    roomName: string,
    stakeAmtUsd: number,
    nickname: string = ''
  ): Promise<GameSessionResponse> {
    const { data } = await this.axiosInstance.post('/play-session/init', {
      publicAddress,
      roomName,
      stakeAmtUsd: Number(stakeAmtUsd),
      nickname,
    });
    return data;
  }

  async endSession(
    sessionId: string,
    kills: number,
    tokensEarned: number,
    won: boolean,
    rank: number,
    snake_length: number
  ): Promise<{ status: string; sessionId: string }> {
    const { data } = await this.axiosInstance.post('/play-session/end', {
      sessionId,
      tokensEarned,
      kills,
      won,
      finishedAt: new Date().toISOString(),
      rank,
      snake_length,
    });
    return data;
  }

  async getFoodTypes() {
    const { data } = await this.axiosInstance.get('/metadata/food');
    return data;
  }

  async createRoomInstance(
    gameRoomId: string,
    colyseusRoomId: string
  ): Promise<RoomInstance> {
    const { data } = await this.axiosInstance.post('/room/init', {
      gameRoomId,
      colyseusRoomId,
    });

    return data;
  }

  async desposeRoomInstance(colyseusRoomId: string, tokensToRestore: bigint) {
    const { data } = await this.axiosInstance.post('/room/dispose', {
      colyseusRoomId,
      tokensToRestore,
    });
    return data;
  }
}
