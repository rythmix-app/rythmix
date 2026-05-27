import vine from '@vinejs/vine'

export const listActivitiesValidator = vine.compile(
  vine.object({
    limit: vine.number().min(1).max(20).optional(),
  })
)
