export type GameSessionStatus = "pending" | "active" | "completed";

export interface GameSession {
  id: string;
  gameId: number;
  status: GameSessionStatus;
  players: Record<string, string>;
  gameData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGameSessionRequest {
  gameId: number;
  status?: GameSessionStatus;
  players?: Record<string, string>;
  gameData?: Record<string, unknown>;
}

export interface UpdateGameSessionRequest {
  gameId?: number;
  status?: GameSessionStatus;
  players?: Record<string, string>;
  gameData?: Record<string, unknown>;
}

export interface GetAllGameSessionsResponse {
  gameSessions: GameSession[];
}

export interface GetGameSessionResponse {
  gameSession: GameSession;
}

export interface GetGameSessionsByGameIdResponse {
  gameSessions: GameSession[];
}

export interface GetGameSessionsByStatusResponse {
  gameSessions: GameSession[];
}

export interface DeleteGameSessionResponse {
  message: string;
}

// Types spécifiques pour le jeu Blurchette
export interface BlurchetteAttempt {
  answer: string;
  isCorrect: boolean;
  blurLevel: number;
  timestamp: string;
}

export interface BlurchetteGameData {
  genre: {
    id: number;
    name: string;
  };
  track: {
    id: number;
    title: string;
    artistId: number;
    artistName: string;
    albumId: number;
    albumTitle: string;
    coverUrl: string;
  };
  isAlbum: boolean;
  currentBlurLevel: number;
  attempts: BlurchetteAttempt[];
  foundCorrect: boolean | null;
  finalBlurLevel: number | null;
  startedAt: string;
  completedAt: string | null;
}

// Types spécifiques pour le jeu Tracklist
export interface TrackAnswer {
  userInput: string;
  isCorrect: boolean;
  matchedTrackId?: number;
  timestamp: string;
}

export interface TracklistGameData {
  genre: {
    id: number;
    name: string;
  };
  album: {
    id: number;
    title: string;
    artistName: string;
    coverUrl: string;
    totalTracks: number;
  };
  answers: TrackAnswer[];
  score: number;
  maxScore: number;
  timeElapsed: number;
  startedAt?: string;
  completedAt: string;
}
