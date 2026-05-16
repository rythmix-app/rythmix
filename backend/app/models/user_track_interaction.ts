import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { ApiProperty } from '@foadonis/openapi/decorators'
import { InteractionAction } from '#enums/interaction_action'

export default class UserTrackInteraction extends BaseModel {
  @ApiProperty({ description: 'Interaction unique identifier', example: 1 })
  @column({ isPrimary: true })
  declare id: number

  @ApiProperty({
    description: 'User ID who interacted with the track (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @column()
  declare userId: string

  @ApiProperty({ description: 'Deezer track ID', example: '3135556' })
  @column()
  declare deezerTrackId: string

  @ApiProperty({ description: 'Deezer artist ID', example: '27', nullable: true })
  @column()
  declare deezerArtistId: string | null

  @ApiProperty({
    description: 'Interaction action',
    enum: InteractionAction,
    example: InteractionAction.Liked,
  })
  @column()
  declare action: InteractionAction

  @ApiProperty({ description: 'Track title', example: 'Blinding Lights', nullable: true })
  @column()
  declare title: string | null

  @ApiProperty({ description: 'Track artist', example: 'The Weeknd', nullable: true })
  @column()
  declare artist: string | null

  @ApiProperty({ description: 'ISRC code', example: 'USUG11904206', nullable: true })
  @column()
  declare isrc: string | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @ApiProperty({ description: 'Creation timestamp' })
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @ApiProperty({ description: 'Last update timestamp' })
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
