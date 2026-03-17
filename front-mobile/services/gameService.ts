import { get, post, del } from "./api";
import { getAllGamesResponse, getMyFavoriteGamesResponse } from "@/types/games";

export const getAllGames = async () => {
  const data = await get<getAllGamesResponse>("/api/games");
  return data.games;
};

export const getMyFavoriteGames = async () => {
  const data = await get<getMyFavoriteGamesResponse>("/api/favorite-games/me");
  return data.favoriteGames.map((fav) => fav.game);
};

export const addFavoriteGame = async (gameId: number) => {
  await post("/api/favorite-games", { gameId });
};

export const removeFavoriteGame = async (gameId: number) => {
  await del(`/api/favorite-games/game/${gameId}`);
};
