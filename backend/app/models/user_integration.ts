import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import encryption from '@adonisjs/core/services/encryption'
import User from '#models/user'
import { IntegrationProvider } from '#enums/integration_provider'
import { ApiProperty } from '@foadonis/openapi/decorators'

const encryptedColumn = {
  prepare: (value: string | null | undefined) =>
    value === null || value === undefined ? value : encryption.encrypt(value),
  consume: (value: string | null | undefined) =>
    value === null || value === undefined ? value : encryption.decrypt<string>(value),
}

export default class UserIntegration extends BaseModel {
  @ApiProperty({ description: 'Integration unique identifier', example: 1 })
  @column({ isPrimary: true })
  declare id: number

  @ApiProperty({ description: 'User ID owning the integration (UUID)' })
  @column()
  declare userId: string

  @ApiProperty({ description: 'Third-party provider', enum: Object.values(IntegrationProvider) })
  @column()
  declare provider: IntegrationProvider

  @ApiProperty({ description: 'Provider-side user id' })
  @column()
  declare providerUserId: string

  @column({ serializeAs: null, ...encryptedColumn })
  declare accessToken: string

  @column({ serializeAs: null, ...encryptedColumn })
  declare refreshToken: string | null

  @ApiProperty({ description: 'Access token expiry (ISO8601)', nullable: true })
  @column.dateTime()
  declare expiresAt: DateTime | null

  @ApiProperty({ description: 'Space-separated scopes granted by the user', nullable: true })
  @column()
  declare scopes: string | null

  @ApiProperty({
    description: 'Spotify "Rythmix Likes" playlist id',
    nullable: true,
  })
  @column()
  declare spotifyLikedPlaylistId: string | null

  @ApiProperty({ description: 'Creation timestamp' })
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @ApiProperty({ description: 'Last update timestamp' })
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  get isExpired(): boolean {
    if (!this.expiresAt) return false
    return this.expiresAt <= DateTime.now()
  }
}
