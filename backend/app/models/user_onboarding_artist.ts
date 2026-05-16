import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { ApiProperty } from '@foadonis/openapi/decorators'

export default class UserOnboardingArtist extends BaseModel {
  @ApiProperty({ description: 'Onboarding artist row id', example: 1 })
  @column({ isPrimary: true })
  declare id: number

  @ApiProperty({
    description: 'User ID who selected the artist (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @column()
  declare userId: string

  @ApiProperty({ description: 'Deezer artist ID', example: '27' })
  @column()
  declare deezerArtistId: string

  @ApiProperty({ description: 'Artist display name', example: 'Daft Punk' })
  @column()
  declare artistName: string

  @ApiProperty({ description: 'Selection rank starting at 1', example: 1 })
  @column()
  declare rank: number

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @ApiProperty({ description: 'Creation timestamp' })
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
