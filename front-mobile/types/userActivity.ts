export type UserActivity =
  | {
      type: "game_session";
      date: string;
      gameTitle: string;
      score: number;
      maxScore: number;
    }
  | {
      type: "liked_track";
      date: string;
      trackTitle: string | null;
      artist: string | null;
    };

export interface GetMyActivitiesResponse {
  activities: UserActivity[];
}
