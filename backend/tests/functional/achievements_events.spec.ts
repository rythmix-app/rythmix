import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Achievement from '#models/achievement'
import Game from '#models/game'
import User from '#models/user'
import { AchievementType } from '#enums/achievement_type'
import { GameSessionStatus } from '#enums/game_session_status'
import { createAuthenticatedUser } from '#tests/utils/auth_helpers'
import { deleteAchievementProgress } from '#tests/utils/achievement_progress_helpers'

test.group('Achievements — events end-to-end', (group) => {
  let testStartTime: DateTime

  group.setup(() => {
    testStartTime = DateTime.now()
  })

  deleteAchievementProgress(group)

  group.teardown(async () => {
    await Game.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
  })

  test('POST /api/game-sessions with status=completed unlocks FirstGame', async ({
    assert,
    client,
  }) => {
    const { user, token } = await createAuthenticatedUser('e2e_first_game')

    await Achievement.createMany([
      { type: AchievementType.FirstGame, name: 'Bienvenue', description: 'd' },
      { type: AchievementType.GamesPlayed, name: 'Vétéran', description: 'd' },
      { type: AchievementType.TotalGamesPlayed, name: 'Légende', description: 'd' },
    ])

    const game = await Game.create({
      name: `Test Game ${Date.now()}`,
      description: 'desc',
    })

    const createResponse = await client
      .post('/api/game-sessions')
      .bearerToken(token)
      .json({
        gameId: game.id,
        status: GameSessionStatus.Completed,
        players: [{ userId: user.id, status: 'finished', score: 5, expGained: 0, rank: 1 }],
        gameData: {
          score: 5,
          maxScore: 5,
          answers: [
            { correct: true },
            { correct: true },
            { correct: true },
            { correct: true },
            { correct: true },
          ],
          timeElapsed: 30,
        },
      })

    assert.equal(createResponse.status(), 201)

    const myAchievements = await client.get('/api/user-achievements/me').bearerToken(token)

    assert.equal(myAchievements.status(), 200)

    const list = myAchievements.body().userAchievements as Array<any>
    const firstGame = list.find((a) => a.achievement?.type === AchievementType.FirstGame)
    assert.exists(firstGame)
    assert.equal(firstGame.currentProgress, 1)
    assert.isNotNull(firstGame.unlockedAt)
  })

  test('login after >30 days inactivity unlocks Comeback', async ({ assert, client }) => {
    const password = 'password123'
    const timestamp = Date.now() + Math.random()
    const user = await User.create({
      email: `comeback_${timestamp}@example.com`,
      username: `comeback_${timestamp}`,
      password,
      role: 'user',
      emailVerifiedAt: DateTime.now(),
      lastLoginAt: DateTime.now().minus({ days: 31 }),
    })

    await Achievement.create({
      type: AchievementType.Comeback,
      name: 'Le Retour',
      description: 'd',
    })

    const loginResponse = await client.post('/api/auth/login').json({
      email: user.email,
      password,
    })

    assert.equal(loginResponse.status(), 200)
    const accessToken = loginResponse.body().accessToken as string

    const myAchievements = await client.get('/api/user-achievements/me').bearerToken(accessToken)

    assert.equal(myAchievements.status(), 200)
    const list = myAchievements.body().userAchievements as Array<any>
    const comeback = list.find((a) => a.achievement?.type === AchievementType.Comeback)
    assert.exists(comeback)
    assert.isNotNull(comeback.unlockedAt)
  })
})
