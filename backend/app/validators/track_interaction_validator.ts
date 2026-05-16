import vine from '@vinejs/vine'
import { INTERACTION_ACTIONS } from '#enums/interaction_action'

export const createTrackInteractionValidator = vine.compile(
  vine.object({
    deezerTrackId: vine.string().trim().minLength(1).maxLength(64),
    deezerArtistId: vine.string().trim().minLength(1).maxLength(64).optional(),
    action: vine.enum(INTERACTION_ACTIONS),
    title: vine.string().trim().maxLength(255).optional(),
    artist: vine.string().trim().maxLength(255).optional(),
    isrc: vine.string().trim().maxLength(32).optional(),
  })
)

export const listTrackInteractionsValidator = vine.compile(
  vine.object({
    action: vine.enum(INTERACTION_ACTIONS).optional(),
  })
)
