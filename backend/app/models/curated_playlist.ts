import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { ApiProperty } from '@foadonis/openapi/decorators'

export default class CuratedPlaylist extends BaseModel {
  @ApiProperty({ description: 'Curated playlist unique identifier', example: 1 })
  @column({ isPrimary: true })
  declare id: number

  @ApiProperty({ description: 'Deezer playlist ID', example: 908622995 })
  @column()
  declare deezerPlaylistId: number

  @ApiProperty({ description: 'Display name shown in the app', example: 'Rap FR Essentials' })
  @column()
  declare name: string

  @ApiProperty({ description: 'Genre label associated with the playlist', example: 'Rap FR' })
  @column()
  declare genreLabel: string

  @ApiProperty({ description: 'Cover image URL', example: 'https://e-cdns-images.dzcdn.net/...' })
  @column()
  declare coverUrl: string | null

  @ApiProperty({ description: 'Total number of tracks in the Deezer playlist', example: 1731 })
  @column()
  declare trackCount: number

  @ApiProperty({ description: 'Creation timestamp' })
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @ApiProperty({ description: 'Last update timestamp' })
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
