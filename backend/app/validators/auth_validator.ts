import vine from '@vinejs/vine'

const verifyDeepLinkUrlRule = vine
  .string()
  .url({ require_protocol: true, protocols: ['exp', 'frontmobile'] })
  .maxLength(2048)
  .optional()

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
    password: vine.string().minLength(8).maxLength(255).confirmed(),
    firstName: vine.string().minLength(1).maxLength(100).optional(),
    lastName: vine.string().minLength(1).maxLength(100).optional(),
    role: vine.enum(['user', 'admin']).optional(),
    optInNewsletter: vine.boolean().optional(),
    verifyDeepLinkUrl: verifyDeepLinkUrlRule,
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
    verifyDeepLinkUrl: verifyDeepLinkUrlRule,
  })
)
