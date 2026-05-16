import { test } from '@japa/runner'
import { AchievementProgressService } from '#services/achievement_progress_service'
import Achievement from '#models/achievement'
import UserAchievement from '#models/user_achievement'
import { AchievementType } from '#enums/achievement_type'
import { DateTime } from 'luxon'
import { createAuthenticatedUser } from '#tests/utils/auth_helpers'
import { deleteAchievementProgress } from '#tests/utils/achievement_progress_helpers'

test.group('AchievementProgressService', (group) => {
  let service: AchievementProgressService

  deleteAchievementProgress(group)

  group.each.setup(() => {
    service = new AchievementProgressService()
  })

  test('ensureAndIncrement creates a new UserAchievement when none exists', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('aps_create')
    await Achievement.create({
      type: AchievementType.FirstGame,
      name: 'First Game',
      description: 'd',
    })

    const result = await service.ensureAndIncrement(user.id, AchievementType.FirstGame, 1)

    assert.instanceOf(result, UserAchievement)
    if (result instanceof UserAchievement) {
      assert.equal(result.userId, user.id)
      assert.equal(result.currentProgress, 1)
      assert.equal(result.requiredProgress, 1)
      assert.isNotNull(result.unlockedAt)
    }
  })

  test('ensureAndIncrement increments existing in-progress UserAchievement', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('aps_inc')
    const achievement = await Achievement.create({
      type: AchievementType.GamesPlayed,
      name: 'Vétéran',
      description: 'd',
    })
    await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 5,
      requiredProgress: 50,
      currentTier: 1,
      progressData: {},
    })

    const result = await service.ensureAndIncrement(user.id, AchievementType.GamesPlayed, 3)

    assert.instanceOf(result, UserAchievement)
    if (result instanceof UserAchievement) {
      assert.equal(result.currentProgress, 8)
      assert.isNull(result.unlockedAt)
    }
  })

  test('ensureAndIncrement skips already unlocked achievements', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('aps_done')
    const achievement = await Achievement.create({
      type: AchievementType.FirstLike,
      name: 'Premier pas',
      description: 'd',
    })
    await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 1,
      requiredProgress: 1,
      currentTier: 1,
      progressData: {},
      unlockedAt: DateTime.now(),
    })

    const result = await service.ensureAndIncrement(user.id, AchievementType.FirstLike, 5)

    assert.instanceOf(result, UserAchievement)
    if (result instanceof UserAchievement) {
      assert.equal(result.currentProgress, 1)
    }
  })

  test('ensureAndIncrement returns null when achievement type is unknown to mapping', async ({
    assert,
  }) => {
    const { user } = await createAuthenticatedUser('aps_unknown')

    const result = await service.ensureAndIncrement(user.id, AchievementType.BlindTestCorrect, 1)

    assert.isNull(result)
  })

  test('ensureAndIncrement returns null when amount is zero or negative', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('aps_amount')

    const zeroResult = await service.ensureAndIncrement(user.id, AchievementType.FirstGame, 0)
    const negativeResult = await service.ensureAndIncrement(user.id, AchievementType.FirstGame, -1)

    assert.isNull(zeroResult)
    assert.isNull(negativeResult)
  })

  test('ensureAndIncrement returns null when Achievement record is missing', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('aps_no_ach')

    const result = await service.ensureAndIncrement(user.id, AchievementType.FirstGame, 1)

    assert.isNull(result)
  })

  test('getRequiredProgress returns the configured threshold for known types', ({ assert }) => {
    assert.equal(service.getRequiredProgress(AchievementType.FirstGame), 1)
    assert.equal(service.getRequiredProgress(AchievementType.GamesPlayed), 50)
    assert.equal(service.getRequiredProgress(AchievementType.TotalGamesPlayed), 500)
    assert.isUndefined(service.getRequiredProgress(AchievementType.BlindTestCorrect))
  })
})
