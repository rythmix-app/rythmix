import { BaseSchema } from '@adonisjs/lucid/schema'
import { OAUTH_PROVIDERS } from '#enums/oauth_provider'

export default class extends BaseSchema {
  protected tableName = 'oauth_link_confirmation_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 36).primary().notNullable()
      table
        .string('user_id', 36)
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.enum('provider', OAUTH_PROVIDERS).notNullable()
      table.string('provider_user_id').notNullable()
      table.text('provider_payload').nullable()

      table.string('selector', 64).notNullable().unique()
      table.string('token_hash', 255).notNullable()
      table.timestamp('expires_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['user_id', 'provider'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
