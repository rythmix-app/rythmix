import { test } from '@japa/runner'
import OnGameFinished from '#listeners/on_game_finished'
import GameFinished from '#events/game_finished'
import Achievement from '#models/achievement'
import UserAchievement from '#models/user_achievement'
import { AchievementType } from '#enums/achievement_type'
import { createAuthenticatedUser } from '#tests/utils/auth_helpers'
import { deleteAchievementProgress } from '#tests/utils/achievement_progress_helpers'

async function seedAchievements(types: AchievementType[]) {
  await Achievement.createMany(
    types.map((type) => ({ type, name: type.toString(), description: 'd' }))
  )
}

async function unlockedTypes(userId: string): Promise<AchievementType[]> {
  const rows = await UserAchievement.query()
    .where('user_id', userId)
    .whereNotNull('unlocked_at')
    .preload('achievement')
  return rows.map((r) => r.achievement.type)
}

test.group('OnGameFinished listener', (group) => {
  deleteAchievementProgress(group)

  test('handles a basic finished session: FirstGame, GamesPlayed, TotalGamesPlayed unlocked at 1 step', async ({
    assert,
  }) => {
    const { user } = await createAuthenticatedUser('ogf_basic')
    await seedAchievements([
      AchievementType.FirstGame,
      AchievementType.GamesPlayed,
      AchievementType.TotalGamesPlayed,
    ])

    const listener = new OnGameFinished()
    await listener.handle(
      new GameFinished({
        userId: user.id,
        gameId: 1,
        score: 1,
        maxScore: 5,
        isPerfect: false,
        durationMs: 30000,
        correctAnswersCount: 0,
      })
    )

    const types = await unlockedTypes(user.id)
    assert.includeMembers(types, [AchievementType.FirstGame])
    assert.notInclude(types, AchievementType.PerfectGame)
    assert.notInclude(types, AchievementType.FastAnswer)

    const gamesPlayed = await UserAchievement.query()
      .where('user_id', user.id)
      .whereHas('achievement', (q) => q.where('type', AchievementType.GamesPlayed))
      .first()
    assert.equal(gamesPlayed?.currentProgress, 1)
  })

  test('perfect game also unlocks FirstWin and PerfectGame', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('ogf_perfect')
    await seedAchievements([
      AchievementType.FirstGame,
      AchievementType.GamesPlayed,
      AchievementType.TotalGamesPlayed,
      AchievementType.FirstWin,
      AchievementType.PerfectGame,
    ])

    const listener = new OnGameFinished()
    await listener.handle(
      new GameFinished({
        userId: user.id,
        gameId: 1,
        score: 5,
        maxScore: 5,
        isPerfect: true,
        durationMs: 20000,
        correctAnswersCount: 5,
      })
    )

    const types = await unlockedTypes(user.id)
    assert.includeMembers(types, [AchievementType.FirstWin, AchievementType.PerfectGame])
  })

  test('fastestAnswerMs under 3000 unlocks FastAnswer', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('ogf_fast')
    await seedAchievements([
      AchievementType.FirstGame,
      AchievementType.GamesPlayed,
      AchievementType.TotalGamesPlayed,
      AchievementType.FastAnswer,
    ])

    const listener = new OnGameFinished()
    await listener.handle(
      new GameFinished({
        userId: user.id,
        gameId: 1,
        score: 1,
        maxScore: 5,
        isPerfect: false,
        durationMs: 30000,
        fastestAnswerMs: 1500,
        correctAnswersCount: 1,
      })
    )

    const types = await unlockedTypes(user.id)
    assert.include(types, AchievementType.FastAnswer)
  })

  test('correctAnswersCount accumulates on TotalCorrectAnswers', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('ogf_correct')
    await seedAchievements([
      AchievementType.FirstGame,
      AchievementType.GamesPlayed,
      AchievementType.TotalGamesPlayed,
      AchievementType.TotalCorrectAnswers,
    ])

    const listener = new OnGameFinished()
    await listener.handle(
      new GameFinished({
        userId: user.id,
        gameId: 1,
        score: 7,
        maxScore: 10,
        isPerfect: false,
        durationMs: 30000,
        correctAnswersCount: 7,
      })
    )

    const totalCorrect = await UserAchievement.query()
      .where('user_id', user.id)
      .whereHas('achievement', (q) => q.where('type', AchievementType.TotalCorrectAnswers))
      .first()
    assert.equal(totalCorrect?.currentProgress, 7)
  })
})
