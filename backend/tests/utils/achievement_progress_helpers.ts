import UserAchievement from '#models/user_achievement'
import Achievement from '#models/achievement'
import User from '#models/user'
import { Group } from '@japa/runner/core'
import { DateTime } from 'luxon'

export function deleteAchievementProgress(group: Group) {
  let testStartTime: DateTime

  group.setup(() => {
    testStartTime = DateTime.now()
  })

  group.each.teardown(async () => {
    await UserAchievement.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
    await Achievement.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
  })

  group.teardown(async () => {
    await User.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
  })
}
