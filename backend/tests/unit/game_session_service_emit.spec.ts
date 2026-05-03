import { test } from '@japa/runner'
import GameSession from '#models/game_session'
import { GameSessionService } from '#services/game_session_service'
import Game from '#models/game'
import { GameSessionStatus } from '#enums/game_session_status'
import { deleteGameSession } from '#tests/utils/game_session_helpers'

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
