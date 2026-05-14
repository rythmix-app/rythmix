import vine from '@vinejs/vine'

export const parkeurStartValidator = vine.compile(
  vine.object({
    playlistId: vine.number().min(1).optional(),
    artistId: vine.number().min(1).optional(),
  })
)
