import User from '#models/user'
import RefreshToken from '#models/refresh_token'
import EmailVerificationToken from '#models/email_verification_token'
import { Group } from '@japa/runner/core'
import { DateTime } from 'luxon'

export function deleteAuthData(group: Group) {
  let testStartTime: DateTime

  group.setup(() => {
    testStartTime = DateTime.now()
  })

  group.each.teardown(async () => {
    await RefreshToken.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
    await EmailVerificationToken.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
  })

  group.teardown(async () => {
    await User.query().where('created_at', '>=', testStartTime.toSQL()!).delete()
  })
}
