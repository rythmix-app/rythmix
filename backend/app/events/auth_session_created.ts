import { BaseEvent } from '@adonisjs/core/events'
import { DateTime } from 'luxon'

export type AuthSessionCreatedPayload = {
  userId: string
  lastLoginAt: DateTime | null
  isFirstLogin: boolean
}

export default class AuthSessionCreated extends BaseEvent {
  constructor(public payload: AuthSessionCreatedPayload) {
    super()
  }
}
