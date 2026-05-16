import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_onboarding_artists'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .string('user_id', 36)
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.string('deezer_artist_id').notNullable()
      table.string('artist_name').notNullable()
      table.integer('rank').notNullable()

      table.timestamp('created_at')

      table.unique(['user_id', 'deezer_artist_id'])
      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
