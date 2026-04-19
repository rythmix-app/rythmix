import { test } from '@japa/runner'
import User from '#models/user'
import { UserService } from '#services/user_service'
import { deleteUser } from '#tests/utils/user_helpers'

test.group('UserService - CRUD Operations', (group) => {
  let userService: UserService

  deleteUser(group)

  group.each.setup(async () => {
    userService = new UserService()
  })

  test('createUser should create a new user successfully', async ({ assert }) => {
    const timestamp = Date.now()
    const result = await userService.createUser({
      username: `create_new_${timestamp}`,
      email: `create_new_${timestamp}@example.com`,
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
    })

    assert.instanceOf(result, User)
    if (result instanceof User) {
      assert.equal(result.username, `create_new_${timestamp}`)
      assert.equal(result.email, `create_new_${timestamp}@example.com`)
      assert.equal(result.firstName, 'New')
      assert.equal(result.lastName, 'User')
      assert.isNotTrue(!!result.deletedAt)
    }
  })

  test('createUser should not allow duplicate email', async ({ assert }) => {
    const timestamp = Date.now()
    await User.create({
      username: `existing_${timestamp}`,
      email: `duplicate_${timestamp}@example.com`,
      password: 'password123',
    })

    const result = await userService.createUser({
      username: `new_${timestamp}`,
      email: `duplicate_${timestamp}@example.com`,
      password: 'password123',
    })

    assert.notInstanceOf(result, User)
    if (!(result instanceof User)) {
      assert.equal(result.error, 'User with this email or username already exists')
      assert.equal(result.status, 409)
    }
  })

  test('createUser should not allow duplicate username', async ({ assert }) => {
    const timestamp = Date.now()
    await User.create({
      username: `duplicate_user_${timestamp}`,
      email: `email1_${timestamp}@example.com`,
      password: 'password123',
    })

    const result = await userService.createUser({
      username: `duplicate_user_${timestamp}`,
      email: `email2_${timestamp}@example.com`,
      password: 'password123',
    })

    assert.notInstanceOf(result, User)
    if (!(result instanceof User)) {
      assert.equal(result.error, 'User with this email or username already exists')
      assert.equal(result.status, 409)
    }
  })

  test('getAll should return all non-deleted users', async ({ assert }) => {
    const timestamp = Date.now()
    const user1 = await User.create({
      username: `getall_1_${timestamp}`,
      email: `getall_1_${timestamp}@example.com`,
      password: 'password123',
    })

    const user2 = await User.create({
      username: `getall_2_${timestamp}`,
      email: `getall_2_${timestamp}@example.com`,
      password: 'password123',
    })

    const users = await userService.getAll()

    assert.isAtLeast(users.length, 2)
    assert.exists(users.find((u) => u.id === user1.id))
    assert.exists(users.find((u) => u.id === user2.id))
  })

  test('getById should return user when found', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      username: `getbyid_${timestamp}`,
      email: `getbyid_${timestamp}@example.com`,
      password: 'password123',
    })

    const foundUser = await userService.getById(user.id)

    assert.isNotNull(foundUser)
    assert.equal(foundUser?.id, user.id)
    assert.equal(foundUser?.username, `getbyid_${timestamp}`)
  })

  test('getById should return null when user not found', async ({ assert }) => {
    const notFoundUser = await userService.getById('non-existent-id')
    assert.isNull(notFoundUser)
  })

  test('updateUser should update user successfully', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      username: `update_${timestamp}`,
      email: `update_${timestamp}@example.com`,
      password: 'password123',
      firstName: 'Original',
    })

    const result = await userService.updateUser(user.id, {
      firstName: 'Updated',
      lastName: 'Name',
    })

    assert.instanceOf(result, User)
    if (result instanceof User) {
      assert.equal(result.firstName, 'Updated')
      assert.equal(result.lastName, 'Name')
    }
  })

  test('updateUser should return error when user not found', async ({ assert }) => {
    const result = await userService.updateUser('non-existent-id', { firstName: 'Test' })

    assert.notInstanceOf(result, User)
    if (!(result instanceof User)) {
      assert.equal(result.error, 'User not found')
      assert.equal(result.status, 404)
    }
  })
})

