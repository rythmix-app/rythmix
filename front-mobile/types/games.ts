export interface Game {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  isMultiplayer: boolean;
  isEnabled: boolean;
  isFavorite: boolean;
}

export interface getAllGamesResponse {
  games: Game[];
}
