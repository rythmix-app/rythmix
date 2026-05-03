import { get, post } from "./api";
import {
  ListOnboardingArtistsResponse,
  OnboardingArtist,
  OnboardingArtistSuggestion,
  OnboardingStatus,
  OnboardingSuggestionsResponse,
  SetOnboardingArtistsResponse,
} from "@/types/onboarding";

export const getMyOnboardingStatus = async (): Promise<OnboardingStatus> => {
  return await get<OnboardingStatus>("/api/me/onboarding/status");
};

export const getMyOnboardingArtists = async (): Promise<OnboardingArtist[]> => {
  const data = await get<ListOnboardingArtistsResponse>(
    "/api/me/onboarding/artists",
  );
  return data.artists;
};

export const setMyOnboardingArtists = async (
  deezerArtistIds: number[],
): Promise<OnboardingArtist[]> => {
  const data = await post<SetOnboardingArtistsResponse>(
    "/api/me/onboarding/artists",
    { deezerArtistIds },
  );
  return data.artists;
};

export const getOnboardingArtistSuggestions = async (
  options: { country?: string; limit?: number } = {},
): Promise<OnboardingArtistSuggestion[]> => {
  const params = new URLSearchParams();
  if (options.country) params.append("country", options.country);
  if (options.limit) params.append("limit", String(options.limit));
  const query = params.toString();
  const data = await get<OnboardingSuggestionsResponse>(
    `/api/me/onboarding/artists/suggestions${query ? `?${query}` : ""}`,
  );
  return data.artists;
};

export const getOnboardingSpotifySuggestions = async (): Promise<
  OnboardingArtistSuggestion[]
> => {
  const data = await get<OnboardingSuggestionsResponse>(
    "/api/me/onboarding/artists/spotify-suggestions",
  );
  return data.artists;
};
