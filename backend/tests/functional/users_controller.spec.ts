import { test } from '@japa/runner'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'

const makeUser = (prefix: string) => {
  const timestamp = Date.now() + Math.random()
  return {
    username: `${prefix}_${timestamp}`,
    email: `${prefix}_${timestamp}@example.com`,
    password: 'password123',
  }
}

test.group('UsersController - CRUD Operations', (group) => {
  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    await testUtils.db().truncate()
  })

  group.teardown(async () => {
    await testUtils.db().truncate()
  })

  test('GET /api/users should return list of users', async ({ client, assert }) => {
    await User.create(makeUser('user1'))
    await User.create(makeUser('user2'))

    const response = await client.get('/api/users')

    response.assertStatus(200)
    response.assertBodyContains({ message: 'List of users' })

    const users = response.body().data
    assert.isAtLeast(users.length, 2)
  })

  test('GET /api/users/:id should return user details', async ({ client, assert }) => {
    const user = await User.create(makeUser('getbyid'))

    const response = await client.get(`/api/users/${user.id}`)

    response.assertStatus(200)
    response.assertBodyContains({
      message: `User details for ID: ${user.id}`,
    })

    const returnedUser = response.body().user
    assert.equal(returnedUser.id, user.id)
    assert.equal(returnedUser.username, user.username)
    assert.equal(returnedUser.email, user.email)
    assert.notExists(returnedUser.password)
  })

  test('GET /api/users/:id should return 404 for non-existent user', async ({ client }) => {
    const response = await client.get('/api/users/non-existent-id')

    response.assertStatus(404)
    response.assertBodyContains({ message: 'User not found' })
  })

  test('POST /api/users should create a new user', async ({ client, assert }) => {
    const userData = makeUser('newuser')
    const response = await client.post('/api/users').json({
      ...userData,
      firstName: 'New',
      lastName: 'User',
    })

    response.assertStatus(201)
    response.assertBodyContains({ message: 'User created successfully' })

    const createdUser = response.body().data
    assert.equal(createdUser.username, userData.username)
    assert.equal(createdUser.email, userData.email)
    assert.equal(createdUser.firstName, 'New')
    assert.equal(createdUser.lastName, 'User')
    assert.notExists(createdUser.password)
  })

  test('POST /api/users should create user with minimal data', async ({ client, assert }) => {
    const userData = makeUser('minimal')
    const response = await client.post('/api/users').json(userData)

    response.assertStatus(201)

    const createdUser = response.body().data
    assert.equal(createdUser.username, userData.username)
    assert.equal(createdUser.email, userData.email)
  })

  test('POST /api/users should return 409 for duplicate email', async ({ client }) => {
    const existing = makeUser('existing')
    await User.create(existing)

    const response = await client.post('/api/users').json({
      ...makeUser('new'),
      email: existing.email,
    })

    response.assertStatus(409)
    response.assertBodyContains({
      message: 'User with this email or username already exists',
    })
  })

  test('POST /api/users should return 409 for duplicate username', async ({ client }) => {
    const existing = makeUser('existing')
    await User.create(existing)

    const response = await client.post('/api/users').json({
      ...makeUser('new'),
      username: existing.username,
    })

    response.assertStatus(409)
    response.assertBodyContains({
      message: 'User with this email or username already exists',
    })
  })

  test('PATCH /api/users/:id should update user', async ({ client, assert }) => {
    const user = await User.create({ ...makeUser('patch'), firstName: 'Original' })

    const response = await client.patch(`/api/users/${user.id}`).json({
      firstName: 'Updated',
      lastName: 'Name',
    })

    response.assertStatus(200)
    response.assertBodyContains({ message: 'User updated successfully' })

    const updatedUser = response.body().result
    assert.equal(updatedUser.firstName, 'Updated')
    assert.equal(updatedUser.lastName, 'Name')
  })

  test('PATCH /api/users/:id should return 404 for non-existent user', async ({ client }) => {
    const response = await client.patch('/api/users/non-existent-id').json({
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
    const user = await User.create(makeUser('delete'))

    const token = await User.accessTokens.create(user)

    const response = await client
      .delete(`/api/users/${user.id}`)
      .bearerToken(token.value!.release())

    response.assertStatus(200)
    response.assertBodyContains({
      message: `User with ID: ${user.id} soft deleted successfully`,
    })

    await user.refresh()
    assert.isNotNull(user.deletedAt)
  })

  test('DELETE /api/users/:id should return 403 when deleting another user', async ({ client }) => {
    const user1 = await User.create(makeUser('user1'))
    const user2 = await User.create(makeUser('user2'))

    const token = await User.accessTokens.create(user1)

    const response = await client
      .delete(`/api/users/${user2.id}`)
      .bearerToken(token.value!.release())

    response.assertStatus(403)
    response.assertBodyContains({
      message: 'You do not have permission to delete this user',
    })
  })

  test('DELETE /api/users/:id should return 404 for non-existent user', async ({ client }) => {
    const user = await User.create(makeUser('auth'))
    const token = await User.accessTokens.create(user)

    const response = await client
      .delete('/api/users/non-existent-id')
      .bearerToken(token.value!.release())

    response.assertStatus(404)
    response.assertBodyContains({ message: 'User not found' })
  })
})

