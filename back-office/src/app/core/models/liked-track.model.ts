export interface LikedTrack {
  id: number;
  userId: string;
  deezerTrackId: string;
  title: string | null;
  artist: string | null;
  type: string | null;
  createdAt: Date;
  updatedAt: Date;
}
