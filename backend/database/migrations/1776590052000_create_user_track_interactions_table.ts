import { BaseSchema } from '@adonisjs/lucid/schema'
import { INTERACTION_ACTIONS, InteractionAction } from '#enums/interaction_action'

export default class extends BaseSchema {
  protected tableName = 'user_track_interactions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .string('user_id', 36)
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.string('deezer_track_id').notNullable()
      table.string('deezer_artist_id').nullable()
      table.enum('action', INTERACTION_ACTIONS).notNullable()

      table.string('title').nullable()
      table.string('artist').nullable()
      table.string('isrc').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['user_id', 'deezer_track_id'])
    })

    this.defer(async (db) => {
      const hasLikedTracks = await db.rawQuery(`SELECT to_regclass('public.liked_tracks') AS table`)
      const likedTracksExists = hasLikedTracks.rows?.[0]?.table !== null

      if (!likedTracksExists) return

      await db.rawQuery(
        `
          INSERT INTO user_track_interactions (user_id, deezer_track_id, action, title, artist, created_at, updated_at)
          SELECT user_id, deezer_track_id, ?, title, artist, created_at, updated_at
          FROM liked_tracks
          ON CONFLICT (user_id, deezer_track_id) DO NOTHING
        `,
        [InteractionAction.Liked]
      )

      await db.schema.dropTableIfExists('liked_tracks')
    })
  }

  async down() {
    this.schema.createTable('liked_tracks', (table) => {
      table.increments('id')

      table
        .string('user_id', 36)
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.string('deezer_track_id').notNullable()
      table.string('title').nullable()
      table.string('artist').nullable()
      table.string('type').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })

    this.defer(async (db) => {
      await db.rawQuery(
        `
          INSERT INTO liked_tracks (user_id, deezer_track_id, title, artist, type, created_at, updated_at)
          SELECT user_id, deezer_track_id, title, artist, 'track', created_at, updated_at
          FROM user_track_interactions
          WHERE action = ?
        `,
        [InteractionAction.Liked]
      )

      await db.schema.dropTable(this.tableName)
    })
  }
}
