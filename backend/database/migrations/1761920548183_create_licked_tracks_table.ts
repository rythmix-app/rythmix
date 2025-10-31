import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'licked_tracks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // foreign key to users(id) (uuid string)
      table
        .string('user_id', 36)
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.string('spotify_id').notNullable()
      table.string('title').nullable()
      table.string('artist').nullable()
      table.string('type').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
