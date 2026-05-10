import { post } from "./api";
import { deezerAPI, DeezerArtist } from "./deezer-api";
import type { GameSession, ParkeurRound } from "@/types/gameSession";

export interface StartParkeurSessionResponse {
  session: GameSession;
  rounds: ParkeurRound[];
}

export type StartParkeurSessionInput =
  | { playlistId: number }
  | { artistId: number };

export const startParkeurSession = async (
  input: StartParkeurSessionInput,
): Promise<StartParkeurSessionResponse> => {
  return post<StartParkeurSessionResponse>("/api/games/parkeur/start", input);
};

export type DeezerArtistSearchResult = DeezerArtist;

export const searchDeezerArtists = async (
  query: string,
  limit = 15,
): Promise<DeezerArtistSearchResult[]> => {
  if (!query.trim()) return [];
  const response = await deezerAPI.searchArtists(query.trim(), limit);
  return response.data ?? [];
};
