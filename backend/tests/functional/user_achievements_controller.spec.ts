import { test } from '@japa/runner'
import User from '#models/user'
import Achievement from '#models/achievement'
import { AchievementType } from '#enums/achievement_type'
import { DateTime } from 'luxon'
import { createAuthenticatedUser } from '../utils/auth_helpers.js'
import { deleteUserAchievement } from '#tests/utils/user_achievement_helpers'
import UserAchievement from '#models/user_achievement'

test.group('UserAchievementsController', (group) => {
  let user: User
  let achievement: Achievement
  let userToken: string
  let adminToken: string

  group.each.setup(async () => {
    const userAuth = await createAuthenticatedUser('testuser', 'user')
    user = userAuth.user
    userToken = userAuth.token

    const adminAuth = await createAuthenticatedUser('admin', 'admin')
    adminToken = adminAuth.token

    achievement = await Achievement.create({
      type: 'test_achievement' as AchievementType,
      description: 'Test description',
    })
  })

  deleteUserAchievement(group)

  test('GET /api/user-achievements/me returns 401 without auth', async ({ assert, client }) => {
    const response = await client.get('/api/user-achievements/me')

    assert.equal(response.status(), 401)
  })

  test('GET /api/user-achievements/me returns user achievements', async ({ assert, client }) => {
    await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 50,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
    })

    const response = await client.get('/api/user-achievements/me').bearerToken(userToken)

    assert.equal(response.status(), 200)
    assert.property(response.body(), 'userAchievements')
    assert.lengthOf(response.body().userAchievements, 1)
    assert.equal(response.body().userAchievements[0].achievementId, achievement.id)
  })

  test('GET /api/user-achievements returns 403 for non-admin', async ({ assert, client }) => {
    const response = await client.get('/api/user-achievements').bearerToken(userToken)

    assert.equal(response.status(), 403)
  })

  test('GET /api/user-achievements returns all user achievements for admin', async ({
    assert,
    client,
  }) => {
    await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 50,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
    })

    const response = await client.get('/api/user-achievements').bearerToken(adminToken)

    assert.equal(response.status(), 200)
    assert.property(response.body(), 'userAchievements')
    assert.lengthOf(response.body().userAchievements, 1)
  })

  test('POST /api/user-achievements requires auth', async ({ assert, client }) => {
    const response = await client.post('/api/user-achievements').json({
      achievementId: achievement.id,
    })

    assert.equal(response.status(), 401)
  })

  test('POST /api/user-achievements requires achievementId', async ({ assert, client }) => {
    const response = await client.post('/api/user-achievements').bearerToken(userToken).json({})

    assert.equal(response.status(), 400)
    assert.property(response.body(), 'message')
    assert.equal(response.body().message, 'achievementId is required')
  })

  test('POST /api/user-achievements creates user achievement', async ({ assert, client }) => {
    const response = await client.post('/api/user-achievements').bearerToken(userToken).json({
      achievementId: achievement.id,
      requiredProgress: 200,
    })

    assert.equal(response.status(), 201)
    assert.property(response.body(), 'userAchievement')
    assert.equal(response.body().userAchievement.achievementId, achievement.id)
    assert.equal(response.body().userAchievement.currentProgress, 0)
    assert.equal(response.body().userAchievement.requiredProgress, 200)
  })

  test('POST /api/user-achievements returns 404 for non-existent achievement', async ({
    assert,
    client,
  }) => {
    const response = await client.post('/api/user-achievements').bearerToken(userToken).json({
      achievementId: 99999,
    })

    assert.equal(response.status(), 404)
    assert.property(response.body(), 'message')
    assert.equal(response.body().message, 'Achievement not found')
  })

  test('POST /api/user-achievements returns 409 for duplicate tracking', async ({
    assert,
    client,
  }) => {
    await client.post('/api/user-achievements').bearerToken(userToken).json({
      achievementId: achievement.id,
    })

    const response = await client.post('/api/user-achievements').bearerToken(userToken).json({
      achievementId: achievement.id,
    })

    assert.equal(response.status(), 409)
    assert.property(response.body(), 'message')
    assert.equal(response.body().message, 'Already tracking this achievement')
  })

  test('PATCH /api/user-achievements/:id/progress requires auth', async ({ assert, client }) => {
    const userAchievement = await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 50,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
    })

    const response = await client
      .patch(`/api/user-achievements/${userAchievement.id}/progress`)
      .json({ amount: 10 })

    assert.equal(response.status(), 401)
  })

  test('PATCH /api/user-achievements/:id/progress requires positive amount', async ({
    assert,
    client,
  }) => {
    const userAchievement = await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 50,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
    })

    const response = await client
      .patch(`/api/user-achievements/${userAchievement.id}/progress`)
      .bearerToken(userToken)
      .json({ amount: -10 })

    assert.equal(response.status(), 400)
    assert.property(response.body(), 'message')
    assert.equal(response.body().message, 'Amount must be positive')
  })

  test('PATCH /api/user-achievements/:id/progress updates progress', async ({ assert, client }) => {
    const userAchievement = await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 50,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
    })

    const response = await client
      .patch(`/api/user-achievements/${userAchievement.id}/progress`)
      .bearerToken(userToken)
      .json({ amount: 25 })

    assert.equal(response.status(), 200)
    assert.property(response.body(), 'userAchievement')
    assert.equal(response.body().userAchievement.currentProgress, 75)
  })

  test('PATCH /api/user-achievements/:id/progress returns 404 for other user achievement', async ({
    assert,
    client,
  }) => {
    const { user: otherUser } = await createAuthenticatedUser('otheruser', 'user')

    const userAchievement = await UserAchievement.create({
      userId: otherUser.id,
      achievementId: achievement.id,
      currentProgress: 50,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
    })

    const response = await client
      .patch(`/api/user-achievements/${userAchievement.id}/progress`)
      .bearerToken(userToken)
      .json({ amount: 10 })

    assert.equal(response.status(), 404)
  })

  test('PATCH /api/user-achievements/:id/progress returns 400 if already unlocked', async ({
    assert,
    client,
  }) => {
    const userAchievement = await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 100,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
      unlockedAt: DateTime.now(),
    })

    const response = await client
      .patch(`/api/user-achievements/${userAchievement.id}/progress`)
      .bearerToken(userToken)
      .json({ amount: 10 })

    assert.equal(response.status(), 400)
    assert.property(response.body(), 'message')
    assert.equal(response.body().message, 'Achievement already unlocked')
  })

  test('DELETE /api/user-achievements/:id requires auth', async ({ assert, client }) => {
    const userAchievement = await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 50,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
    })

    const response = await client.delete(`/api/user-achievements/${userAchievement.id}`)

    assert.equal(response.status(), 401)
  })

  test('DELETE /api/user-achievements/:id removes tracking', async ({ assert, client }) => {
    const userAchievement = await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 50,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
    })

    const response = await client
      .delete(`/api/user-achievements/${userAchievement.id}`)
      .bearerToken(userToken)

    assert.equal(response.status(), 200)
    assert.property(response.body(), 'message')
    assert.equal(response.body().message, 'Achievement tracking removed successfully')

    const deleted = await UserAchievement.find(userAchievement.id)
    assert.isNull(deleted)
  })

  test('DELETE /api/user-achievements/:id returns 404 for other user achievement', async ({
    assert,
    client,
  }) => {
    const { user: otherUser } = await createAuthenticatedUser('otheruser', 'user')

    const userAchievement = await UserAchievement.create({
      userId: otherUser.id,
      achievementId: achievement.id,
      currentProgress: 50,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
    })

    const response = await client
      .delete(`/api/user-achievements/${userAchievement.id}`)
      .bearerToken(userToken)

    assert.equal(response.status(), 404)
  })

  test('GET /api/user-achievements/stats requires auth', async ({ assert, client }) => {
    const response = await client.get('/api/user-achievements/stats')

    assert.equal(response.status(), 401)
  })

  test('GET /api/user-achievements/stats returns statistics', async ({ assert, client }) => {
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

    const response = await client.get('/api/user-achievements/stats').bearerToken(userToken)

    assert.equal(response.status(), 200)
    assert.equal(response.body().total, 2)
    assert.equal(response.body().unlocked, 1)
    assert.equal(response.body().inProgress, 1)
    assert.equal(response.body().completionPercentage, 50)
  })

  test('PATCH /api/user-achievements/:id/reset requires admin', async ({ assert, client }) => {
    const userAchievement = await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 100,
      requiredProgress: 100,
      currentTier: 1,
      progressData: {},
      unlockedAt: DateTime.now(),
    })

    const response = await client
      .patch(`/api/user-achievements/${userAchievement.id}/reset`)
      .bearerToken(userToken)

    assert.equal(response.status(), 403)
  })

  test('PATCH /api/user-achievements/:id/reset resets progress', async ({ assert, client }) => {
    const userAchievement = await UserAchievement.create({
      userId: user.id,
      achievementId: achievement.id,
      currentProgress: 100,
      requiredProgress: 100,
      currentTier: 3,
      progressData: {},
      unlockedAt: DateTime.now(),
    })

    const response = await client
      .patch(`/api/user-achievements/${userAchievement.id}/reset`)
      .bearerToken(adminToken)

    assert.equal(response.status(), 200)
    assert.property(response.body(), 'userAchievement')
    assert.equal(response.body().userAchievement.currentProgress, 0)
    assert.isNull(response.body().userAchievement.unlockedAt)
    assert.equal(response.body().userAchievement.currentTier, 1)
  })

  test('PATCH /api/user-achievements/:id/reset returns 404 for non-existent achievement', async ({
    assert,
    client,
  }) => {
    const response = await client
      .patch('/api/user-achievements/non-existent-id/reset')
      .bearerToken(adminToken)

    assert.equal(response.status(), 404)
    assert.property(response.body(), 'message')
    assert.equal(response.body().message, 'User achievement not found')
  })
})
