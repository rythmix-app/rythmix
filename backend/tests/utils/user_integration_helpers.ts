import UserIntegration from '#models/user_integration'
import User from '#models/user'
import { Group } from '@japa/runner/core'
import { DateTime } from 'luxon'

export function deleteUserIntegrations(group: Group) {
  let testStartTime: DateTime

  group.setup(() => {
    testStartTime = DateTime.now()
  })

  group.each.teardown(async () => {
    await UserIntegration.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
  })

  group.teardown(async () => {
    await UserIntegration.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
    await User.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
  })
}
