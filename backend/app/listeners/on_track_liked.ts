import TrackLiked from '#events/track_liked'
import { AchievementProgressService } from '#services/achievement_progress_service'
import { AchievementType } from '#enums/achievement_type'

export default class OnTrackLiked {
  async handle(event: TrackLiked) {
    const service = new AchievementProgressService()
    const { userId } = event.payload

    await service.ensureAndIncrement(userId, AchievementType.FirstLike, 1)
    await service.ensureAndIncrement(userId, AchievementType.TotalLikes, 1)
  }
}
