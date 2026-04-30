import vine from '@vinejs/vine'

export const curatedPlaylistTracksValidator = vine.compile(
  vine.object({
    count: vine.number().min(1).max(100).optional(),
  })
)
