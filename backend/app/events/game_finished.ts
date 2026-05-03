import { BaseEvent } from '@adonisjs/core/events'

export type GameFinishedPayload = {
  userId: string
  gameId: number
  score: number
  maxScore: number
  isPerfect: boolean
  durationMs: number
  fastestAnswerMs?: number
  correctAnswersCount: number
}

export default class GameFinished extends BaseEvent {
  constructor(public payload: GameFinishedPayload) {
    super()
  }
}
