import Game from '#models/game'
import db from '@adonisjs/lucid/services/db'

export class GameService {
  public async getAll(userId?: string) {
    const query = Game.query().select('*')

    if (userId) {
      query.select(
        db.raw(
          'coalesce((select true from "favorite_games" where "favorite_games"."game_id" = "games"."id" and "favorite_games"."user_id" = ? limit 1), false) as "isFavorite"',
          [userId]
        )
      )
    }

    return query
  }

  public async getById(gameId: number, userId?: string) {
    const query = Game.query().select('*')

    if (userId) {
      query.select(
        db.raw(
          'coalesce((select true from "favorite_games" where "favorite_games"."game_id" = "games"."id" and "favorite_games"."user_id" = ? limit 1), false) as "isFavorite"',
          [userId]
        )
      )
    }

    return query.where('id', gameId).first()
  }

  public async createGame(payload: { name: string; description: string }) {
    try {
      return await Game.create(payload)
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
