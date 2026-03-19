import { test } from '@japa/runner'
import { createAuthenticatedUser } from '../utils/auth_helpers.js'
import { deleteUser } from '#tests/utils/user_helpers'

test.group('ProfileController - Show', (group) => {
  deleteUser(group)

  test('GET /api/profile should return authenticated user profile', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser('profile_show1')

    const response = await client.get('/api/profile').bearerToken(token)

    response.assertStatus(200)

    const profile = response.body().user
    assert.equal(profile.id, user.id)
    assert.equal(profile.username, user.username)
    assert.equal(profile.email, user.email)
    assert.notExists(profile.password)
  })

  test('GET /api/profile should return 401 without authentication', async ({ client }) => {
    const response = await client.get('/api/profile')

    response.assertStatus(401)
  })
})

test.group('ProfileController - Update', (group) => {
  deleteUser(group)

  test('PATCH /api/profile should update firstName and lastName', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('profile_update1')

    const response = await client.patch('/api/profile').bearerToken(token).json({
      firstName: 'Updated',
      lastName: 'Name',
    })

    response.assertStatus(200)

    const updatedUser = response.body().user
    assert.equal(updatedUser.firstName, 'Updated')
    assert.equal(updatedUser.lastName, 'Name')
    assert.notExists(updatedUser.password)
  })

  test('PATCH /api/profile should update username', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('profile_update2')
    const newUsername = `updated_${Date.now()}_${Math.random()}`

    const response = await client.patch('/api/profile').bearerToken(token).json({
      username: newUsername,
    })

    response.assertStatus(200)
    assert.equal(response.body().user.username, newUsername)
  })

  test('PATCH /api/profile should return 409 for duplicate username', async ({ client }) => {
    const { token } = await createAuthenticatedUser('profile_update3')
    const other = await createAuthenticatedUser('profile_other')

    const response = await client.patch('/api/profile').bearerToken(token).json({
      username: other.user.username,
    })

    response.assertStatus(409)
    response.assertBodyContains({ message: 'User with this email or username already exists' })
  })

  test('PATCH /api/profile should return 401 without authentication', async ({ client }) => {
    const response = await client.patch('/api/profile').json({ firstName: 'Test' })

    response.assertStatus(401)
  })

  test('PATCH /api/profile should ignore non-allowed fields', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser('profile_update4')
    const originalEmail = user.email

    const response = await client.patch('/api/profile').bearerToken(token).json({
      email: 'hacked@example.com',
      role: 'admin',
      firstName: 'Safe',
    })

    response.assertStatus(200)

    const updatedUser = response.body().user
    assert.equal(updatedUser.firstName, 'Safe')
    assert.equal(updatedUser.email, originalEmail)
    assert.equal(updatedUser.role, 'user')
  })
})
