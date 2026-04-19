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
  GetMyActiveGameSessionResponse,
  GetMyGameHistoryResponse,
  GetMyGameSessionsResponse,
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

export const getMyGameSessions = async (
  status?: GameSessionStatus,
): Promise<GameSession[]> => {
  const url = status
    ? `/api/game-sessions/me?status=${status}`
    : "/api/game-sessions/me";
  const data = await get<GetMyGameSessionsResponse>(url);
  return data.gameSessions;
};

export const getMyGameHistory = async (
  gameId: number,
  options?: { status?: GameSessionStatus; page?: number; limit?: number },
): Promise<GetMyGameHistoryResponse> => {
  const params = new URLSearchParams();
  if (options?.status) params.append("status", options.status);
  if (options?.page) params.append("page", String(options.page));
  if (options?.limit) params.append("limit", String(options.limit));
  const query = params.toString() ? `?${params.toString()}` : "";
  return await get<GetMyGameHistoryResponse>(
    `/api/game-sessions/me/game/${gameId}${query}`,
  );
};

export const getMyActiveSession = async (
  gameId: number,
): Promise<GameSession | null> => {
  const data = await get<GetMyActiveGameSessionResponse>(
    `/api/game-sessions/me/game/${gameId}/active`,
  );
  return data.gameSession;
};
