import {
  getAllGameSessions,
  createGameSession,
  getGameSessionById,
  updateGameSession,
  deleteGameSession,
  getGameSessionsByGameId,
  getGameSessionsByStatus,
  getMyGameSessions,
  getMyActiveSession,
} from "../gameSessionService";

import { get, post, patch, del } from "../api";

jest.mock("../api", () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  del: jest.fn(),
}));

const mockGet = get as jest.MockedFunction<typeof get>;
const mockPost = post as jest.MockedFunction<typeof post>;
const mockPatch = patch as jest.MockedFunction<typeof patch>;
const mockDel = del as jest.MockedFunction<typeof del>;

const mockSession = {
  id: "session-uuid",
  gameId: 1,
  status: "active" as const,
  players: [{ userId: "user-1" }],
  gameData: {},
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getAllGameSessions", () => {
  it("should return list of sessions", async () => {
    mockGet.mockResolvedValueOnce({ gameSessions: [mockSession] });
    const result = await getAllGameSessions();
    expect(result).toEqual([mockSession]);
    expect(mockGet).toHaveBeenCalledWith("/api/game-sessions", {
      skipAuth: true,
    });
  });
});

describe("createGameSession", () => {
  it("should create and return a session", async () => {
    mockPost.mockResolvedValueOnce({ gameSession: mockSession });
    const request = { gameId: 1, status: "active" as const };
    const result = await createGameSession(request);
    expect(result).toEqual(mockSession);
    expect(mockPost).toHaveBeenCalledWith("/api/game-sessions", request);
  });
});

describe("getGameSessionById", () => {
  it("should return session by id", async () => {
    mockGet.mockResolvedValueOnce({ gameSession: mockSession });
    const result = await getGameSessionById("session-uuid");
    expect(result).toEqual(mockSession);
    expect(mockGet).toHaveBeenCalledWith(
      "/api/game-sessions/session-uuid",
      expect.objectContaining({ skipAuth: true }),
    );
  });
});

describe("updateGameSession", () => {
  it("should update and return session", async () => {
    const updated = { ...mockSession, status: "completed" as const };
    mockPatch.mockResolvedValueOnce({ gameSession: updated });
    const result = await updateGameSession("session-uuid", {
      status: "completed",
    });
    expect(result).toEqual(updated);
    expect(mockPatch).toHaveBeenCalledWith("/api/game-sessions/session-uuid", {
      status: "completed",
    });
  });
});

describe("deleteGameSession", () => {
  it("should delete and return confirmation message", async () => {
    mockDel.mockResolvedValueOnce({ message: "Deleted" });
    const result = await deleteGameSession("session-uuid");
    expect(result).toEqual({ message: "Deleted" });
    expect(mockDel).toHaveBeenCalledWith("/api/game-sessions/session-uuid");
  });
});

describe("getGameSessionsByGameId", () => {
  it("should return sessions for a game", async () => {
    mockGet.mockResolvedValueOnce({ gameSessions: [mockSession] });
    const result = await getGameSessionsByGameId(1);
    expect(result).toEqual([mockSession]);
    expect(mockGet).toHaveBeenCalledWith(
      "/api/game-sessions/1/sessions",
      expect.objectContaining({ skipAuth: true }),
    );
  });
});

describe("getGameSessionsByStatus", () => {
  it("should return sessions filtered by status", async () => {
    mockGet.mockResolvedValueOnce({ gameSessions: [mockSession] });
    const result = await getGameSessionsByStatus("active");
    expect(result).toEqual([mockSession]);
    expect(mockGet).toHaveBeenCalledWith(
      "/api/game-sessions/status/active",
      expect.objectContaining({ skipAuth: true }),
    );
  });
});

describe("getMyGameSessions", () => {
  it("should return authenticated user sessions without status filter", async () => {
    mockGet.mockResolvedValueOnce({ gameSessions: [mockSession] });
    const result = await getMyGameSessions();
    expect(result).toEqual([mockSession]);
    expect(mockGet).toHaveBeenCalledWith("/api/game-sessions/me");
  });

  it("should append status query param when provided", async () => {
    mockGet.mockResolvedValueOnce({ gameSessions: [mockSession] });
    const result = await getMyGameSessions("active");
    expect(result).toEqual([mockSession]);
    expect(mockGet).toHaveBeenCalledWith("/api/game-sessions/me?status=active");
  });
});

describe("getMyActiveSession", () => {
  it("should return the active session for a game", async () => {
    mockGet.mockResolvedValueOnce({ gameSession: mockSession });
    const result = await getMyActiveSession(1);
    expect(result).toEqual(mockSession);
    expect(mockGet).toHaveBeenCalledWith("/api/game-sessions/me/game/1/active");
  });

  it("should return null when no active session exists", async () => {
    mockGet.mockResolvedValueOnce({ gameSession: null });
    const result = await getMyActiveSession(2);
    expect(result).toBeNull();
    expect(mockGet).toHaveBeenCalledWith("/api/game-sessions/me/game/2/active");
  });
});
