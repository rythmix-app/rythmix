import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { randomUUID } from 'node:crypto'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
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

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  /*
   * future column in relation with the user when the other model will be created
   *   @hasMany(() => Achievement)
   *   declare achievements: HasMany<typeof Achievement>
   *
   *   declaration of the relation with the user in Achievement model
   *   @belongsTo(() => User)
   *   declare user: BelongsTo<typeof User>
   */

  /*
   * future column in relation with the user when the other model will be created
   *   @hasMany(() => LikedTrack)
   *   declare likedTracks: HasMany<typeof LikedTrack>
   *
   *   declaration of the relation with the user in LikedTrack model
   *   @belongsTo(() => User)
   *   declare user: BelongsTo<typeof User>
   */

  static accessTokens = DbAccessTokensProvider.forModel(User)

  get fullName() {
    const parts = [this.firstName, this.lastName].filter((part) => part && part !== null)
    return parts.length > 0 ? parts.join(' ') : ''
  }

  @beforeCreate()
  static assignUuid(user: User) {
    user.id = randomUUID()
  }
}
