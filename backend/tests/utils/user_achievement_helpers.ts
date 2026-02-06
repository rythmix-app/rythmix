import UserAchievement from '#models/user_achievement'
import Achievement from '#models/achievement'
import User from '#models/user'
import { Group } from '@japa/runner/core'

export function deleteUserAchievement(group: Group) {
  group.each.teardown(async () => {
    await UserAchievement.query().delete()
  })

  group.teardown(async () => {
    await Achievement.query().delete()
    await User.query().delete()
  })
}
