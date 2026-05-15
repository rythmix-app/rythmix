import vine from '@vinejs/vine'

export const curatedPlaylistTracksValidator = vine.compile(
  vine.object({
    count: vine.number().min(1).max(100).optional(),
  })
)

export const createCuratedPlaylistValidator = vine.compile(
  vine.object({
    url: vine.string().trim().minLength(1).maxLength(2048),
    genreLabel: vine.string().trim().minLength(1).maxLength(100),
  })
)

export const updateCuratedPlaylistValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(255),
  })
)
