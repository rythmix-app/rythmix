export type InteractionAction = "liked" | "disliked";

export interface TrackInteraction {
  id: number;
  userId: string;
  deezerTrackId: string;
  deezerArtistId: string | null;
  action: InteractionAction;
  title: string | null;
  artist: string | null;
  isrc: string | null;
}

export interface UpsertTrackInteractionRequest {
  deezerTrackId: string;
  deezerArtistId?: string;
  action: InteractionAction;
  title?: string;
  artist?: string;
  isrc?: string;
}

export interface SpotifyTriggerSnapshot {
  triggered: boolean;
  added?: boolean;
  removed?: boolean;
  notOnSpotify?: boolean;
  scopeUpgradeRequired?: boolean;
}

export interface UpsertTrackInteractionResponse {
  interaction: TrackInteraction;
  spotifyResult?: SpotifyTriggerSnapshot;
}

export interface GetMyTrackInteractionsResponse {
  interactions: TrackInteraction[];
}
