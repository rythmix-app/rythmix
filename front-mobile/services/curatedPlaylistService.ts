import { get } from "./api";

export interface CuratedPlaylist {
  id: number;
  deezerPlaylistId: number;
  name: string;
  genreLabel: string;
  coverUrl: string | null;
  trackCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CuratedPlaylistTrack {
  id: number;
  title: string;
  title_short: string;
  preview: string;
  duration: number;
  artist: {
    id: number;
    name: string;
    picture?: string;
    picture_small?: string;
    picture_medium?: string;
    picture_big?: string;
    picture_xl?: string;
  };
  album: {
    id: number;
    title: string;
    cover?: string;
    cover_small?: string;
    cover_medium?: string;
    cover_big?: string;
    cover_xl?: string;
  };
}

interface GetCuratedPlaylistsResponse {
  playlists: CuratedPlaylist[];
}

interface GetCuratedPlaylistTracksResponse {
  tracks: CuratedPlaylistTrack[];
}

export const getCuratedPlaylists = async (): Promise<CuratedPlaylist[]> => {
  const data = await get<GetCuratedPlaylistsResponse>(
    "/api/games/blindtest/playlists",
  );
  return data.playlists;
};

export const getCuratedPlaylistTracks = async (
  playlistId: number,
  count = 50,
): Promise<CuratedPlaylistTrack[]> => {
  const data = await get<GetCuratedPlaylistTracksResponse>(
    `/api/games/blindtest/playlists/${playlistId}/tracks?count=${count}`,
  );
  return data.tracks;
};
