export interface CuratedPlaylist {
  id: number;
  deezerPlaylistId: number;
  name: string;
  genreLabel: string;
  coverUrl: string | null;
  trackCount: number;
  nameOverridden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportCuratedPlaylistDto {
  url: string;
  genreLabel: string;
}

export interface RenameCuratedPlaylistDto {
  name: string;
}

export interface DeezerTrack {
  id: number;
  title: string;
  title_short: string;
  preview: string;
  duration: number;
  artist: { id: number; name: string };
  album: { id: number; title: string };
}
