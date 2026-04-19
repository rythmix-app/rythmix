import User from '#models/user'
import { DateTime } from 'luxon'

export async function createAuthenticatedUser(
  prefix: string = 'test',
  role: 'user' | 'admin' = 'user'
) {
  const timestamp = Date.now() + Math.random()
  const userData = {
    username: `${prefix}_${timestamp}`,
    email: `${prefix}_${timestamp}@example.com`,
    password: 'password123',
    role: role,
    emailVerifiedAt: DateTime.now(),
  }

  const user = await User.create(userData)
  const token = await User.accessTokens.create(user)

  return {
    user,
    token: token.value!.release(),
  }
}
