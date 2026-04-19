import { test } from '@japa/runner'
import User from '#models/user'
import { createAuthenticatedUser } from '../utils/auth_helpers.js'
import { deleteUser } from '#tests/utils/user_helpers'

const makeUser = (prefix: string) => {
  const timestamp = Date.now() + Math.random()
  return {
    username: `${prefix}_${timestamp}`,
    email: `${prefix}_${timestamp}@example.com`,
    password: 'password123',
  }
}

test.group('UsersController - CRUD Operations', (group) => {
  deleteUser(group)

  test('GET /api/users should return list of users', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('admin1', 'admin')
    await User.create(makeUser('user1'))
    await User.create(makeUser('user2'))

    const response = await client.get('/api/users').bearerToken(token)

    response.assertStatus(200)

    const users = response.body().users
    assert.isAtLeast(users.length, 2)
  })

  test('GET /api/users/:id should return user details', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('admin2', 'admin')
    const user = await User.create(makeUser('getbyid'))

    const response = await client.get(`/api/users/${user.id}`).bearerToken(token)

    response.assertStatus(200)

    const returnedUser = response.body().user
    assert.equal(returnedUser.id, user.id)
    assert.equal(returnedUser.username, user.username)
    assert.equal(returnedUser.email, user.email)
    assert.notExists(returnedUser.password)
  })

  test('GET /api/users/:id should return 404 for non-existent user', async ({ client }) => {
    const { token } = await createAuthenticatedUser('admin3', 'admin')
    const response = await client.get('/api/users/non-existent-id').bearerToken(token)

    response.assertStatus(404)
    response.assertBodyContains({ message: 'User not found' })
  })

  test('POST /api/users should create a new user', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('admin4', 'admin')
    const userData = makeUser('newuser')
    const response = await client
      .post('/api/users')
      .bearerToken(token)
      .json({
        ...userData,
        firstName: 'New',
        lastName: 'User',
      })

    response.assertStatus(201)

    const createdUser = response.body().user
    assert.equal(createdUser.username, userData.username)
    assert.equal(createdUser.email, userData.email)
    assert.equal(createdUser.firstName, 'New')
    assert.equal(createdUser.lastName, 'User')
    assert.notExists(createdUser.password)
  })

  test('POST /api/users should create user with minimal data', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('admin5', 'admin')
    const userData = makeUser('minimal')
    const response = await client.post('/api/users').bearerToken(token).json(userData)

    response.assertStatus(201)

    const createdUser = response.body().user
    assert.equal(createdUser.username, userData.username)
    assert.equal(createdUser.email, userData.email)
  })

  test('POST /api/users should return 409 for duplicate email', async ({ client }) => {
    const { token } = await createAuthenticatedUser('admin6', 'admin')
    const existing = makeUser('existing')
    await User.create(existing)

    const response = await client
      .post('/api/users')
      .bearerToken(token)
      .json({
        ...makeUser('new'),
        email: existing.email,
      })

    response.assertStatus(409)
    response.assertBodyContains({
      message: 'User with this email or username already exists',
    })
  })

  test('POST /api/users should return 409 for duplicate username', async ({ client }) => {
    const { token } = await createAuthenticatedUser('admin7', 'admin')
    const existing = makeUser('existing')
    await User.create(existing)

    const response = await client
      .post('/api/users')
      .bearerToken(token)
      .json({
        ...makeUser('new'),
        username: existing.username,
      })

    response.assertStatus(409)
    response.assertBodyContains({
      message: 'User with this email or username already exists',
    })
  })

  test('PATCH /api/users/:id should update user', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('admin8', 'admin')
    const user = await User.create({ ...makeUser('patch'), firstName: 'Original' })

    const response = await client.patch(`/api/users/${user.id}`).bearerToken(token).json({
      firstName: 'Updated',
      lastName: 'Name',
    })

    response.assertStatus(200)

    const updatedUser = response.body().user
    assert.equal(updatedUser.firstName, 'Updated')
    assert.equal(updatedUser.lastName, 'Name')
  })

  test('PATCH /api/users/:id should return 404 for non-existent user', async ({ client }) => {
    const { token } = await createAuthenticatedUser('admin9', 'admin')
    const response = await client.patch('/api/users/non-existent-id').bearerToken(token).json({
      firstName: 'Test',
    })

    response.assertStatus(404)
    response.assertBodyContains({ message: 'User not found' })
  })

  test('DELETE /api/users/:id should require authentication', async ({ client }) => {
    const user = await User.create(makeUser('delete'))

    const response = await client.delete(`/api/users/${user.id}`)

    response.assertStatus(401)
  })

  test('DELETE /api/users/:id should soft delete the user', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser('admin10', 'admin')

    const response = await client.delete(`/api/users/${user.id}`).bearerToken(token)

    response.assertStatus(200)
    response.assertBodyContains({
      message: `User with ID: ${user.id} soft deleted successfully`,
    })

    await user.refresh()
    assert.isNotNull(user.deletedAt)
  })

  test('DELETE /api/users/:id should return 403 when deleting another user', async ({ client }) => {
    const { token } = await createAuthenticatedUser('admin11', 'admin')
    const user2 = await User.create(makeUser('user2'))

    const response = await client.delete(`/api/users/${user2.id}`).bearerToken(token)

    response.assertStatus(403)
    response.assertBodyContains({
      message: 'You do not have permission to delete this user',
    })
  })

  test('DELETE /api/users/:id should return 404 for non-existent user', async ({ client }) => {
    const { token } = await createAuthenticatedUser('admin12', 'admin')

    const response = await client.delete('/api/users/non-existent-id').bearerToken(token)

    response.assertStatus(404)
    response.assertBodyContains({ message: 'User not found' })
  })
})