test.group('UserService - Soft Delete Operations', (group) => {
  let userService: UserService

  deleteUser(group)

  group.each.setup(async () => {
    userService = new UserService()
  })

  test('deleteUser should soft delete the user', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      username: `delete_${timestamp}`,
      email: `delete_${timestamp}@example.com`,
      password: 'password123',
    })

    const result = await userService.deleteUser(user.id, user)

    assert.equal(result.message, `User with ID: ${user.id} deleted successfully`)

    await user.refresh()
    assert.isNotNull(user.deletedAt)

    const users = await userService.getAll()
    assert.notExists(users.find((u) => u.id === user.id))
  })

  test('deleteUser should return error when user not found', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      username: `auth_user_${timestamp}`,
      email: `auth_user_${timestamp}@example.com`,
      password: 'password123',
    })

    const result = await userService.deleteUser('non-existent-id', user)

    assert.equal(result.error, 'User not found')
    assert.equal(result.status, 404)
  })

  test('deleteUser should return error when user lacks permission', async ({ assert }) => {
    const timestamp = Date.now()
    const user1 = await User.create({
      username: `user1_${timestamp}`,
      email: `user1_${timestamp}@example.com`,
      password: 'password123',
    })

    const user2 = await User.create({
      username: `user2_${timestamp}`,
      email: `user2_${timestamp}@example.com`,
      password: 'password123',
    })

    const result = await userService.deleteUser(user2.id, user1)

    assert.equal(result.error, 'You do not have permission to delete this user')
    assert.equal(result.status, 403)
  })

  test('restoreUser should restore a soft-deleted user', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      username: `restore_${timestamp}`,
      email: `restore_${timestamp}@example.com`,
      password: 'password123',
    })

    await user.softDelete()
    assert.isNotNull(user.deletedAt)

    const result = await userService.restoreUser(user.id)

    assert.equal(result.message, `User with ID: ${user.id} restored successfully`)

    await user.refresh()
    assert.isNull(user.deletedAt)

    const users = await userService.getAll()
    assert.exists(users.find((u) => u.id === user.id))
  })

  test('restoreUser should return error when deleted user not found', async ({ assert }) => {
    const result = await userService.restoreUser('non-existent-id')

    assert.equal(result.error, 'Deleted user not found')
    assert.equal(result.status, 404)
  })

  test('restoreUser should return error when user is not deleted', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      username: `not_deleted_${timestamp}`,
      email: `not_deleted_${timestamp}@example.com`,
      password: 'password123',
    })

    const result = await userService.restoreUser(user.id)

    assert.equal(result.error, 'Deleted user not found')
    assert.equal(result.status, 404)
  })

  test('getAll should not return soft-deleted users', async ({ assert }) => {
    const timestamp = Date.now()
    const activeUser = await User.create({
      username: `active_${timestamp}`,
      email: `active_${timestamp}@example.com`,
      password: 'password123',
    })

    const deletedUser = await User.create({
      username: `deleted_${timestamp}`,
      email: `deleted_${timestamp}@example.com`,
      password: 'password123',
    })
    await deletedUser.softDelete()

    const users = await userService.getAll()

    assert.exists(users.find((u) => u.id === activeUser.id))
    assert.notExists(users.find((u) => u.id === deletedUser.id))
  })

  test('getById should not return soft-deleted users', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      username: `test_${timestamp}`,
      email: `test_${timestamp}@example.com`,
      password: 'password123',
    })

    const foundUser = await userService.getById(user.id)
    assert.isNotNull(foundUser)

    await user.softDelete()

    const notFoundUser = await userService.getById(user.id)
    assert.isNull(notFoundUser)
  })

  test('updateUser should not update soft-deleted users', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      username: `update_deleted_${timestamp}`,
      email: `update_deleted_${timestamp}@example.com`,
      password: 'password123',
      firstName: 'Test',
    })

    await user.softDelete()

    const result = await userService.updateUser(user.id, { firstName: 'Updated' })

    assert.notInstanceOf(result, User)
    if (!(result instanceof User)) {
      assert.equal(result.error, 'User not found')
      assert.equal(result.status, 404)
    }
  })

  test('getAllWithTrashed should return all users including soft-deleted', async ({ assert }) => {
    const timestamp = Date.now()
    const activeUser = await User.create({
      username: `with_trash_active_${timestamp}`,
      email: `with_trash_active_${timestamp}@example.com`,
      password: 'password123',
    })

    const deletedUser = await User.create({
      username: `with_trash_deleted_${timestamp}`,
      email: `with_trash_deleted_${timestamp}@example.com`,
      password: 'password123',
    })
    await deletedUser.softDelete()

    const users = await userService.getAllWithTrashed()

    assert.exists(users.find((u) => u.id === activeUser.id))
    assert.exists(users.find((u) => u.id === deletedUser.id))
  })

  test('getOnlyTrashed should return only soft-deleted users', async ({ assert }) => {
    const timestamp = Date.now()
    const activeUser = await User.create({
      username: `only_trash_active_${timestamp}`,
      email: `only_trash_active_${timestamp}@example.com`,
      password: 'password123',
    })

    const deletedUser = await User.create({
      username: `only_trash_deleted_${timestamp}`,
      email: `only_trash_deleted_${timestamp}@example.com`,
      password: 'password123',
    })
    await deletedUser.softDelete()

    const trashedUsers = await userService.getOnlyTrashed()

    assert.notExists(trashedUsers.find((u) => u.id === activeUser.id))
    assert.exists(trashedUsers.find((u) => u.id === deletedUser.id))
  })
})

