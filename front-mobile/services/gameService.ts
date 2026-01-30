import { get, post, del } from "./api";
import { getAllGamesResponse } from "@/types/games";

export const getAllGames = async () => {
  const data = await get<getAllGamesResponse>("/api/games");
  return data.games;
};

export const addFavoriteGame = async (gameId: number) => {
  await post("/api/favorite-games", { gameId });
};

export const removeFavoriteGame = async (gameId: number) => {
  await del(`/api/favorite-games/game/${gameId}`);
};
