export type FoodObjType = { [key in keyof typeof FoodType]?: number };

export interface RoomResponse {
  id: string;
  min_usd_to_join: number;
  max_usd_to_join: number;
  created_at: Date;
  name: string;
  variable_stake: boolean;
  max_players: number;
  tokens: bigint;
  tokens_per_instance: bigint;
}

export interface WalletResponse {
  id: string;
  amount: bigint;
  amountInUSD?: number;
}

export interface UserResponse {
  id: string;
  public_address: string;
  wallet?: WalletResponse;
  is_admin: boolean;
}

export interface GameSessionResponse {
  id: string;
  started_at: string;
  finished_at: string;
  tokens_staked: number;
  tokens_earned: number;
  won: boolean;
  user_id: string;
  room_id: string;
  public_address?: string;
}

export interface JoinOptions {
  accessToken: string;
  stakeAmtUsd: number;
  nickname?: string;
}

export enum FoodType {
  RED,
  BLUE,
  GREEN,
  COIN,
  ORANGE,
}

// value is in millions
export interface FoodTypeItems {
  type: FoodType;
  value: number;
}

export interface RoomInstance {
  id: string;
  room_id: string;
  tokens: bigint;
  colyseus_room_id: string;
}
