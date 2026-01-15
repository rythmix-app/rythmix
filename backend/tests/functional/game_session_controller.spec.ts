import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Game from '#models/game'
import GameSession from '#models/game_session'
import { createAuthenticatedUser } from '../utils/auth_helpers.js'

async function createGame(tag: string) {
  return Game.create({
    name: `Game ${tag} ${Date.now()}`,
    description: `Description for ${tag}`,
    isEnabled: true,
    isMultiplayer: false,
  })
}

test.group('GameSessionsController - Functional', (group) => {
  group.each.setup(() => {
    return testUtils.db().withGlobalTransaction()
  })

  test('POST /api/game-sessions creates record', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('post')
    const game = await createGame('post')
    const payload = {
      gameId: game.id,
      status: 'en_cours',
      players: [
        {
          userId: 'user-123',
          status: 'actif',
          score: 100,
          expGained: 50,
          rank: 1,
        },
      ],
      gameData: {
        manche: 1,
        settings: { difficulty: 'normal' },
      },
    }

    const res = await client.post('/api/game-sessions').bearerToken(token).json(payload)

    res.assertStatus(201)
    assert.equal(res.body().gameSession.gameId, payload.gameId)
    assert.equal(res.body().gameSession.gameId, payload.gameId)
    assert.equal(res.body().gameSession.status, payload.status)
    assert.isArray(res.body().gameSession.players)
    assert.equal(res.body().gameSession.players.length, 1)
  })

  test('GET /api/game-sessions/:id returns game session details', async ({ client, assert }) => {
    const game = await createGame('show')
    const session = await GameSession.create({
      gameId: game.id,
      status: 'en_cours',
      players: [{ userId: 'user-1', status: 'actif', score: 0, expGained: 0, rank: 1 }],
      gameData: { manche: 1 },
    })

    const res = await client.get(`/api/game-sessions/${session.id}`)

    res.assertStatus(200)
    assert.equal(res.body().gameSession.id, session.id)
    assert.equal(res.body().gameSession.status, 'en_cours')
    assert.exists(res.body().gameSession.game)
  })

  test('GET /api/game-sessions/:id returns 404 for non-existent session', async ({ client }) => {
    const res = await client.get('/api/game-sessions/non-existent-id')
    res.assertStatus(404)
    res.assertBodyContains({ message: 'Game session not found' })
  })

  test('PATCH /api/game-sessions/:id updates record', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('patch')
    const game = await createGame('patch')
    const session = await GameSession.create({
      gameId: game.id,
      status: 'en_cours',
      players: [{ userId: 'user-1', status: 'actif', score: 50, expGained: 25, rank: 1 }],
      gameData: { manche: 1 },
    })

    const res = await client
      .patch(`/api/game-sessions/${session.id}`)
      .bearerToken(token)
      .json({
        status: 'terminee',
        players: [{ userId: 'user-1', status: 'termine', score: 200, expGained: 100, rank: 1 }],
        gameData: { manche: 5, winner: 'user-1' },
      })

    res.assertStatus(200)

    assert.equal(res.body().status, 'terminee')
    assert.equal(res.body().players[0].score, 200)
    assert.equal(res.body().gameData.manche, 5)
  })

  test('PATCH /api/game-sessions/:id returns 404 for non-existent session', async ({ client }) => {
    const { token } = await createAuthenticatedUser('patch404')
    const res = await client.patch('/api/game-sessions/non-existent-id').bearerToken(token).json({
      status: 'terminee',
    })
    res.assertStatus(404)
    res.assertBodyContains({ message: 'GameSession not found' })
  })

  test('DELETE /api/game-sessions/:id deletes record', async ({ client }) => {
    const { token } = await createAuthenticatedUser('delete')
    const game = await createGame('delete')
    const session = await GameSession.create({
      gameId: game.id,
      status: 'annulee',
      players: [],
      gameData: {},
    })

    const res = await client.delete(`/api/game-sessions/${session.id}`).bearerToken(token)

    res.assertStatus(200)
    res.assertBodyContains({
      message: `GameSession with ID: ${session.id} deleted successfully`,
    })
  })

  test('DELETE /api/game-sessions/:id returns 404 for non-existent session', async ({ client }) => {
    const { token } = await createAuthenticatedUser('delete404')
    const res = await client.delete('/api/game-sessions/non-existent-id').bearerToken(token)
    res.assertStatus(404)
    res.assertBodyContains({ message: 'GameSession not found' })
  })

  test('GET /api/game-sessions/:gameId/sessions returns sessions for specific game', async ({
    client,
    assert,
  }) => {
    const game1 = await createGame('game1')
    const game2 = await createGame('game2')

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

    const res = await client.get(`/api/game-sessions/${game1.id}/sessions`)

    res.assertStatus(200)
    assert.equal(res.body().gameSessions.length, 2)
    assert.isTrue(res.body().gameSessions.every((s: any) => s.gameId === game1.id))
  })

  test('GET /api/game-sessions/status/:status returns sessions with specific status', async ({
    client,
    assert,
  }) => {
    const game = await createGame('status')

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

    const res = await client.get('/api/game-sessions/status/en_cours')

    res.assertStatus(200)
    assert.isAbove(res.body().gameSessions.length, 0)
    assert.isTrue(res.body().gameSessions.every((s: any) => s.status === 'en_cours'))
    assert.exists(res.body().gameSessions.find((s: any) => s.id === session1.id))
    assert.exists(res.body().gameSessions.find((s: any) => s.id === session2.id))
  })

  test('POST /api/game-sessions returns 404 for non-existent game', async ({ client }) => {
    const { token } = await createAuthenticatedUser('post404')
    const payload = {
      gameId: 99999,
      status: 'en_cours',
      players: [],
      gameData: {},
    }

    const res = await client.post('/api/game-sessions').bearerToken(token).json(payload)

    res.assertStatus(404)
    res.assertBodyContains({ message: 'Game not found' })
  })

  test('POST /api/game-sessions handles JSON fields correctly', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('json')
    const game = await createGame('json')
    const complexPayload = {
      gameId: game.id,
      status: 'en_cours',
      players: [
        {
          userId: 'user-1',
          status: 'actif',
          score: 150,
          expGained: 75,
          rank: 1,
        },
        {
          userId: 'user-2',
          status: 'actif',
          score: 100,
          expGained: 50,
          rank: 2,
        },
      ],
      gameData: {
        manche: 3,
        settings: {
          difficulty: 'hard',
          maxPlayers: 4,
          timeLimit: 300,
        },
        classement: ['user-1', 'user-2'],
        points: {
          'user-1': 150,
          'user-2': 100,
        },
      },
    }

    const res = await client.post('/api/game-sessions').bearerToken(token).json(complexPayload)

    res.assertStatus(201)
    assert.equal(res.body().gameSession.players.length, 2)
    assert.equal(res.body().gameSession.gameData.manche, 3)
    assert.equal(res.body().gameSession.gameData.settings.difficulty, 'hard')
    assert.isArray(res.body().gameSession.gameData.classement)
  })
})
