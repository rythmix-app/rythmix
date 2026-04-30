import { test } from '@japa/runner'
import GameSession from '#models/game_session'
import { GameSessionService } from '#services/game_session_service'
import Game from '#models/game'
import { deleteGameSession } from '#tests/utils/game_session_helpers'

type ServiceError = { error: string; status: number }
const isServiceError = (v: any): v is ServiceError =>
  v && typeof v === 'object' && 'status' in v && 'error' in v

async function createTestGame(tag: string) {
  return await Game.create({
    name: `Test Game ${tag} ${Date.now()}`,
    description: `Description for ${tag}`,
  })
}

test.group('GameSessionService - Unit CRUD', (group) => {
  let service: GameSessionService

  deleteGameSession(group)

  group.each.setup(async () => {
    service = new GameSessionService()
  })

  test('createGameSession should create a record successfully', async ({ assert }) => {
    const game = await createTestGame('create')
    const created = await service.createGameSession({
      gameId: game.id,
      status: 'en_cours',
      players: [{ userId: 'user-1', status: 'actif', score: 0, rank: 1 }],
      gameData: { manche: 1 },
    })
    assert.instanceOf(created, GameSession)
    if (created instanceof GameSession) {
      assert.equal(created.gameId, game.id)
      assert.equal(created.status, 'en_cours')
    }
  })

  test('createGameSession maps 23503 -> 404 (foreign key constraint)', async ({ assert }) => {
    const originalCreate = (GameSession as any).create
    ;(GameSession as any).create = async () => {
      const err: any = new Error('foreign key violation')
      err.code = '23503'
      throw err
    }
    const result = await service.createGameSession({
      gameId: 99999,
      status: 'en_cours',
      players: [],
      gameData: {},
    })
    assert.notInstanceOf(result, GameSession)
    if (isServiceError(result)) {
      assert.equal(result.status, 404)
      assert.match(result.error, /Game not found/i)
    }
    ;(GameSession as any).create = originalCreate
  })

  test('createGameSession maps 23505 -> 409', async ({ assert }) => {
    const originalCreate = (GameSession as any).create
    ;(GameSession as any).create = async () => {
      const err: any = new Error('duplicate')
      err.code = '23505'
      throw err
    }
    const result = await service.createGameSession({
      gameId: 1,
      status: 'en_cours',
      players: [],
      gameData: {},
    })
    assert.notInstanceOf(result, GameSession)
    if (isServiceError(result)) assert.equal(result.status, 409)
    ;(GameSession as any).create = originalCreate
  })

  test('createGameSession maps 22001 -> 400', async ({ assert }) => {
    const originalCreate = (GameSession as any).create
    ;(GameSession as any).create = async () => {
      const err: any = new Error('value too long')
      err.code = '22001'
      throw err
    }
    const result = await service.createGameSession({
      gameId: 1,
      status: 'x',
      players: [],
      gameData: {},
    })
    assert.notInstanceOf(result, GameSession)
    if (isServiceError(result)) assert.equal(result.status, 400)
    ;(GameSession as any).create = originalCreate
  })

  test('getAll returns list with preloaded game', async ({ assert }) => {
    const game = await createTestGame('list')
    await GameSession.create({
      gameId: game.id,
      status: 'en_cours',
      players: [],
      gameData: {},
    })

    const sessions = await service.getAll()
    assert.isArray(sessions)
    assert.isAtLeast(sessions.length, 1)
  })

  test('getById returns model when exists, null otherwise', async ({ assert }) => {
    const game = await createTestGame('getbyid')
    const session = await GameSession.create({
      gameId: game.id,
      status: 'en_cours',
      players: [],
      gameData: {},
    })
    const found = await service.getById(session.id)
    assert.isNotNull(found)
    assert.equal(found?.id, session.id)

    const notFound = await service.getById('non-existent-id')
    assert.isNull(notFound)
  })

  test('updateGameSession updates successfully', async ({ assert }) => {
    const game = await createTestGame('update')
    const session = await GameSession.create({
      gameId: game.id,
      status: 'en_cours',
      players: [{ userId: 'user-1', status: 'actif', score: 0, rank: 1 }],
      gameData: { manche: 1 },
    })
    const updated = await service.updateGameSession(session.id, {
      status: 'terminee',
      players: [{ userId: 'user-1', status: 'termine', score: 200, rank: 1 }],
    })
    assert.instanceOf(updated, GameSession)
    if (updated instanceof GameSession) {
      assert.equal(updated.status, 'terminee')
      assert.equal(updated.players[0].score, 200)
    }
  })

  test('updateGameSession merges gameData instead of replacing it', async ({ assert }) => {
    const game = await createTestGame('merge_gamedata')
    const session = await GameSession.create({
      gameId: game.id,
      status: 'en_cours',
      players: [{ userId: 'user-1', status: 'actif', score: 0, rank: 1 }],
      gameData: {
        album: { id: 42, title: 'Greatest Hits' },
        genre: { id: 132, name: 'Pop' },
        startedAt: '2026-04-10T12:00:00.000Z',
        maxScore: 10,
        score: 0,
        answers: [],
      },
    })

    const updated = await service.updateGameSession(session.id, {
      status: 'terminee',
      gameData: {
        score: 7,
        answers: [{ userInput: 'Track 1', isCorrect: true, matchedTrackId: 1 }],
        completedAt: '2026-04-10T12:05:00.000Z',
        timeElapsed: 300,
      },
    } as any)

    assert.instanceOf(updated, GameSession)
    if (updated instanceof GameSession) {
      assert.deepEqual(updated.gameData.album, { id: 42, title: 'Greatest Hits' })
      assert.deepEqual(updated.gameData.genre, { id: 132, name: 'Pop' })
      assert.equal(updated.gameData.startedAt, '2026-04-10T12:00:00.000Z')
      assert.equal(updated.gameData.maxScore, 10)
      assert.equal(updated.gameData.score, 7)
      assert.equal(updated.gameData.timeElapsed, 300)
      assert.equal(updated.gameData.completedAt, '2026-04-10T12:05:00.000Z')
      assert.lengthOf(updated.gameData.answers, 1)
    }
  })

  test('updateGameSession returns 404 when not found', async ({ assert }) => {
    const result = await service.updateGameSession('non-existent-id', { status: 'terminee' } as any)
    assert.notInstanceOf(result, GameSession)
    if (isServiceError(result)) {
      assert.equal(result.status, 404)
      assert.match(result.error, /not found/i)
    }
  })

  test('updateGameSession maps 23503 -> 404 (foreign key)', async ({ assert }) => {
    const game = await createTestGame('fk_update')
    const session = await GameSession.create({
      gameId: game.id,
      status: 'en_cours',
      players: [],
      gameData: {},
    })
    const originalQuery = (GameSession as any).query
    ;(GameSession as any).query = () => ({
      where: () => ({
        first: async () => {
          ;(session as any).save = async () => {
            const err: any = new Error('foreign key violation')
            err.code = '23503'
            throw err
          }
          return session
        },
      }),
    })
    const result = await service.updateGameSession(session.id, { gameId: 99999 } as any)
    assert.notInstanceOf(result, GameSession)
    if (isServiceError(result)) assert.equal(result.status, 404)
    ;(GameSession as any).query = originalQuery
  })

  test('updateGameSession maps 23505 -> 409', async ({ assert }) => {
    const game = await createTestGame('conflict')
    const session = await GameSession.create({
      gameId: game.id,
      status: 'en_cours',
      players: [],
      gameData: {},
    })
    const originalQuery = (GameSession as any).query
    ;(GameSession as any).query = () => ({
      where: () => ({
        first: async () => {
          ;(session as any).save = async () => {
            const err: any = new Error('duplicate')
            err.code = '23505'
            throw err
          }
          return session
        },
      }),
    })
    const result = await service.updateGameSession(session.id, { status: 'dup' } as any)
    assert.notInstanceOf(result, GameSession)
    if (isServiceError(result)) assert.equal(result.status, 409)
    ;(GameSession as any).query = originalQuery
  })

  test('updateGameSession maps 22001 -> 400', async ({ assert }) => {
    const game = await createTestGame('too_long_upd')
    const session = await GameSession.create({
      gameId: game.id,
      status: 'en_cours',
      players: [],
      gameData: {},
    })
    const originalQuery = (GameSession as any).query
    ;(GameSession as any).query = () => ({
      where: () => ({
        first: async () => {
          ;(session as any).save = async () => {
            const err: any = new Error('value too long')
            err.code = '22001'
            throw err
          }
          return session
        },
      }),
    })
    const result = await service.updateGameSession(session.id, { status: 'Y' } as any)
    assert.notInstanceOf(result, GameSession)
    if (isServiceError(result)) assert.equal(result.status, 400)
    ;(GameSession as any).query = originalQuery
  })

  test('deleteGameSession deletes successfully', async ({ assert }) => {
    const game = await createTestGame('delete')
    const session = await GameSession.create({
      gameId: game.id,
      status: 'annulee',
      players: [],
      gameData: {},
    })
    const res = await service.deleteGameSession(session.id)
    if (isServiceError(res)) {
      assert.fail(`Expected success, got ${res.status}`)
    } else {
      assert.equal(res.message, `GameSession with ID: ${session.id} deleted successfully`)
    }
  })

  test('deleteGameSession returns 404 when not found', async ({ assert }) => {
    const res = await service.deleteGameSession('non-existent-id')
    if (isServiceError(res)) {
      assert.equal(res.status, 404)
      assert.match(res.error, /not found/i)
    }
  })

  test('getByGameId returns sessions for specific game', async ({ assert }) => {
    const game1 = await createTestGame('game1')
    const game2 = await createTestGame('game2')

    await GameSession.create({
      gameId: game1.id,
      status: 'en_cours',
      players: [],
      gameData: {},
    })
    await GameSession.create({
      gameId: game1.id,
      status: 'terminee',
      players: [],
      gameData: {},
    })
    await GameSession.create({
      gameId: game2.id,
      status: 'en_cours',
      players: [],
      gameData: {},
    })

    const sessions = await service.getByGameId(game1.id)
    assert.equal(sessions.length, 2)
    assert.isTrue(sessions.every((s: any) => s.gameId === game1.id))
  })

  test('getByStatus returns sessions with specific status', async ({ assert }) => {
    const game = await createTestGame('status')

    const session1 = await GameSession.create({
      gameId: game.id,
      status: 'en_cours',
      players: [],
      gameData: {},
    })
    const session2 = await GameSession.create({
      gameId: game.id,
      status: 'en_cours',
      players: [],
      gameData: {},
    })
    await GameSession.create({
      gameId: game.id,
      status: 'terminee',
      players: [],
      gameData: {},
    })

    const sessions = await service.getByStatus('en_cours')
    assert.isAbove(sessions.length, 0)
    assert.isTrue(sessions.every((s: any) => s.status === 'en_cours'))
    // Verify our created sessions are in the results
    assert.exists(sessions.find((s: any) => s.id === session1.id))
    assert.exists(sessions.find((s: any) => s.id === session2.id))
  })

  test('createGameSession returns 409 when active session exists for same user and game', async ({
    assert,
  }) => {
    const game = await createTestGame('conflict_active')
    const userId = `user-conflict-${Date.now()}`

    await GameSession.create({
      gameId: game.id,
      status: 'active',
      players: [{ userId, status: 'playing', score: 0, rank: 1 }],
      gameData: {},
    })

    const result = await service.createGameSession({
      gameId: game.id,
      status: 'active',
      players: [{ userId, status: 'playing', score: 0, rank: 1 }],
      gameData: {},
    })

    assert.notInstanceOf(result, GameSession)
    if (isServiceError(result)) {
      assert.equal(result.status, 409)
      assert.match(result.error, /active session already exists/i)
    }
  })

  test('createGameSession allows creation when existing session is completed', async ({
    assert,
  }) => {
    const game = await createTestGame('completed_ok')
    const userId = `user-completed-${Date.now()}`

    await GameSession.create({
      gameId: game.id,
      status: 'completed',
      players: [{ userId, status: 'done', score: 100, rank: 1 }],
      gameData: {},
    })

    const result = await service.createGameSession({
      gameId: game.id,
      status: 'active',
      players: [{ userId, status: 'playing', score: 0, rank: 1 }],
      gameData: {},
    })

    assert.instanceOf(result, GameSession)
  })

  test('createGameSession allows creation when existing session is canceled', async ({
    assert,
  }) => {
    const game = await createTestGame('canceled_ok')
    const userId = `user-canceled-${Date.now()}`

    await GameSession.create({
      gameId: game.id,
      status: 'canceled',
      players: [{ userId, status: 'done', score: 0, rank: 1 }],
      gameData: {},
    })

    const result = await service.createGameSession({
      gameId: game.id,
      status: 'active',
      players: [{ userId, status: 'playing', score: 0, rank: 1 }],
      gameData: {},
    })

    assert.instanceOf(result, GameSession)
  })

  test('createGameSession rethrows on unknown DB error', async ({ assert }) => {
    const originalCreate = (GameSession as any).create

    ;(GameSession as any).create = async () => {
      const err: any = new Error('weird db failure')
      err.code = '99999'
      throw err
    }

    try {
      await service.createGameSession({
        gameId: 1,
        status: 'en_cours',
        players: [],
        gameData: {},
      })
      assert.fail('Expected service.createGameSession to throw, but it resolved')
    } catch (e: any) {
      assert.instanceOf(e, Error)
      assert.match(String(e.message), /weird db failure/i)
    } finally {
      ;(GameSession as any).create = originalCreate
    }
  })

  test('updateGameSession rethrows on unknown DB error', async ({ assert }) => {
    const game = await createTestGame('unknown_update')
    const session = await GameSession.create({
      gameId: game.id,
      status: 'en_cours',
      players: [],
      gameData: {},
    })

    const originalQuery = (GameSession as any).query
    ;(GameSession as any).query = () => ({
      where: () => ({
        first: async () => {
          ;(session as any).save = async () => {
            const err: any = new Error('unknown update error')
            err.code = '99999'
            throw err
          }
          return session
        },
      }),
    })

    try {
      await service.updateGameSession(session.id, { status: 'X' } as any)
      assert.fail('Expected service.updateGameSession to throw, but it resolved')
    } catch (e: any) {
      assert.instanceOf(e, Error)
      assert.match(String(e.message), /unknown update error/i)
    } finally {
      ;(GameSession as any).query = originalQuery
    }
  })

  test('getGameStats returns neutral values when no completed sessions', async ({ assert }) => {
    const game = await createTestGame('stats_empty')
    const userId = `user-stats-empty-${Date.now()}`

    const stats = await service.getGameStats(userId, game.id)

    assert.equal(stats.totalPlayed, 0)
    assert.equal(stats.bestScore, 0)
    assert.equal(stats.averageScore, 0)
    assert.equal(stats.averageTimeElapsed, 0)
    assert.isNull(stats.lastPlayedAt)
  })

  test('getGameStats defaults missing score and timeElapsed to zero', async ({ assert }) => {
    const game = await createTestGame('stats_no_fields')
    const userId = `user-stats-missing-${Date.now()}`

    await GameSession.create({
      gameId: game.id,
      status: 'completed',
      players: [{ userId, status: 'done', score: 0, rank: 1 }],
      gameData: {},
    })

    const stats = await service.getGameStats(userId, game.id)

    assert.equal(stats.totalPlayed, 1)
    assert.equal(stats.bestScore, 0)
    assert.equal(stats.averageScore, 0)
    assert.equal(stats.averageTimeElapsed, 0)
    assert.isNotNull(stats.lastPlayedAt)
  })

  test('getGameStats computes aggregates from completed sessions', async ({ assert }) => {
    const game = await createTestGame('stats_agg')
    const userId = `user-stats-agg-${Date.now()}`

    await GameSession.create({
      gameId: game.id,
      status: 'completed',
      players: [{ userId, status: 'done', score: 0, rank: 1 }],
      gameData: { score: 10, maxScore: 18, timeElapsed: 30 },
    })
    await GameSession.create({
      gameId: game.id,
      status: 'completed',
      players: [{ userId, status: 'done', score: 0, rank: 1 }],
      gameData: { score: 16, maxScore: 18, timeElapsed: 60 },
    })
    // Canceled session should be excluded
    await GameSession.create({
      gameId: game.id,
      status: 'canceled',
      players: [{ userId, status: 'done', score: 0, rank: 1 }],
      gameData: { score: 0, maxScore: 18, timeElapsed: 5 },
    })

    const stats = await service.getGameStats(userId, game.id)

    assert.equal(stats.totalPlayed, 2)
    assert.equal(stats.bestScore, 16)
    assert.equal(stats.averageScore, 13)
    assert.equal(stats.averageTimeElapsed, 45)
    assert.isNotNull(stats.lastPlayedAt)
  })

  test('createGameSession treats non-array players as having no player ids', async ({ assert }) => {
    const game = await createTestGame('non_array_players')
    const created = await service.createGameSession({
      gameId: game.id,
      status: 'en_cours',
      players: {} as any,
      gameData: {},
    })
    assert.instanceOf(created, GameSession)
  })

  test('getByUserId returns sessions for the user sorted by creation time', async ({ assert }) => {
    const game = await createTestGame('by_user')
    const userId = `user-by-${Date.now()}`

    const older = await GameSession.create({
      gameId: game.id,
      status: 'completed',
      players: [{ userId, status: 'done', score: 0, rank: 1 }],
      gameData: {},
    })
    const newer = await GameSession.create({
      gameId: game.id,
      status: 'active',
      players: [{ userId, status: 'playing', score: 0, rank: 1 }],
      gameData: {},
    })

    const all = await service.getByUserId(userId)
    assert.equal(all.length, 2)
    assert.equal(all[0].id, newer.id)
    assert.equal(all[1].id, older.id)

    const filtered = await service.getByUserId(userId, 'completed')
    assert.equal(filtered.length, 1)
    assert.equal(filtered[0].id, older.id)
  })

  test('getGameHistory paginates completed and canceled sessions by default', async ({
    assert,
  }) => {
    const game = await createTestGame('history')
    const otherGame = await createTestGame('history_other')
    const userId = `user-history-${Date.now()}`

    await GameSession.create({
      gameId: game.id,
      status: 'completed',
      players: [{ userId, status: 'done', score: 10, rank: 1 }],
      gameData: {},
    })
    await GameSession.create({
      gameId: game.id,
      status: 'canceled',
      players: [{ userId, status: 'done', score: 0, rank: 1 }],
      gameData: {},
    })
    // Active session should not be in history
    await GameSession.create({
      gameId: game.id,
      status: 'active',
      players: [{ userId, status: 'playing', score: 0, rank: 1 }],
      gameData: {},
    })
    // Other game should not leak
    await GameSession.create({
      gameId: otherGame.id,
      status: 'completed',
      players: [{ userId, status: 'done', score: 5, rank: 1 }],
      gameData: {},
    })

    const history = await service.getGameHistory(userId, game.id)
    assert.equal(history.all().length, 2)
    assert.isTrue(history.all().every((s: any) => ['completed', 'canceled'].includes(s.status)))
  })

  test('getGameHistory filters by the provided status and respects pagination', async ({
    assert,
  }) => {
    const game = await createTestGame('history_filter')
    const userId = `user-history-filter-${Date.now()}`

    for (let i = 0; i < 3; i++) {
      await GameSession.create({
        gameId: game.id,
        status: 'completed',
        players: [{ userId, status: 'done', score: i, rank: 1 }],
        gameData: {},
      })
    }
    await GameSession.create({
      gameId: game.id,
      status: 'canceled',
      players: [{ userId, status: 'done', score: 0, rank: 1 }],
      gameData: {},
    })

    const completedOnly = await service.getGameHistory(userId, game.id, 'completed', 1, 2)
    assert.equal(completedOnly.all().length, 2)
    assert.isTrue(completedOnly.all().every((s: any) => s.status === 'completed'))
  })

  test('getMyActiveSessionByGameId returns the active session for the user', async ({ assert }) => {
    const game = await createTestGame('active_session')
    const userId = `user-active-${Date.now()}`

    await GameSession.create({
      gameId: game.id,
      status: 'completed',
      players: [{ userId, status: 'done', score: 0, rank: 1 }],
      gameData: {},
    })
    const activeSession = await GameSession.create({
      gameId: game.id,
      status: 'active',
      players: [{ userId, status: 'playing', score: 0, rank: 1 }],
      gameData: {},
    })

    const sessions = await service.getMyActiveSessionByGameId(userId, game.id)
    assert.equal(sessions.length, 1)
    assert.equal(sessions[0].id, activeSession.id)
  })

  test('JSON fields are properly serialized and deserialized', async ({ assert }) => {
    const game = await createTestGame('json')
    const complexPlayers = [
      { userId: 'user-1', status: 'actif', score: 150, rank: 1 },
      { userId: 'user-2', status: 'actif', score: 100, rank: 2 },
    ]
    const complexGameData = {
      manche: 3,
      settings: { difficulty: 'hard', maxPlayers: 4 },
      classement: ['user-1', 'user-2'],
      points: { 'user-1': 150, 'user-2': 100 },
    }

    const created = await service.createGameSession({
      gameId: game.id,
      status: 'en_cours',
      players: complexPlayers,
      gameData: complexGameData,
    })

    assert.instanceOf(created, GameSession)
    if (created instanceof GameSession) {
      assert.deepEqual(created.players, complexPlayers)
      assert.deepEqual(created.gameData, complexGameData)
      assert.equal(created.gameData.settings.difficulty, 'hard')
      assert.isArray(created.gameData.classement)
    }
  })
})
