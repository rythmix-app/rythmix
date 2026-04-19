import Achievement from '#models/achievement'
import User from '#models/user'
import { Group } from '@japa/runner/core'
import { DateTime } from 'luxon'

export function deleteAchievement(group: Group) {
  let testStartTime: DateTime

  group.setup(() => {
    testStartTime = DateTime.now()
  })

  group.each.teardown(async () => {
    await Achievement.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
  })

  group.teardown(async () => {
    await User.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
  })
}
