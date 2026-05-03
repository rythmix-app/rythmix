import UserOnboardingArtist from '#models/user_onboarding_artist'
import User from '#models/user'
import { Group } from '@japa/runner/core'
import { DateTime } from 'luxon'

export function deleteOnboardingArtists(group: Group) {
  let testStartTime: DateTime

  group.setup(() => {
    testStartTime = DateTime.now()
  })

  group.each.teardown(async () => {
    await UserOnboardingArtist.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
  })

  group.teardown(async () => {
    await UserOnboardingArtist.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
    await User.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
  })
}
