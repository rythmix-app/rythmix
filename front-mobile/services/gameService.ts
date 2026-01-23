import { get } from "./api";
import { getAllGamesResponse } from "@/types/games";

export const getAllGames = async () => {
  const data = await get<getAllGamesResponse>("/api/games");
  return data.games;
};
