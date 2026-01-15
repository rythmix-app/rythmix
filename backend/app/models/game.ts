import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { ApiProperty } from '@foadonis/openapi/decorators'

export default class Game extends BaseModel {
  @ApiProperty({ description: 'Game unique identifier', example: 1 })
  @column({ isPrimary: true })
  declare id: number

  @ApiProperty({ description: 'Game name', example: 'Blind Test Musical' })
  @column()
  declare name: string

  @ApiProperty({
    description: 'Game description',
    example: 'Devinez les morceaux de musique le plus rapidement possible',
  })
  @column()
  declare description: string

  @ApiProperty({
    description: 'Indicates if the game supports multiplayer mode',
    example: false,
  })
  @column()
  declare isMultiplayer: boolean

  @ApiProperty({
    description: 'Indicate is the game is enabled on the mobile app',
    example: true,
  })
  @column()
  declare isEnabled: boolean

  @ApiProperty({ description: 'Game creation timestamp' })
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @ApiProperty({ description: 'Last update timestamp' })
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
