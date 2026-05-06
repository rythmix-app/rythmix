import { get } from "./api";
import { DeezerTrack } from "./deezer-api";

interface SwipemixFeedResponse {
  tracks: DeezerTrack[];
}

export const getSwipemixFeed = async (
  limit: number,
  offset: number,
): Promise<DeezerTrack[]> => {
  const data = await get<SwipemixFeedResponse>(
    `/api/me/swipemix/feed?limit=${limit}&offset=${offset}`,
  );
  return data.tracks ?? [];
};
