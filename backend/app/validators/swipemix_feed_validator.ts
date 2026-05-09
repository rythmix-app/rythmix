import vine from '@vinejs/vine'

export const swipemixFeedValidator = vine.compile(
  vine.object({
    limit: vine.number().min(1).max(50).optional(),
    offset: vine.number().min(0).optional(),
    country: vine.string().trim().fixedLength(2).optional(),
  })
)
