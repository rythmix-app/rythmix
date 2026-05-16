import { del, get, post } from "./api";
import {
  GetMyTrackInteractionsResponse,
  InteractionAction,
  TrackInteraction,
  UpsertTrackInteractionRequest,
  UpsertTrackInteractionResponse,
} from "@/types/trackInteraction";

export const upsertMyTrackInteraction = async (
  request: UpsertTrackInteractionRequest,
): Promise<UpsertTrackInteractionResponse> => {
  return post<UpsertTrackInteractionResponse>(
    "/api/me/swipemix/interactions",
    request,
  );
};

export const deleteMyTrackInteraction = async (
  deezerTrackId: string,
): Promise<void> => {
  await del(`/api/me/swipemix/interactions/${deezerTrackId}`);
};

export const getMyTrackInteractions = async (
  action?: InteractionAction,
): Promise<TrackInteraction[]> => {
  const query = action ? `?action=${action}` : "";
  const data = await get<GetMyTrackInteractionsResponse>(
    `/api/me/swipemix/interactions${query}`,
  );
  return data.interactions;
};
