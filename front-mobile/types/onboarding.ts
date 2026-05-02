export interface OnboardingArtist {
  id: number;
  userId: string;
  deezerArtistId: string;
  artistName: string;
  rank: number;
}

export interface OnboardingArtistSuggestion {
  id: number;
  name: string;
  picture_medium: string;
  picture_big?: string;
  nb_fan?: number;
}

export interface OnboardingStatus {
  completed: boolean;
  artistsCount: number;
}

export interface ListOnboardingArtistsResponse {
  artists: OnboardingArtist[];
}

export interface SetOnboardingArtistsResponse {
  artists: OnboardingArtist[];
}

export interface OnboardingSuggestionsResponse {
  artists: OnboardingArtistSuggestion[];
}

export const MIN_ONBOARDING_ARTISTS = 3;
export const MAX_ONBOARDING_ARTISTS = 5;
