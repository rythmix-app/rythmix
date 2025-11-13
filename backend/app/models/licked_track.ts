import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import User from '#models/user'

export default class LickedTrack extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  // foreign key referencing User.id (uuid string)
  @column()
  declare userId: string

  @column()
  declare spotifyId: string

  @column()
  declare title: string | null

  @column()
  declare artist: string | null

  @column()
  declare type: string | null

  @belongsTo(() => User)
  declare user: any

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
