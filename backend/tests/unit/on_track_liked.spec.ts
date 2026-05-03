import { test } from '@japa/runner'
import OnTrackLiked from '#listeners/on_track_liked'
import TrackLiked from '#events/track_liked'
import Achievement from '#models/achievement'
import UserAchievement from '#models/user_achievement'
import { AchievementType } from '#enums/achievement_type'
import { createAuthenticatedUser } from '#tests/utils/auth_helpers'
import { deleteAchievementProgress } from '#tests/utils/achievement_progress_helpers'

test.group('OnTrackLiked listener', (group) => {
  deleteAchievementProgress(group)

  test('first like unlocks FirstLike and increments TotalLikes', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('otl_first')
    await Achievement.createMany([
      { type: AchievementType.FirstLike, name: 'Premier pas', description: 'd' },
      { type: AchievementType.TotalLikes, name: 'Mélomane', description: 'd' },
    ])

    const listener = new OnTrackLiked()
    await listener.handle(
      new TrackLiked({ userId: user.id, deezerTrackId: '42', deezerArtistId: '7' })
    )

    const firstLike = await UserAchievement.query()
      .where('user_id', user.id)
      .whereHas('achievement', (q) => q.where('type', AchievementType.FirstLike))
      .first()
    const totalLikes = await UserAchievement.query()
      .where('user_id', user.id)
      .whereHas('achievement', (q) => q.where('type', AchievementType.TotalLikes))
      .first()

    assert.isNotNull(firstLike?.unlockedAt ?? null)
    assert.equal(totalLikes?.currentProgress, 1)
    assert.isNull(totalLikes?.unlockedAt ?? null)
  })

  test('subsequent likes only increment TotalLikes (FirstLike stays unlocked)', async ({
    assert,
  }) => {
    const { user } = await createAuthenticatedUser('otl_repeat')
    await Achievement.createMany([
      { type: AchievementType.FirstLike, name: 'Premier pas', description: 'd' },
      { type: AchievementType.TotalLikes, name: 'Mélomane', description: 'd' },
    ])

    const listener = new OnTrackLiked()
    await listener.handle(
      new TrackLiked({ userId: user.id, deezerTrackId: '1', deezerArtistId: null })
    )
    await listener.handle(
      new TrackLiked({ userId: user.id, deezerTrackId: '2', deezerArtistId: null })
    )

    const totalLikes = await UserAchievement.query()
      .where('user_id', user.id)
      .whereHas('achievement', (q) => q.where('type', AchievementType.TotalLikes))
      .first()

    assert.equal(totalLikes?.currentProgress, 2)
  })
})
