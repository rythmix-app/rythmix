import UserTrackInteraction from '#models/user_track_interaction'
import User from '#models/user'
import { Group } from '@japa/runner/core'
import { DateTime } from 'luxon'

export function deleteTrackInteractions(group: Group) {
  let testStartTime: DateTime

  group.setup(() => {
    testStartTime = DateTime.now()
  })

  group.each.teardown(async () => {
    await UserTrackInteraction.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
  })

  group.teardown(async () => {
    await UserTrackInteraction.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
    await User.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
  })
}
