import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'curated_playlists'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('name_overridden').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('name_overridden')
    })
  }
}
