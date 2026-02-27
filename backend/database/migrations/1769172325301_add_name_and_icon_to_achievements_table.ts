import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'achievements'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('name').notNullable().defaultTo('')
      table.string('icon').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('name')
      table.dropColumn('icon')
    })
  }
}
