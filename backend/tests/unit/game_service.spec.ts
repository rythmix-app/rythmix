import { test } from '@japa/runner'
import Game from '#models/game'
import { GameService } from '#services/game_service'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('GameService - CRUD Operations', (group) => {
  let gameService: GameService

  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    gameService = new GameService()
    await testUtils.db().truncate()
  })

  test('createGame should create a new game successfully', async ({ assert }) => {
    const result = await gameService.createGame({
      name: 'Test Game',
      description: 'Test description',
    })

    assert.instanceOf(result, Game)
    if (result instanceof Game) {
      assert.equal(result.name, 'Test Game')
      assert.equal(result.description, 'Test description')
    }
  })

  test('getAll should return all games', async ({ assert }) => {
    const g1 = await Game.create({ name: 'Game 1', description: 'Desc 1' })
    const g2 = await Game.create({ name: 'Game 2', description: 'Desc 2' })

    const all = await gameService.getAll()
    assert.isAtLeast(all.length, 2)
    assert.exists(all.find((g) => g.id === g1.id))
    assert.exists(all.find((g) => g.id === g2.id))
  })

  test('getById should return game when found', async ({ assert }) => {
    const g = await Game.create({ name: 'Find Me', description: 'Test' })
    const found = await gameService.getById(g.id)
    assert.isNotNull(found)
    assert.equal(found?.id, g.id)
  })

  test('getById should return null when game not found', async ({ assert }) => {
    const notFound = await gameService.getById(999999)
    assert.isNull(notFound)
  })

  test('updateGame should update game successfully', async ({ assert }) => {
    const g = await Game.create({ name: 'Old', description: 'Old desc' })
    const result = await gameService.updateGame(g.id, {
      name: 'New',
      description: 'New desc',
    })

    assert.instanceOf(result, Game)
    if (result instanceof Game) {
      assert.equal(result.name, 'New')
      assert.equal(result.description, 'New desc')
    }
  })

  test('updateGame should return error when game not found', async ({ assert }) => {
    const result = await gameService.updateGame(999999, { name: 'Test' })

    assert.notInstanceOf(result, Game)
    if (!(result instanceof Game)) {
      assert.equal(result.error, 'Game not found')
      assert.equal(result.status, 404)
    }
  })

  test('deleteGame should delete the game successfully', async ({ assert }) => {
    const g = await Game.create({ name: 'Delete Me', description: 'To delete' })
    const result = await gameService.deleteGame(g.id)

    assert.equal(result.message, `Game with ID: ${g.id} deleted successfully`)

    const deleted = await Game.find(g.id)
    assert.isNull(deleted)
  })

  test('deleteGame should return error when game not found', async ({ assert }) => {
    const result = await gameService.deleteGame(999999)
    assert.equal(result.error, 'Game not found')
    assert.equal(result.status, 404)
  })

  test('createGame should return 409 on unique violation', async ({ assert }) => {
    const originalCreate = (Game as any).create
    ;(Game as any).create = async () => {
      const e: any = new Error('dup')
      e.code = '23505'
      throw e
    }

    try {
      const result = await gameService.createGame({ name: 'Dup', description: 'Test' })
      assert.notInstanceOf(result, Game)
      if (!(result instanceof Game)) {
        assert.equal(result.error, 'Game with this name already exists')
        assert.equal(result.status, 409)
      }
    } finally {
      ;(Game as any).create = originalCreate
    }
  })

  test('createGame should return 400 on field length violation', async ({ assert }) => {
    const originalCreate = (Game as any).create
    ;(Game as any).create = async () => {
      const e: any = new Error('length')
      e.code = '22001'
      throw e
    }

    try {
      const result = await gameService.createGame({ name: 'x'.repeat(300), description: 'Test' })
      assert.notInstanceOf(result, Game)
      if (!(result instanceof Game)) {
        assert.equal(result.error, 'One or more fields exceed maximum length')
        assert.equal(result.status, 400)
      }
    } finally {
      ;(Game as any).create = originalCreate
    }
  })

  test('createGame should rethrow unknown errors', async ({ assert }) => {
    const originalCreate = (Game as any).create
    ;(Game as any).create = async () => {
      const e: any = new Error('Unknown')
      e.code = 'UNKNOWN_ERROR'
      throw e
    }

    try {
      await gameService.createGame({ name: 'Err', description: 'Test' })
      assert.fail('Should have thrown an error')
    } catch (error: any) {
      assert.equal(error.message, 'Unknown')
    } finally {
      ;(Game as any).create = originalCreate
    }
  })

  test('updateGame should return 409 when save conflicts', async ({ assert }) => {
    const g = await Game.create({ name: 'Test', description: 'Test' })

    const originalSave = g.save.bind(g)
    const originalQuery = Game.query
    g.save = async () => {
      const e: any = new Error('dup')
      e.code = '23505'
      throw e
    }
    Game.query = () =>
      ({
        where: () => ({ first: async () => g }),
      }) as any

    try {
      const result = await gameService.updateGame(g.id, { name: 'Dup' })
      assert.notInstanceOf(result, Game)
      if (!(result instanceof Game)) {
        assert.equal(result.error, 'Game with this name already exists')
        assert.equal(result.status, 409)
      }
    } finally {
      g.save = originalSave
      Game.query = originalQuery
    }
  })

  test('updateGame should return 400 when save length violation', async ({ assert }) => {
    const g = await Game.create({ name: 'Test', description: 'Test' })

    const originalSave = g.save.bind(g)
    const originalQuery = Game.query
    g.save = async () => {
      const e: any = new Error('length')
      e.code = '22001'
      throw e
    }
    Game.query = () =>
      ({
        where: () => ({ first: async () => g }),
      }) as any

    try {
      const result = await gameService.updateGame(g.id, { name: 'x'.repeat(300) })
      assert.notInstanceOf(result, Game)
      if (!(result instanceof Game)) {
        assert.equal(result.error, 'One or more fields exceed maximum length')
        assert.equal(result.status, 400)
      }
    } finally {
      g.save = originalSave
      Game.query = originalQuery
    }
  })

  test('updateGame should rethrow unknown save errors', async ({ assert }) => {
    const g = await Game.create({ name: 'Test', description: 'Test' })

    const originalSave = g.save.bind(g)
    const originalQuery = Game.query
    g.save = async () => {
      const e: any = new Error('Unknown')
      e.code = 'UNKNOWN_ERROR'
      throw e
    }
    Game.query = () =>
      ({
        where: () => ({ first: async () => g }),
      }) as any

    try {
      await gameService.updateGame(g.id, { name: 'Err' })
      assert.fail('Should have thrown an error')
    } catch (error: any) {
      assert.equal(error.message, 'Unknown')
    } finally {
      g.save = originalSave
      Game.query = originalQuery
    }
  })
})
