import { del, get, post } from "./api";
import {
  CreateLikedTrackRequest,
  CreateLikedTrackResponse,
  GetMyLikedTracksResponse,
  LikedTrack,
} from "@/types/likedTrack";

export const createMyLikedTrack = async (
  request: CreateLikedTrackRequest,
): Promise<LikedTrack> => {
  const data = await post<CreateLikedTrackResponse>(
    "/api/liked-tracks/me",
    request,
  );
  return data.likedTrack;
};

export const deleteMyLikedTrack = async (
  deezerTrackId: string,
): Promise<void> => {
  await del(`/api/liked-tracks/me/${deezerTrackId}`);
};

export const getMyLikedTracks = async (): Promise<LikedTrack[]> => {
  const data = await get<GetMyLikedTracksResponse>("/api/liked-tracks/me");
  return data.likedTracks;
};
