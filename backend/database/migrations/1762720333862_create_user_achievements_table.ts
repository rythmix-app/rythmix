import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_achievements'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 36).primary().notNullable()

      table
        .string('user_id', 36)
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('achievement_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('achievements')
        .onDelete('CASCADE')

      table.integer('current_progress').notNullable().defaultTo(0)
      table.integer('required_progress').notNullable()
      table.integer('current_tier').notNullable().defaultTo(1)
      table.json('progress_data').notNullable().defaultTo('{}')

      table.timestamp('unlocked_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['user_id', 'achievement_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