test.group('UsersController - Soft Delete Features', (group) => {
  deleteUser(group)

  test('GET /api/users should not return soft-deleted users', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('admin13', 'admin')
    await User.create(makeUser('active1'))
    await User.create(makeUser('active2'))

    const deletedUser = await User.create(makeUser('deleted'))
    await deletedUser.softDelete()

    const response = await client.get('/api/users').bearerToken(token)

    response.assertStatus(200)

    const users = response.body().users
    assert.notExists(users.find((u: any) => u.id === deletedUser.id))
  })

  test('GET /api/users/:id should return 404 for soft-deleted user', async ({ client }) => {
    const { token } = await createAuthenticatedUser('admin14', 'admin')
    const user = await User.create(makeUser('getbyid'))

    let response = await client.get(`/api/users/${user.id}`).bearerToken(token)
    response.assertStatus(200)

    await user.softDelete()

    response = await client.get(`/api/users/${user.id}`).bearerToken(token)
    response.assertStatus(404)
    response.assertBodyContains({ message: 'User not found' })
  })

  test('PATCH /api/users/:id should not update soft-deleted users', async ({ client }) => {
    const { token } = await createAuthenticatedUser('admin15', 'admin')
    const user = await User.create({ ...makeUser('patch'), firstName: 'Test' })

    await user.softDelete()

    const response = await client.patch(`/api/users/${user.id}`).bearerToken(token).json({
      firstName: 'Updated',
    })

    response.assertStatus(404)
    response.assertBodyContains({ message: 'User not found' })
  })

  test('POST /api/users should not allow reusing email from soft-deleted user', async ({
    client,
  }) => {
    const { token } = await createAuthenticatedUser('admin16', 'admin')
    const deletedData = makeUser('olduser')
    const deletedUser = await User.create(deletedData)
    await deletedUser.softDelete()

    const newUserData = makeUser('newuser')
    const response = await client
      .post('/api/users')
      .bearerToken(token)
      .json({
        ...newUserData,
        email: deletedData.email,
      })

    response.assertStatus(409)
    response.assertBodyContains({
      message: 'User with this email or username already exists',
    })
  })

  test('GET /api/users/trashed should return only soft-deleted users', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser('admin17', 'admin')
    const activeUser = await User.create(makeUser('active'))
    const deletedUser1 = await User.create(makeUser('deleted1'))
    await deletedUser1.softDelete()

    const deletedUser2 = await User.create(makeUser('deleted2'))
    await deletedUser2.softDelete()

    const response = await client.get('/api/users/trashed').bearerToken(token)

    response.assertStatus(200)

    const trashedUsers = response.body().users
    assert.notExists(trashedUsers.find((u: any) => u.id === activeUser.id))
    assert.exists(trashedUsers.find((u: any) => u.id === deletedUser1.id))
    assert.exists(trashedUsers.find((u: any) => u.id === deletedUser2.id))
  })

  test('POST /api/users/:id/restore should restore a soft-deleted user', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser('admin18', 'admin')
    const user = await User.create(makeUser('restore'))

    await user.softDelete()
    assert.isNotNull(user.deletedAt)

    const response = await client.post(`/api/users/${user.id}/restore`).bearerToken(token)

    response.assertStatus(200)
    response.assertBodyContains({
      message: `User with ID: ${user.id} restored successfully`,
    })

    await user.refresh()
    assert.isNull(user.deletedAt)

    const listResponse = await client.get('/api/users').bearerToken(token)
    const users = listResponse.body().users
    assert.exists(users.find((u: any) => u.id === user.id))
  })

  test('POST /api/users/:id/restore should return 404 for non-deleted user', async ({ client }) => {
    const { token } = await createAuthenticatedUser('admin19', 'admin')
    const user = await User.create(makeUser('notdeleted'))

    const response = await client.post(`/api/users/${user.id}/restore`).bearerToken(token)

    response.assertStatus(404)
    response.assertBodyContains({ message: 'Deleted user not found' })
  })

  test('POST /api/users/:id/restore should return 404 for non-existent user', async ({
    client,
  }) => {
    const { token } = await createAuthenticatedUser('admin20', 'admin')
    const response = await client.post('/api/users/non-existent-id/restore').bearerToken(token)

    response.assertStatus(404)
    response.assertBodyContains({ message: 'Deleted user not found' })
  })
})

