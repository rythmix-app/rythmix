import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { randomUUID } from 'node:crypto'
import { hasMany } from '@adonisjs/lucid/orm'
import LikedTrack from '#models/liked_track'
import FavoriteGame from '#models/favorite_game'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { ApiProperty } from '@foadonis/openapi/decorators'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  static accessTokens = DbAccessTokensProvider.forModel(User)

  @ApiProperty({
    description: 'User unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @column({ isPrimary: true })
  declare id: string

  @ApiProperty({ description: 'User first name', example: 'John', nullable: true })
  @column()
  declare firstName: string | null

  @ApiProperty({ description: 'User last name', example: 'Doe', nullable: true })
  @column()
  declare lastName: string | null

  @ApiProperty({
    description: 'Unique username (3-50 characters)',
    example: 'johndoe',
    minLength: 3,
    maxLength: 50,
  })
  @column()
  declare username: string

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @ApiProperty({ description: 'User role', enum: ['user', 'admin'], example: 'user' })
  @column()
  declare role: 'user' | 'admin'

  @ApiProperty({ description: 'Account creation timestamp' })
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @ApiProperty({ description: 'Last update timestamp', nullable: true })
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @ApiProperty({ description: 'Email verification timestamp', nullable: true })
  @column.dateTime()
  declare emailVerifiedAt: DateTime | null

  @hasMany(() => LikedTrack)
  declare likedTracks: HasMany<typeof LikedTrack>

  @hasMany(() => FavoriteGame)
  declare favoriteGames: HasMany<typeof FavoriteGame>

  @column({ serializeAs: null })
  declare verificationToken: string | null

  @column.dateTime({ serializeAs: null })
  declare verificationTokenExpiresAt: DateTime | null

  @column({ serializeAs: null })
  declare refreshToken: string | null

  @column.dateTime({ serializeAs: null })
  declare refreshTokenExpiresAt: DateTime | null

  @ApiProperty({ description: 'Soft delete timestamp', nullable: true })
  @column.dateTime()
  declare deletedAt: DateTime | null

  get fullName() {
    const parts = [this.firstName, this.lastName].filter((part) => part && part !== null)
    return parts.length > 0 ? parts.join(' ') : ''
  }

  @beforeCreate()
  static assignUuid(user: User) {
    user.id = randomUUID()
  }

  async softDelete() {
    this.deletedAt = DateTime.now()
    await this.save()
  }

  async restore() {
    this.deletedAt = null
    await this.save()
  }
}
