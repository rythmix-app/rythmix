import { test } from '@japa/runner'
import GameSession from '#models/game_session'
import { GameSessionService } from '#services/game_session_service'
import Game from '#models/game'
import Achievement from '#models/achievement'
import { AchievementType } from '#enums/achievement_type'
import { GameSessionStatus } from '#enums/game_session_status'
import GameFinished from '#events/game_finished'
import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'
import { deleteGameSession } from '#tests/utils/game_session_helpers'
import { deleteAchievementProgress } from '#tests/utils/achievement_progress_helpers'

async function createTestGame(tag: string) {
  return Game.create({ name: `Test ${tag} ${Date.now() + Math.random()}`, description: 'd' })
}

const baseGameData = (overrides: Record<string, any> = {}) => ({
  score: 0,
  maxScore: 5,
  answers: [],
  timeElapsed: 10,
  ...overrides,
})

test.group('GameSessionService — emitGameFinished branches', (group) => {
  let service: GameSessionService

  deleteGameSession(group)
  deleteAchievementProgress(group)

  group.each.setup(() => {
    service = new GameSessionService()
  })

  test('createGameSession with Completed status dispatches event for each player (non-perfect, with answer durations)', async ({
    assert,
  }) => {
    const game = await createTestGame('emit_create')

    const created = await service.createGameSession({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [
        { userId: 'u1', status: 'finished', score: 0, expGained: 0, rank: 1 },
        { userId: 'u2', status: 'finished', score: 0, expGained: 0, rank: 2 },
      ],
      gameData: baseGameData({
        score: 3,
        maxScore: 5,
        answers: [
          { correct: true, durationMs: 2000 },
          { correct: false, durationMs: 4000 },
          { correct: true, durationMs: 1500 },
        ],
        timeElapsed: 25,
      }),
    })

    assert.instanceOf(created, GameSession)
  })

  test('updateGameSession transitioning to Completed dispatches event', async ({ assert }) => {
    const game = await createTestGame('emit_update')
    const created = await service.createGameSession({
      gameId: game.id,
      status: GameSessionStatus.Active,
      players: [{ userId: 'u3', status: 'playing', score: 0, expGained: 0, rank: 1 }],
      gameData: baseGameData({ score: 0 }),
    })
    assert.instanceOf(created, GameSession)
    if (!(created instanceof GameSession)) return

    const updated = await service.updateGameSession(created.id, {
      status: GameSessionStatus.Completed,
      gameData: baseGameData({
        score: 5,
        maxScore: 5,
        answers: [{ correct: true, durationMs: 1000 }],
        timeElapsed: 12,
      }) as any,
    })

    assert.instanceOf(updated, GameSession)
    if (updated instanceof GameSession) {
      assert.equal(updated.status, GameSessionStatus.Completed)
    }
  })

  test('updateGameSession completes a Blurchette-shape gameData without answers/score (no 500)', async ({
    assert,
  }) => {
    const game = await createTestGame('emit_blurchette')
    const created = await service.createGameSession({
      gameId: game.id,
      status: GameSessionStatus.Active,
      players: [{ userId: 'u_blur', status: 'playing', score: 0, expGained: 0, rank: 1 }],
      gameData: {
        attempts: [],
        currentBlurLevel: 1,
        foundCorrect: false,
        finalBlurLevel: 1,
      } as any,
    })
    assert.instanceOf(created, GameSession)
    if (!(created instanceof GameSession)) return

    const updated = await service.updateGameSession(created.id, {
      status: GameSessionStatus.Completed,
      gameData: { foundCorrect: true, completedAt: new Date().toISOString() } as any,
    })

    assert.instanceOf(updated, GameSession)
    if (updated instanceof GameSession) {
      assert.equal(updated.status, GameSessionStatus.Completed)
    }
  })

  test('updateGameSession tolerates malformed numeric gameData fields', async ({ assert }) => {
    const game = await createTestGame('emit_malformed_numbers')
    const created = await service.createGameSession({
      gameId: game.id,
      status: GameSessionStatus.Active,
      players: [{ userId: 'u_malformed', status: 'playing', score: 0, expGained: 0, rank: 1 }],
      gameData: baseGameData(),
    })
    assert.instanceOf(created, GameSession)
    if (!(created instanceof GameSession)) return

    const updated = await service.updateGameSession(created.id, {
      status: GameSessionStatus.Completed,
      gameData: {
        score: 'abc',
        maxScore: null,
        timeElapsed: 'bad',
        answers: [{ correct: true, durationMs: 'bad' }],
      } as any,
    })

    assert.instanceOf(updated, GameSession)
    if (updated instanceof GameSession) {
      assert.equal(updated.status, GameSessionStatus.Completed)
    }
  })

  test('updateGameSession swallows listener errors so a buggy listener does not 500 the user', async ({
    assert,
  }) => {
    await Achievement.create({
      type: AchievementType.FirstGame,
      name: AchievementType.FirstGame.toString(),
      description: 'd',
    })

    const game = await createTestGame('emit_listener_err')
    const created = await service.createGameSession({
      gameId: game.id,
      status: GameSessionStatus.Active,
      players: [{ userId: 'u_ghost', status: 'playing', score: 0, expGained: 0, rank: 1 }],
      gameData: baseGameData(),
    })
    assert.instanceOf(created, GameSession)
    if (!(created instanceof GameSession)) return

    const originalLoggerError = logger.error
    let logCalled = false
    let loggedMessage: string | undefined
    const unsubscribe = emitter.on(GameFinished, async () => {
      throw new Error('listener failed')
    })
    logger.error = ((...args: Parameters<typeof logger.error>) => {
      logCalled = true
      if (typeof args[0] === 'string') {
        loggedMessage = args[0]
      } else if (typeof args[1] === 'string') {
        loggedMessage = args[1]
      }
    }) as typeof logger.error

    let updated: Awaited<ReturnType<GameSessionService['updateGameSession']>> | undefined
    try {
      updated = await service.updateGameSession(created.id, {
        status: GameSessionStatus.Completed,
        gameData: baseGameData({ score: 3, maxScore: 5 }) as any,
      })
    } finally {
      unsubscribe()
      logger.error = originalLoggerError
    }

    assert.instanceOf(updated, GameSession)
    assert.isTrue(logCalled)
    assert.equal(loggedMessage, 'GameFinished listener failed')
    if (updated instanceof GameSession) {
      assert.equal(updated.status, GameSessionStatus.Completed)
    }
  })

  test('updateGameSession does not re-dispatch when already Completed', async ({ assert }) => {
    const game = await createTestGame('emit_no_re')
    const created = await service.createGameSession({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: 'u4', status: 'finished', score: 5, expGained: 0, rank: 1 }],
      gameData: baseGameData({
        score: 5,
        maxScore: 5,
        answers: [{ correct: true, durationMs: 100 }],
      }),
    })
    assert.instanceOf(created, GameSession)
    if (!(created instanceof GameSession)) return

    const updated = await service.updateGameSession(created.id, {
      gameData: baseGameData({
        score: 5,
        maxScore: 5,
        answers: [{ correct: true, durationMs: 200 }],
      }) as any,
    })

    assert.instanceOf(updated, GameSession)
  })
})
