import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
  vine.object({
    email: vine
      .string()
      .email()
      .maxLength(254)
      .normalizeEmail()
      .unique(async (db, value) => {
        const user = await db.from('users').where('email', value).first()
        return !user
      }),
    username: vine
      .string()
      .minLength(3)
      .maxLength(50)
      .unique(async (db, value) => {
        const user = await db.from('users').where('username', value).first()
        return !user
      }),
    password: vine.string().minLength(8).maxLength(255),
    firstName: vine.string().minLength(1).maxLength(100).optional(),
    lastName: vine.string().minLength(1).maxLength(100).optional(),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string(),
  })
)

export const refreshTokenValidator = vine.compile(
  vine.object({
    refreshToken: vine.string(),
  })
)

export const resendVerificationValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
  })
)
