import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import encryption from '@adonisjs/core/services/encryption'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { OauthProvider } from '#enums/oauth_provider'

export interface OAuthSpotifyPayload {
  accessToken: string
  refreshToken: string | null
  expiresAt: string | null
  scopes: string | null
}

const encryptedPayloadColumn = {
  prepare: (value: OAuthSpotifyPayload | null | undefined) =>
    value === null || value === undefined ? null : encryption.encrypt(JSON.stringify(value)),
  consume: (value: string | null | undefined) => {
    if (value === null || value === undefined) return null
    const decrypted = encryption.decrypt<string>(value)
    if (decrypted === null) return null
    return JSON.parse(decrypted) as OAuthSpotifyPayload
  },
}

export default class OAuthLinkConfirmationToken extends BaseModel {
  static table = 'oauth_link_confirmation_tokens'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare provider: OauthProvider

  @column()
  declare providerUserId: string

  @column({ serializeAs: null, ...encryptedPayloadColumn })
  declare providerPayload: OAuthSpotifyPayload | null

  @column()
  declare selector: string

  @column()
  declare tokenHash: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @beforeCreate()
  static assignUuid(token: OAuthLinkConfirmationToken) {
    token.id = randomUUID()
  }
}
