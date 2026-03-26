import { BaseSchema } from '@adonisjs/lucid/schema'

export default class RenameSpotifyIdToDeezerTrackIdOnLikedTracks extends BaseSchema {
  protected tableName = 'liked_tracks'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('spotify_id', 'deezer_track_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('deezer_track_id', 'spotify_id')
    })
  }
}
