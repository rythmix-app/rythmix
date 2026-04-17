export type GameSessionStatus = "pending" | "active" | "completed" | "canceled";

export interface GameSessionPlayer {
  userId: string;
}

export interface GameSession {
  id: string;
  gameId: number;
  status: GameSessionStatus;
  players: GameSessionPlayer[];
  gameData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGameSessionRequest {
  gameId: number;
  status?: GameSessionStatus;
  players?: GameSessionPlayer[];
  gameData?: Record<string, unknown>;
}

export interface UpdateGameSessionRequest {
  gameId?: number;
  status?: GameSessionStatus;
  players?: GameSessionPlayer[];
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

export interface GetMyGameSessionsResponse {
  gameSessions: GameSession[];
}

export interface GetMyGameHistoryResponse {
  meta: {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
    firstPage: number;
  };
  data: GameSession[];
}

export interface GetMyActiveGameSessionResponse {
  gameSession: GameSession | null;
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

// Types spécifiques pour le jeu Higher or Lower
export interface HigherOrLowerRound {
  artistAId: number;
  artistAName: string;
  artistAFans: number;
  artistBId: number;
  artistBName: string;
  artistBFans: number;
  playerAnswer: "higher" | "lower";
  isCorrect: boolean;
}

export interface HigherOrLowerGameData {
  totalRounds: number;
  streak: number;
  bestStreak: number;
  rounds: HigherOrLowerRound[];
  startedAt: string;
  completedAt: string | null;
}

// Types spécifiques pour le jeu Blind Test
export interface BlindtestRound {
  trackId: number;
  trackTitle: string;
  artistId: number;
  artistName: string;
  featuringNames: string[];
  albumTitle: string;
  coverUrl: string;
  artistCorrect: boolean;
  featuringFoundNames: string[];
  titleCorrect: boolean;
  bonusEarned: boolean;
  timeTakenMs: number;
  roundScore: number;
}

export interface BlindtestGameData {
  genre: {
    id: number;
    name: string;
  };
  totalRounds: number;
  rounds: BlindtestRound[];
  totalScore: number;
  maxScore: number;
  startedAt: string;
  completedAt: string | null;
}
