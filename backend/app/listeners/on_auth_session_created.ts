import { DateTime } from 'luxon'
import AuthSessionCreated from '#events/auth_session_created'
import User from '#models/user'
import { AchievementProgressService } from '#services/achievement_progress_service'
import { AchievementType } from '#enums/achievement_type'

const LAUNCH_DAY = DateTime.fromISO('2026-05-20')
const COMEBACK_INACTIVITY_DAYS = 30

export default class OnAuthSessionCreated {
  async handle(event: AuthSessionCreated) {
    const service = new AchievementProgressService()
    const { userId, lastLoginAt, isFirstLogin } = event.payload

    if (isFirstLogin) {
      const user = await User.find(userId)
      if (user && user.createdAt && user.createdAt.hasSame(LAUNCH_DAY, 'day')) {
        await service.ensureAndIncrement(userId, AchievementType.LaunchDaySignup, 1)
      }
    }

    if (lastLoginAt) {
      const daysSinceLastLogin = DateTime.now().diff(lastLoginAt, 'days').days
      if (daysSinceLastLogin >= COMEBACK_INACTIVITY_DAYS) {
        await service.ensureAndIncrement(userId, AchievementType.Comeback, 1)
      }
    }
  }
}
