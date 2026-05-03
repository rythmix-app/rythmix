import GameFinished from '#events/game_finished'
import { AchievementProgressService } from '#services/achievement_progress_service'
import { AchievementType } from '#enums/achievement_type'

const FAST_ANSWER_THRESHOLD_MS = 3000

export default class OnGameFinished {
  async handle(event: GameFinished) {
    const service = new AchievementProgressService()
    const { userId, isPerfect, fastestAnswerMs, correctAnswersCount } = event.payload

    await service.ensureAndIncrement(userId, AchievementType.FirstGame, 1)
    await service.ensureAndIncrement(userId, AchievementType.GamesPlayed, 1)
    await service.ensureAndIncrement(userId, AchievementType.TotalGamesPlayed, 1)

    if (correctAnswersCount > 0) {
      await service.ensureAndIncrement(
        userId,
        AchievementType.TotalCorrectAnswers,
        correctAnswersCount
      )
    }

    if (isPerfect) {
      await service.ensureAndIncrement(userId, AchievementType.FirstWin, 1)
      await service.ensureAndIncrement(userId, AchievementType.PerfectGame, 1)
    }

    if (fastestAnswerMs !== undefined && fastestAnswerMs < FAST_ANSWER_THRESHOLD_MS) {
      await service.ensureAndIncrement(userId, AchievementType.FastAnswer, 1)
    }
  }
}