test.group('UsersController - Soft Delete Features', (group) => {
  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    await testUtils.db().truncate()
  })

  group.teardown(async () => {
    await testUtils.db().truncate()
  })

  test('GET /api/users should not return soft-deleted users', async ({ client, assert }) => {
    await User.create(makeUser('active1'))
    await User.create(makeUser('active2'))

    const deletedUser = await User.create(makeUser('deleted'))
    await deletedUser.softDelete()

    const response = await client.get('/api/users')

    response.assertStatus(200)

    const users = response.body().data
    assert.notExists(users.find((u: any) => u.id === deletedUser.id))
  })

  test('GET /api/users/:id should return 404 for soft-deleted user', async ({ client }) => {
    const user = await User.create(makeUser('getbyid'))

    let response = await client.get(`/api/users/${user.id}`)
    response.assertStatus(200)

    await user.softDelete()

    response = await client.get(`/api/users/${user.id}`)
    response.assertStatus(404)
    response.assertBodyContains({ message: 'User not found' })
  })

  test('PATCH /api/users/:id should not update soft-deleted users', async ({ client }) => {
    const user = await User.create({ ...makeUser('patch'), firstName: 'Test' })

    await user.softDelete()

    const response = await client.patch(`/api/users/${user.id}`).json({
      firstName: 'Updated',
    })

    response.assertStatus(404)
    response.assertBodyContains({ message: 'User not found' })
  })

  test('POST /api/users should not allow reusing email from soft-deleted user', async ({
    client,
  }) => {
    const deletedData = makeUser('olduser')
    const deletedUser = await User.create(deletedData)
    await deletedUser.softDelete()

    const newUserData = makeUser('newuser')
    const response = await client.post('/api/users').json({
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
    const activeUser = await User.create(makeUser('active'))
    const deletedUser1 = await User.create(makeUser('deleted1'))
    await deletedUser1.softDelete()

    const deletedUser2 = await User.create(makeUser('deleted2'))
    await deletedUser2.softDelete()

    const response = await client.get('/api/users/trashed')

    response.assertStatus(200)
    response.assertBodyContains({ message: 'List of soft deleted users' })

    const trashedUsers = response.body().data
    assert.notExists(trashedUsers.find((u: any) => u.id === activeUser.id))
    assert.exists(trashedUsers.find((u: any) => u.id === deletedUser1.id))
    assert.exists(trashedUsers.find((u: any) => u.id === deletedUser2.id))
  })

  test('POST /api/users/:id/restore should restore a soft-deleted user', async ({
    client,
    assert,
  }) => {
    const user = await User.create(makeUser('restore'))

    await user.softDelete()
    assert.isNotNull(user.deletedAt)

    const response = await client.post(`/api/users/${user.id}/restore`)

    response.assertStatus(200)
    response.assertBodyContains({
      message: `User with ID: ${user.id} restored successfully`,
    })

    await user.refresh()
    assert.isNull(user.deletedAt)

    const listResponse = await client.get('/api/users')
    const users = listResponse.body().data
    assert.exists(users.find((u: any) => u.id === user.id))
  })

  test('POST /api/users/:id/restore should return 404 for non-deleted user', async ({ client }) => {
    const user = await User.create(makeUser('notdeleted'))

    const response = await client.post(`/api/users/${user.id}/restore`)

    response.assertStatus(404)
    response.assertBodyContains({ message: 'Deleted user not found' })
  })

  test('POST /api/users/:id/restore should return 404 for non-existent user', async ({
    client,
  }) => {
    const response = await client.post('/api/users/non-existent-id/restore')

    response.assertStatus(404)
    response.assertBodyContains({ message: 'Deleted user not found' })
  })
})