test.group('UsersController - Integration Scenarios', (group) => {
  deleteUser(group)

  test('Complete user lifecycle (create -> update -> delete -> restore)', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser('admin21', 'admin')
    const userId = user.id

    let response = await client.get('/api/users').bearerToken(token)
    let users = response.body().users
    assert.exists(users.find((u: any) => u.id === userId))

    response = await client.patch(`/api/users/${userId}`).bearerToken(token).json({
      firstName: 'Updated',
      lastName: 'Lifecycle',
    })
    response.assertStatus(200)
    assert.equal(response.body().user.firstName, 'Updated')

    response = await client.delete(`/api/users/${userId}`).bearerToken(token)
    response.assertStatus(200)

    const adminToken2 = await createAuthenticatedUser('admin22', 'admin')

    response = await client.get('/api/users').bearerToken(adminToken2.token)
    users = response.body().users
    assert.notExists(users.find((u: any) => u.id === userId))

    response = await client.get('/api/users/trashed').bearerToken(adminToken2.token)
    const trashedUsers = response.body().users
    assert.exists(trashedUsers.find((u: any) => u.id === userId))

    response = await client.post(`/api/users/${userId}/restore`).bearerToken(adminToken2.token)
    response.assertStatus(200)

    response = await client.get('/api/users').bearerToken(adminToken2.token)
    users = response.body().users
    assert.exists(users.find((u: any) => u.id === userId))

    response = await client.get('/api/users/trashed').bearerToken(adminToken2.token)
    const trashedUsersAfterRestore = response.body().users
    assert.notExists(trashedUsersAfterRestore.find((u: any) => u.id === userId))
  })

  test('Multiple users operations', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('admin23', 'admin')
    const user1Data = makeUser('multi1')
    const user2Data = makeUser('multi2')
    const user3Data = makeUser('multi3')

    await client.post('/api/users').bearerToken(token).json(user1Data)
    await client.post('/api/users').bearerToken(token).json(user2Data)
    await client.post('/api/users').bearerToken(token).json(user3Data)

    let response = await client.get('/api/users').bearerToken(token)
    let users = response.body().users
    assert.isAtLeast(users.length, 3)

    const user2 = await User.query().where('email', user2Data.email).firstOrFail()
    await user2.softDelete()

    response = await client.get('/api/users/trashed').bearerToken(token)
    const trashedUsers = response.body().users
    assert.isAtLeast(trashedUsers.length, 1)
    assert.exists(trashedUsers.find((u: any) => u.id === user2.id))
  })
})

test.group('UsersController - Edge Cases Coverage', (group) => {
  deleteUser(group)

  test('POST /api/users should handle service errors without status gracefully', async ({
    client,
    assert,
  }) => {
    const userData = makeUser('error')
    const response = await client.post('/api/users').json({
      ...userData,
      email: 'x'.repeat(300) + '@example.com',
    })

    assert.isAtLeast(response.status(), 400)
  })

  test('PATCH /api/users/:id should handle service errors without status gracefully', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser('admin24', 'admin')
    const user = await User.create(makeUser('patch'))

    const response = await client
      .patch(`/api/users/${user.id}`)
      .bearerToken(token)
      .json({
        firstName: 'x'.repeat(300),
      })

    assert.isAtLeast(response.status(), 400)
  })
})
