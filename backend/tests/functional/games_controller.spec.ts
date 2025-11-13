import { test } from '@japa/runner'
import Game from '#models/game'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'

// Helper function to create an admin user
const makeAdminUser = () => {
  const timestamp = Date.now() + Math.random()
  return {
    username: `admin_${timestamp}`,
    email: `admin_${timestamp}@example.com`,
    password: 'password123',
    role: 'admin' as const,
  }
}

test.group('GamesController - CRUD Operations', (group) => {
  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    await testUtils.db().truncate()
  })

  group.teardown(async () => {
    await testUtils.db().truncate()
  })

  test('GET /api/games should return list of games', async ({ client, assert }) => {
    await Game.create({
      name: 'Game 1',
      description: 'Description 1',
    })
    await Game.create({
      name: 'Game 2',
      description: 'Description 2',
    })

    const response = await client.get('/api/games')

    response.assertStatus(200)

    const games = response.body().games
    assert.isAtLeast(games.length, 2)
  })

  test('GET /api/games/:id should return game details', async ({ client, assert }) => {
    const game = await Game.create({
      name: 'Test Game',
      description: 'Test Description',
    })

    const response = await client.get(`/api/games/${game.id}`)

    response.assertStatus(200)

    const returnedGame = response.body().game
    assert.equal(returnedGame.id, game.id)
    assert.equal(returnedGame.name, 'Test Game')
    assert.equal(returnedGame.description, 'Test Description')
  })

  test('GET /api/games/:id should return 404 for non-existent game', async ({ client }) => {
    const response = await client.get('/api/games/999999')

    response.assertStatus(404)
    response.assertBodyContains({ message: 'Game not found' })
  })

  test('POST /api/games should create a new game', async ({ client, assert }) => {
    const admin = await User.create(makeAdminUser())
    const token = await User.accessTokens.create(admin)

    const response = await client.post('/api/games').bearerToken(token.value!.release()).json({
      name: 'New Game',
      description: 'New Game Description',
    })

    response.assertStatus(201)

    const createdGame = response.body().game
    assert.equal(createdGame.name, 'New Game')
    assert.equal(createdGame.description, 'New Game Description')
  })

  test('PATCH /api/games/:id should update game', async ({ client, assert }) => {
    const admin = await User.create(makeAdminUser())
    const token = await User.accessTokens.create(admin)

    const game = await Game.create({
      name: 'Original Name',
      description: 'Original Description',
    })

    const response = await client
      .patch(`/api/games/${game.id}`)
      .bearerToken(token.value!.release())
      .json({
        name: 'Updated Name',
        description: 'Updated Description',
      })

    response.assertStatus(200)

    const updatedGame = response.body().game
    assert.equal(updatedGame.name, 'Updated Name')
    assert.equal(updatedGame.description, 'Updated Description')
  })

  test('PATCH /api/games/:id should return 404 for non-existent game', async ({ client }) => {
    const admin = await User.create(makeAdminUser())
    const token = await User.accessTokens.create(admin)

    const response = await client
      .patch('/api/games/999999')
      .bearerToken(token.value!.release())
      .json({
        name: 'Test',
      })

    response.assertStatus(404)
    response.assertBodyContains({ message: 'Game not found' })
  })

  test('DELETE /api/games/:id should delete the game', async ({ client, assert }) => {
    const admin = await User.create(makeAdminUser())
    const token = await User.accessTokens.create(admin)

    const game = await Game.create({
      name: 'Game to Delete',
      description: 'Will be deleted',
    })

    const response = await client
      .delete(`/api/games/${game.id}`)
      .bearerToken(token.value!.release())

    response.assertStatus(200)
    response.assertBodyContains({
      message: `Game with ID: ${game.id} deleted successfully`,
    })

    const deletedGame = await Game.find(game.id)
    assert.isNull(deletedGame)
  })

  test('DELETE /api/games/:id should return 404 for non-existent game', async ({ client }) => {
    const admin = await User.create(makeAdminUser())
    const token = await User.accessTokens.create(admin)

    const response = await client.delete('/api/games/999999').bearerToken(token.value!.release())

    response.assertStatus(404)
    response.assertBodyContains({ message: 'Game not found' })
  })
})

test.group('GamesController - Integration Scenarios', (group) => {
  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    await testUtils.db().truncate()
  })

  group.teardown(async () => {
    await testUtils.db().truncate()
  })

  test('Complete game lifecycle (create -> read -> update -> delete)', async ({
    client,
    assert,
  }) => {
    const admin = await User.create(makeAdminUser())
    const token = await User.accessTokens.create(admin)

    // Create
    let response = await client.post('/api/games').bearerToken(token.value!.release()).json({
      name: 'Lifecycle Game',
      description: 'Testing full lifecycle',
    })

    response.assertStatus(201)
    const gameId = response.body().game.id

    // Read (list)
    response = await client.get('/api/games')
    let games = response.body().games
    assert.exists(games.find((g: any) => g.id === gameId))

    // Read (single)
    response = await client.get(`/api/games/${gameId}`)
    response.assertStatus(200)
    assert.equal(response.body().game.name, 'Lifecycle Game')

    // Update
    response = await client.patch(`/api/games/${gameId}`).bearerToken(token.value!.release()).json({
      name: 'Updated Lifecycle Game',
      description: 'Updated description',
    })
    response.assertStatus(200)
    assert.equal(response.body().game.name, 'Updated Lifecycle Game')

    // Delete
    response = await client.delete(`/api/games/${gameId}`).bearerToken(token.value!.release())
    response.assertStatus(200)

    // Verify deletion
    response = await client.get(`/api/games/${gameId}`)
    response.assertStatus(404)
  })

  test('Multiple games operations', async ({ client, assert }) => {
    const admin = await User.create(makeAdminUser())
    const token = await User.accessTokens.create(admin)

    await client.post('/api/games').bearerToken(token.value!.release()).json({
      name: 'Game A',
      description: 'Description A',
    })
    await client.post('/api/games').bearerToken(token.value!.release()).json({
      name: 'Game B',
      description: 'Description B',
    })
    await client.post('/api/games').bearerToken(token.value!.release()).json({
      name: 'Game C',
      description: 'Description C',
    })

    const response = await client.get('/api/games')
    const games = response.body().games
    assert.isAtLeast(games.length, 3)
  })
})

test.group('GamesController - Edge Cases', (group) => {
  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    await testUtils.db().truncate()
  })

  group.teardown(async () => {
    await testUtils.db().truncate()
  })

  test('POST /api/games should handle service errors gracefully', async ({ client, assert }) => {
    const admin = await User.create(makeAdminUser())
    const token = await User.accessTokens.create(admin)

    const response = await client
      .post('/api/games')
      .bearerToken(token.value!.release())
      .json({
        name: 'x'.repeat(300),
        description: 'Test',
      })

    assert.isAtLeast(response.status(), 400)
  })

  test('PATCH /api/games/:id should handle service errors gracefully', async ({
    client,
    assert,
  }) => {
    const admin = await User.create(makeAdminUser())
    const token = await User.accessTokens.create(admin)

    const game = await Game.create({
      name: 'Test',
      description: 'Test',
    })

    const response = await client
      .patch(`/api/games/${game.id}`)
      .bearerToken(token.value!.release())
      .json({
        name: 'x'.repeat(300),
      })

    assert.isAtLeast(response.status(), 400)
  })
})
