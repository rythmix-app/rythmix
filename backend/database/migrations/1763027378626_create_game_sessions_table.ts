import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'game_sessions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 36).primary()

      // foreign key to games(id)
      table
        .integer('game_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('games')
        .onDelete('CASCADE')

      table.string('status').notNullable()
      table.json('players').notNullable()
      table.json('game_data').notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
