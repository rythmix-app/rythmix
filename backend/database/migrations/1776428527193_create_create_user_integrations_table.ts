import { BaseSchema } from '@adonisjs/lucid/schema'
import { INTEGRATION_PROVIDERS } from '#enums/integration_provider'

export default class extends BaseSchema {
  protected tableName = 'user_integrations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .string('user_id', 36)
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.enum('provider', INTEGRATION_PROVIDERS).notNullable()
      table.string('provider_user_id').notNullable()

      table.text('access_token').notNullable()
      table.text('refresh_token').nullable()

      table.timestamp('expires_at').nullable()
      table.text('scopes').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['user_id', 'provider'])
      table.index(['provider', 'provider_user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