test.group('UsersController - Integration Scenarios', (group) => {
  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    await testUtils.db().truncate()
  })

  group.teardown(async () => {
    await testUtils.db().truncate()
  })

  test('Complete user lifecycle (create -> update -> delete -> restore)', async ({
    client,
    assert,
  }) => {
    const lifecycleData = makeUser('lifecycle')
    let response = await client.post('/api/users').json({
      ...lifecycleData,
      firstName: 'Lifecycle',
    })

    response.assertStatus(201)
    const userId = response.body().data.id

    response = await client.get('/api/users')
    let users = response.body().data
    assert.exists(users.find((u: any) => u.id === userId))

    response = await client.patch(`/api/users/${userId}`).json({
      firstName: 'Updated',
      lastName: 'Lifecycle',
    })
    response.assertStatus(200)
    assert.equal(response.body().result.firstName, 'Updated')

    const user = await User.findOrFail(userId)
    const token = await User.accessTokens.create(user)

    response = await client.delete(`/api/users/${userId}`).bearerToken(token.value!.release())
    response.assertStatus(200)

    response = await client.get('/api/users')
    users = response.body().data
    assert.notExists(users.find((u: any) => u.id === userId))

    response = await client.get('/api/users/trashed')
    const trashedUsers = response.body().data
    assert.exists(trashedUsers.find((u: any) => u.id === userId))

    response = await client.post(`/api/users/${userId}/restore`)
    response.assertStatus(200)

    response = await client.get('/api/users')
    users = response.body().data
    assert.exists(users.find((u: any) => u.id === userId))

    response = await client.get('/api/users/trashed')
    const trashedUsersAfterRestore = response.body().data
    assert.notExists(trashedUsersAfterRestore.find((u: any) => u.id === userId))
  })

  test('Multiple users operations', async ({ client, assert }) => {
    const user1Data = makeUser('multi1')
    const user2Data = makeUser('multi2')
    const user3Data = makeUser('multi3')

    await client.post('/api/users').json(user1Data)
    await client.post('/api/users').json(user2Data)
    await client.post('/api/users').json(user3Data)

    let response = await client.get('/api/users')
    let users = response.body().data
    assert.isAtLeast(users.length, 3)

    const user2 = await User.query().where('email', user2Data.email).firstOrFail()
    await user2.softDelete()

    response = await client.get('/api/users/trashed')
    const trashedUsers = response.body().data
    assert.isAtLeast(trashedUsers.length, 1)
    assert.exists(trashedUsers.find((u: any) => u.id === user2.id))
  })
})

test.group('UsersController - Edge Cases Coverage', (group) => {
  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    await testUtils.db().truncate()
  })

  group.teardown(async () => {
    await testUtils.db().truncate()
  })

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
    const user = await User.create(makeUser('patch'))

    const response = await client.patch(`/api/users/${user.id}`).json({
      firstName: 'x'.repeat(300),
    })

    assert.isAtLeast(response.status(), 400)
  })
})
