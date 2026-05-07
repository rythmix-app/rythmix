import { get } from "./api";

export interface UserStats {
  totalSwipes: number;
  gamesPlayed: number;
  streak: number;
}

export const userStatsService = {
  /**
   * Fetch aggregated statistics for the current user
   */
  getMyStats: async (): Promise<UserStats> => {
    const response = await get<{ data: UserStats }>("/api/me/stats");
    return response.data;
  },
};
