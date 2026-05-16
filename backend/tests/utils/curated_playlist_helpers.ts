import CuratedPlaylist from '#models/curated_playlist'
import { Group } from '@japa/runner/core'
import { DateTime } from 'luxon'

export function deleteCuratedPlaylists(group: Group) {
  let testStartTime: DateTime

  group.setup(() => {
    testStartTime = DateTime.now()
  })

  group.teardown(async () => {
    await CuratedPlaylist.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
  })
}
