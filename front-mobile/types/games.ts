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

export interface FavoriteGame {
  id: string;
  userId: string;
  gameId: number;
  game: Game;
}

export interface getMyFavoriteGamesResponse {
  favoriteGames: FavoriteGame[];
}
