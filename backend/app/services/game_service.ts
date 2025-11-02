import Game from '#models/game'

export class GameService {
  public async getAll() {
    return Game.query()
  }

  public async getById(gameId: number) {
    return Game.query().where('id', gameId).first()
  }

  public async createGame(payload: { name: string; description: string }) {
    try {
      const game = await Game.create(payload)
      return game
    } catch (error: any) {
      // Handle database constraint errors
      if (error.code === '23505') {
        return {
          error: 'Game with this name already exists',
          status: 409,
        }
      }
      if (error.code === '22001') {
        return {
          error: 'One or more fields exceed maximum length',
          status: 400,
        }
      }
      throw error
    }
  }

  public async updateGame(gameId: number, payload: Partial<Game>) {
    const game = await Game.query().where('id', gameId).first()
    if (!game) {
      return {
        error: 'Game not found',
        status: 404,
      }
    }
    game.merge(payload)
    try {
      await game.save()
      return game
    } catch (error: any) {
      // Handle database constraint errors
      if (error.code === '23505') {
        return {
          error: 'Game with this name already exists',
          status: 409,
        }
      }
      if (error.code === '22001') {
        return {
          error: 'One or more fields exceed maximum length',
          status: 400,
        }
      }
      throw error
    }
  }

  public async deleteGame(gameId: number) {
    const game = await Game.query().where('id', gameId).first()
    if (!game) {
      return {
        error: 'Game not found',
        status: 404,
      }
    }
    await game.delete()
    return { message: `Game with ID: ${gameId} deleted successfully` }
  }
}
