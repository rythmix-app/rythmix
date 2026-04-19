import FavoriteGame from '#models/favorite_game'
import Game from '#models/game'

export class FavoriteGameService {
  /**
   * Get all favorite games for a specific user with preloaded game details
   */
  public async getUserFavorites(userId: string) {
    return FavoriteGame.query().where('user_id', userId).preload('game')
  }

  /**
   * Get all favorites (admin only)
   */
  public async getAll() {
    return FavoriteGame.query().preload('game').preload('user')
  }

  /**
   * Add a game to user's favorites with validation
   */
  public async addFavorite(userId: string, gameId: number) {
    try {
      // Check if game exists and is enabled
      const game = await Game.find(gameId)
      if (!game) {
        return {
          error: 'Game not found',
          status: 404,
        }
      }

      if (!game.isEnabled) {
        return {
          error: 'Cannot favorite a disabled game',
          status: 400,
        }
      }

      // Create the favorite
      const favorite = await FavoriteGame.create({
        userId,
        gameId,
      })

      // Preload game details for response
      await favorite.load('game')
      return favorite
    } catch (error: any) {
      // Handle duplicate favorite (unique constraint violation)
      if (error.code === '23505') {
        return {
          error: 'Game is already in favorites',
          status: 409,
        }
      }
      // Handle foreign key violation
      if (error.code === '23503') {
        return {
          error: 'Game not found',
          status: 404,
        }
      }
      throw error
    }
  }

  /**
   * Remove a favorite by favorite ID with ownership check
   */
  public async removeFavorite(favoriteGameId: string, userId: string) {
    const favorite = await FavoriteGame.query()
      .where('id', favoriteGameId)
      .where('user_id', userId)
      .first()

    if (!favorite) {
      return {
        error: 'Favorite not found',
        status: 404,
      }
    }

    await favorite.delete()
    return { message: 'Game removed from favorites successfully' }
  }

  /**
   * Remove a favorite by game ID (more intuitive for users)
   */
  public async removeFavoriteByGameId(userId: string, gameId: number) {
    const favorite = await FavoriteGame.query()
      .where('user_id', userId)
      .where('game_id', gameId)
      .first()

    if (!favorite) {
      return {
        error: 'Favorite not found',
        status: 404,
      }
    }

    await favorite.delete()
    return { message: 'Game removed from favorites successfully' }
  }
}

export default FavoriteGameService
