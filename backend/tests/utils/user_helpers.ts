import User from '#models/user'
import { Group } from '@japa/runner/core'
import { DateTime } from 'luxon'

export function deleteUser(group: Group) {
  let testStartTime: DateTime

  group.setup(() => {
    testStartTime = DateTime.now()
  })

  group.each.teardown(async () => {
    // No child entities to clean in each test
  })

  group.teardown(async () => {
    await User.query().where('created_at', '>=', testStartTime.toSQL()).delete()
  })
}
