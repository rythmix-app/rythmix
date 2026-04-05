export interface LikedTrack {
  id: string;
  userId: string;
  deezerTrackId: string;
  title: string;
  artist: string;
  type: "track";
}

export interface CreateLikedTrackRequest {
  deezerTrackId: string;
  title: string;
  artist: string;
  type: "track";
}

export interface CreateLikedTrackResponse {
  likedTrack: LikedTrack;
}

export interface GetMyLikedTracksResponse {
  likedTracks: LikedTrack[];
}