test.group('UserService - Edge Cases', (group) => {
  let userService: UserService

  deleteUser(group)

  group.each.setup(async () => {
    userService = new UserService()
  })

  test('createUser should respect database unique constraint for soft-deleted user email', async ({
    assert,
  }) => {
    const timestamp = Date.now()
    const deletedUser = await User.create({
      username: `deleted_${timestamp}`,
      email: `unique_${timestamp}@example.com`,
      password: 'password123',
    })
    await deletedUser.softDelete()

    try {
      await userService.createUser({
        username: `new_${timestamp}`,
        email: `unique_${timestamp}@example.com`,
        password: 'password123',
      })
      assert.fail('Should have thrown a unique constraint error')
    } catch (error: any) {
      assert.include(error.message, 'unique')
    }
  })

  test('createUser should ignore soft-deleted users when checking duplicates', async ({
    assert,
  }) => {
    const timestamp = Date.now()
    const deletedUser = await User.create({
      username: `deleted_check_${timestamp}`,
      email: `deleted_check_${timestamp}@example.com`,
      password: 'password123',
    })
    await deletedUser.softDelete()

    try {
      await userService.createUser({
        username: `new_user_${timestamp}`,
        email: `deleted_check_${timestamp}@example.com`,
        password: 'password123',
      })
      assert.fail('Should have thrown a unique constraint error')
    } catch (error: any) {
      assert.include(error.message, 'unique')
    }
  })

  test('updateUser should handle duplicate email/username with unique constraint error', async ({
    assert,
  }) => {
    const timestamp = Date.now()

    await User.create({
      username: `user1_${timestamp}`,
      email: `user1_${timestamp}@example.com`,
      password: 'password123',
    })

    const user2 = await User.create({
      username: `user2_${timestamp}`,
      email: `user2_${timestamp}@example.com`,
      password: 'password123',
    })

    const result = await userService.updateUser(user2.id, {
      email: `user1_${timestamp}@example.com`,
    })

    assert.notInstanceOf(result, User)
    if (!(result instanceof User)) {
      assert.equal(result.error, 'User with this email or username already exists')
      assert.equal(result.status, 409)
    }
  })

  test('updateUser should handle database errors gracefully by re-throwing', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      username: `test_error_${timestamp}`,
      email: `test_error_${timestamp}@example.com`,
      password: 'password123',
    })

    // Mock the save method to throw an unknown database error
    const originalSave = user.save.bind(user)
    user.save = async () => {
      const error: any = new Error('Unknown database error')
      error.code = 'UNKNOWN_ERROR'
      throw error
    }

    // Mock the query to return our mocked user
    const originalQuery = User.query
    User.query = () => {
      return {
        where: () => ({
          whereNull: () => ({
            first: async () => user,
          }),
        }),
      } as any
    }

    try {
      await userService.updateUser(user.id, { firstName: 'Test' })
      assert.fail('Should have thrown an error')
    } catch (error: any) {
      assert.equal(error.message, 'Unknown database error')
    } finally {
      // Restore original methods
      user.save = originalSave
      User.query = originalQuery
    }
  })

  test('createUser should handle database errors gracefully by re-throwing', async ({ assert }) => {
    // Mock User.create to throw an unknown database error
    const originalCreate = User.create
    User.create = (async () => {
      const error: any = new Error('Unknown database error')
      error.code = 'UNKNOWN_ERROR'
      throw error
    }) as typeof User.create

    try {
      const timestamp = Date.now()
      await userService.createUser({
        username: `error_test_${timestamp}`,
        email: `error_test_${timestamp}@example.com`,
        password: 'password123',
      })
      assert.fail('Should have thrown an error')
    } catch (error: any) {
      assert.equal(error.message, 'Unknown database error')
    } finally {
      // Restore original create method
      User.create = originalCreate
    }
  })
})
