import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { randomUUID } from 'node:crypto'
import { hasMany } from '@adonisjs/lucid/orm'
import LikedTrack from './licked_track.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  static accessTokens = DbAccessTokensProvider.forModel(User)
  @column({ isPrimary: true })
  declare id: string
  @column()
  declare firstName: string | null
  @column()
  declare lastName: string | null
  @column()
  declare username: string
  @column()
  declare email: string
  @column({ serializeAs: null })
  declare password: string
  @column()
  declare role: 'user' | 'admin'
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => LikedTrack)
  declare likedTracks: HasMany<typeof LikedTrack>
  /*
   *   declaration of the relation with the user in LikedTrack model
   *   @belongsTo(() => User)
   *   declare user: BelongsTo<typeof User>
   */
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
