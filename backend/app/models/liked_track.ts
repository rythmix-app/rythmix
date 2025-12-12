import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import User from '#models/user'
import { ApiProperty } from '@foadonis/openapi/decorators'

export default class LikedTrack extends BaseModel {
  @ApiProperty({ description: 'Liked track unique identifier', example: 1 })
  @column({ isPrimary: true })
  declare id: number

  @ApiProperty({
    description: 'User ID who liked the track (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @column()
  declare userId: string

  @ApiProperty({ description: 'Spotify track ID', example: '3n3Ppam7vgaVa1iaRUc9Lp' })
  @column()
  declare spotifyId: string

  @ApiProperty({ description: 'Track title', example: 'Blinding Lights', nullable: true })
  @column()
  declare title: string | null

  @ApiProperty({ description: 'Track artist', example: 'The Weeknd', nullable: true })
  @column()
  declare artist: string | null

  @ApiProperty({ description: 'Track type', example: 'track', nullable: true })
  @column()
  declare type: string | null

  @belongsTo(() => User)
  declare user: any

  @ApiProperty({ description: 'Creation timestamp' })
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @ApiProperty({ description: 'Last update timestamp' })
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
