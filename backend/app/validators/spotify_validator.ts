import vine from '@vinejs/vine'

export const spotifyTopValidator = vine.compile(
  vine.object({
    timeRange: vine.enum(['short_term', 'medium_term', 'long_term']).optional(),
    limit: vine.number().min(1).max(50).optional(),
  })
)

export const spotifyRecentlyPlayedValidator = vine.compile(
  vine.object({
    limit: vine.number().min(1).max(50).optional(),
  })
)
