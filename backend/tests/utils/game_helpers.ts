import Game from '#models/game'
import FavoriteGame from '#models/favorite_game'
import GameSession from '#models/game_session'
import User from '#models/user'
import { Group } from '@japa/runner/core'
import { DateTime } from 'luxon'

export function deleteGame(group: Group) {
  let testStartTime: DateTime

  group.setup(() => {
    testStartTime = DateTime.now()
  })

  group.each.teardown(async () => {
    await FavoriteGame.query().where('created_at', '>=', testStartTime.toSQL()).delete()
    await GameSession.query().where('created_at', '>=', testStartTime.toSQL()).delete()
  })

  group.teardown(async () => {
    await Game.query().where('created_at', '>=', testStartTime.toSQL()).delete()
    await User.query().where('created_at', '>=', testStartTime.toSQL()).delete()
  })
}
