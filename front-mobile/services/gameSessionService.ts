import { del, get, patch, post } from "./api";
import {
  CreateGameSessionRequest,
  DeleteGameSessionResponse,
  GameSession,
  GameSessionStatus,
  GetAllGameSessionsResponse,
  GetGameSessionResponse,
  GetGameSessionsByGameIdResponse,
  GetGameSessionsByStatusResponse,
  UpdateGameSessionRequest,
} from "@/types/gameSession";

export const getAllGameSessions = async (): Promise<GameSession[]> => {
  const data = await get<GetAllGameSessionsResponse>("/api/game-sessions", {
    skipAuth: true,
  });
  return data.gameSessions;
};

export const createGameSession = async (
  request: CreateGameSessionRequest,
): Promise<GameSession> => {
  const data = await post<GetGameSessionResponse>(
    "/api/game-sessions",
    request,
  );
  return data.gameSession;
};

export const getGameSessionById = async (id: string): Promise<GameSession> => {
  const data = await get<GetGameSessionResponse>(`/api/game-sessions/${id}`, {
    skipAuth: true,
  });
  return data.gameSession;
};

export const updateGameSession = async (
  id: string,
  request: UpdateGameSessionRequest,
): Promise<GameSession> => {
  const data = await patch<GetGameSessionResponse>(
    `/api/game-sessions/${id}`,
    request,
  );
  return data.gameSession;
};

export const deleteGameSession = async (
  id: string,
): Promise<DeleteGameSessionResponse> => {
  return await del<DeleteGameSessionResponse>(`/api/game-sessions/${id}`);
};

export const getGameSessionsByGameId = async (
  gameId: number,
): Promise<GameSession[]> => {
  const data = await get<GetGameSessionsByGameIdResponse>(
    `/api/game-sessions/${gameId}/sessions`,
    { skipAuth: true },
  );
  return data.gameSessions;
};

export const getGameSessionsByStatus = async (
  status: GameSessionStatus,
): Promise<GameSession[]> => {
  const data = await get<GetGameSessionsByStatusResponse>(
    `/api/game-sessions/status/${status}`,
    { skipAuth: true },
  );
  return data.gameSessions;
};
