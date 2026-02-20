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
      players: [{ userId: 'user-1', status: 'actif', score: 0, expGained: 0, rank: 1 }],
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
      players: [{ userId: 'user-1', status: 'actif', score: 0, expGained: 0, rank: 1 }],
      gameData: { manche: 1 },
    })
    const updated = await service.updateGameSession(session.id, {
      status: 'terminee',
      players: [{ userId: 'user-1', status: 'termine', score: 200, expGained: 100, rank: 1 }],
    })
    assert.instanceOf(updated, GameSession)
    if (updated instanceof GameSession) {
      assert.equal(updated.status, 'terminee')
      assert.equal(updated.players[0].score, 200)
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

  test('JSON fields are properly serialized and deserialized', async ({ assert }) => {
    const game = await createTestGame('json')
    const complexPlayers = [
      { userId: 'user-1', status: 'actif', score: 150, expGained: 75, rank: 1 },
      { userId: 'user-2', status: 'actif', score: 100, expGained: 50, rank: 2 },
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
