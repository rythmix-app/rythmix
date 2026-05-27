import { get } from "./api";
import { GetMyActivitiesResponse, UserActivity } from "@/types/userActivity";

export const getMyActivities = async (
  limit?: number,
): Promise<UserActivity[]> => {
  const query = limit !== undefined ? `?limit=${limit}` : "";
  const data = await get<GetMyActivitiesResponse>(`/api/me/activities${query}`);
  return data.activities;
};
