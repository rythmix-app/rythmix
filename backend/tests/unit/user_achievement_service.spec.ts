import { test } from '@japa/runner'
import { UserAchievementService } from '#services/user_achievement_service'
import UserAchievement from '#models/user_achievement'
import Achievement from '#models/achievement'
import { AchievementType } from '#enums/achievement_type'
import User from '#models/user'
import { DateTime } from 'luxon'
import { deleteUserAchievement } from '#tests/utils/user_achievement_helpers'
import { createAuthenticatedUser } from '#tests/utils/auth_helpers'

test.group('UserAchievementService', (group) => {
  let service: UserAchievementService
  let user: User
  let achievement: Achievement

  group.each.setup(async () => {
    service = new UserAchievementService()

    await createAuthenticatedUser('testUser', 'user').then((response) => {
      user = response.user
    })

    achievement = await Achievement.create({
      type: 'test_achievement' as AchievementType,
      description: 'Test description',
    })
  })

  deleteUserAchievement(group)

  test('getUserAchievements returns user achievements with achievement preloaded', async ({
    assert,
  }) => {
    await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 50,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
    })

    const result = await service.getUserAchievements(user.id)

    assert.lengthOf(result, 1)
    assert.equal(result[0].userId, user.id)
    assert.equal(result[0].achievementId, achievement.id)
    assert.exists(result[0].achievement)
    assert.equal(result[0].achievement.type, 'test_achievement')
  })

  test('getAll returns all user achievements with user and achievement preloaded', async ({
    assert,
  }) => {
    await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 50,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
    })

    const result = await service.getAll()

    assert.lengthOf(result, 1)
    assert.exists(result[0].user)
    assert.exists(result[0].achievement)
    assert.isNotNull(result[0].user.username)
    assert.equal(result[0].achievement.type, 'test_achievement')
  })

  test('startTracking creates user achievement with default values', async ({ assert }) => {
    const result = await service.startTracking(user.id, achievement.id)

    assert.instanceOf(result, UserAchievement)
    if (result instanceof UserAchievement) {
      assert.equal(result.userId, user.id)
      assert.equal(result.achievementId, achievement.id)
      assert.equal(result.currentProgress, 0)
      assert.equal(result.currentTier, 1)
      assert.equal(result.requiredProgress, 100)
      assert.deepEqual(result.progressData, {})
      assert.isNull(result.unlockedAt)
      assert.exists(result.achievement)
    }
  })

  test('startTracking creates user achievement with custom requiredProgress', async ({
    assert,
  }) => {
    const result = await service.startTracking(user.id, achievement.id, 200)

    assert.instanceOf(result, UserAchievement)
    if (result instanceof UserAchievement) {
      assert.equal(result.requiredProgress, 200)
    }
  })

  test('startTracking returns 404 if achievement does not exist', async ({ assert }) => {
    const result = await service.startTracking(user.id, 99999)

    assert.notInstanceOf(result, UserAchievement)
    if (!(result instanceof UserAchievement)) {
      assert.equal(result.error, 'Achievement not found')
      assert.equal(result.status, 404)
    }
  })

  test('startTracking returns 409 on duplicate tracking', async ({ assert }) => {
    await service.startTracking(user.id, achievement.id)
    const result = await service.startTracking(user.id, achievement.id)

    assert.notInstanceOf(result, UserAchievement)
    if (!(result instanceof UserAchievement)) {
      assert.equal(result.error, 'Already tracking this achievement')
      assert.equal(result.status, 409)
    }
  })

  test('incrementProgress updates progress correctly', async ({ assert }) => {
    const userAchievement = await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 50,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
    })

    const result = await service.incrementProgress(userAchievement.id, user.id, 25)

    assert.instanceOf(result, UserAchievement)
    if (result instanceof UserAchievement) {
      assert.equal(result.currentProgress, 75)
      assert.exists(result.achievement)
    }
  })

  test('incrementProgress returns 400 if amount is not positive', async ({ assert }) => {
    const userAchievement = await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 50,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
    })

    const result = await service.incrementProgress(userAchievement.id, user.id, -10)

    assert.notInstanceOf(result, UserAchievement)
    if (!(result instanceof UserAchievement)) {
      assert.equal(result.error, 'Amount must be positive')
      assert.equal(result.status, 400)
    }
  })

  test('incrementProgress returns 404 if user achievement not found', async ({ assert }) => {
    const result = await service.incrementProgress('non-existent-id', user.id, 10)

    assert.notInstanceOf(result, UserAchievement)
    if (!(result instanceof UserAchievement)) {
      assert.equal(result.error, 'User achievement not found')
      assert.equal(result.status, 404)
    }
  })

  test('incrementProgress respects ownership - returns 404 if wrong user', async ({ assert }) => {
    const anotherUser = await createAuthenticatedUser('anotheruser', 'user')

    const userAchievement = await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 50,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
    })

    const result = await service.incrementProgress(userAchievement.id, anotherUser.user.id, 10)

    assert.notInstanceOf(result, UserAchievement)
    if (!(result instanceof UserAchievement)) {
      assert.equal(result.error, 'User achievement not found')
      assert.equal(result.status, 404)
    }
  })

  test('incrementProgress returns 400 if achievement already unlocked', async ({ assert }) => {
    const userAchievement = await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 100,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
      unlockedAt: DateTime.now(),
    })

    const result = await service.incrementProgress(userAchievement.id, user.id, 10)

    assert.notInstanceOf(result, UserAchievement)
    if (!(result instanceof UserAchievement)) {
      assert.equal(result.error, 'Achievement already unlocked')
      assert.equal(result.status, 400)
    }
  })

  test('incrementProgress auto-unlocks when progress reaches required', async ({ assert }) => {
    const userAchievement = await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 90,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
    })

    const result = await service.incrementProgress(userAchievement.id, user.id, 15)

    assert.instanceOf(result, UserAchievement)
    if (result instanceof UserAchievement) {
      assert.equal(result.currentProgress, 105)
      assert.isNotNull(result.unlockedAt)
    }
  })

  test('removeTracking deletes user achievement successfully', async ({ assert }) => {
    const userAchievement = await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 50,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
    })

    const result = await service.removeTracking(userAchievement.id, user.id)

    assert.notProperty(result, 'error')
    if (!('error' in result)) {
      assert.equal(result.message, 'Achievement tracking removed successfully')
    }

    const deleted = await UserAchievement.find(userAchievement.id)
    assert.isNull(deleted)
  })

  test('removeTracking returns 404 if user achievement not found', async ({ assert }) => {
    const result = await service.removeTracking('non-existent-id', user.id)

    assert.property(result, 'error')
    if ('error' in result) {
      assert.equal(result.error, 'User achievement not found')
      assert.equal(result.status, 404)
    }
  })

  test('removeTracking respects ownership - returns 404 if wrong user', async ({ assert }) => {
    const anotherUser = await createAuthenticatedUser('anotheruser', 'user')

    const userAchievement = await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 50,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
    })

    const result = await service.removeTracking(userAchievement.id, anotherUser.user.id)

    assert.property(result, 'error')
    if ('error' in result) {
      assert.equal(result.error, 'User achievement not found')
      assert.equal(result.status, 404)
    }
  })

  test('getUserStats calculates statistics correctly', async ({ assert }) => {
    await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 100,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
      unlockedAt: DateTime.now(),
    })

    const achievement2 = await Achievement.create({
      type: 'test_achievement_2' as AchievementType,
      description: 'Test description 2',
    })

    await UserAchievement.create({
      userId: user.id,
      achievementId: achievement2.id,
      currentProgress: 50,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
    })

    const stats = await service.getUserStats(user.id)

    assert.equal(stats.total, 2)
    assert.equal(stats.unlocked, 1)
    assert.equal(stats.inProgress, 1)
    assert.equal(stats.completionPercentage, 50)
  })

  test('getUserStats returns zero percentage when no achievements', async ({ assert }) => {
    const stats = await service.getUserStats(user.id)

    assert.equal(stats.total, 0)
    assert.equal(stats.unlocked, 0)
    assert.equal(stats.inProgress, 0)
    assert.equal(stats.completionPercentage, 0)
  })

  test('resetProgress resets achievement to initial state', async ({ assert }) => {
    const userAchievement = await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 100,
      requiredProgress: 100,
      currentTier: 3,
      progressData: {},
      unlockedAt: DateTime.now(),
    })

    const result = await service.resetProgress(userAchievement.id)

    assert.instanceOf(result, UserAchievement)
    if (result instanceof UserAchievement) {
      assert.equal(result.currentProgress, 0)
      assert.isNull(result.unlockedAt)
      assert.equal(result.currentTier, 1)
      assert.exists(result.achievement)
    }
  })

  test('resetProgress returns 404 if user achievement not found', async ({ assert }) => {
    const result = await service.resetProgress('non-existent-id')

    assert.notInstanceOf(result, UserAchievement)
    if (!(result instanceof UserAchievement)) {
      assert.equal(result.error, 'User achievement not found')
      assert.equal(result.status, 404)
    }
  })
})
