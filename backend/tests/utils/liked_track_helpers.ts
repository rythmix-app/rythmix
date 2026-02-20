import LikedTrack from '#models/liked_track'
import User from '#models/user'
import { Group } from '@japa/runner/core'
import { DateTime } from 'luxon'

export function deleteLikedTrack(group: Group) {
  let testStartTime: DateTime

  group.setup(() => {
    testStartTime = DateTime.now()
  })

  group.each.teardown(async () => {
    await LikedTrack.query().where('created_at', '>=', testStartTime.toSQL()).delete()
  })

  group.teardown(async () => {
    await User.query().where('created_at', '>=', testStartTime.toSQL()).delete()
  })
}
