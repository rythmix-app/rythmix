export type GameSessionStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'canceled';

export const GAME_SESSION_STATUSES: GameSessionStatus[] = [
  'pending',
  'active',
  'completed',
  'canceled',
];

export interface GameSessionPlayer {
  userId: string;
  status?: string;
  score?: number;
  expGained?: number;
  rank?: number;
}

export interface GameSession {
  id: string;
  gameId: number;
  status: GameSessionStatus;
  players: GameSessionPlayer[];
  gameData: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateGameSessionDto {
  status?: GameSessionStatus;
}
