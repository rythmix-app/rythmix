import User from '#models/user'

export class UserService {
  public async getAll() {
    return User.query().whereNull('deleted_at')
  }

  public async getById(userId: string) {
    return User.query().where('id', userId).whereNull('deleted_at').first()
  }

  public async updateUser(userId: string, payload: Partial<User>) {
    const user = await User.query().where('id', userId).whereNull('deleted_at').first()
    if (!user) {
      return {
        error: 'User not found',
        status: 404,
      }
    }
    user.merge(payload)
    try {
      await user.save()
      return user
    } catch (error: any) {
      // Handle database constraint errors (unique constraint, value too long, etc.)
      if (error.code === '23505') {
        // Unique constraint violation
        return {
          error: 'User with this email or username already exists',
          status: 409,
        }
      }
      if (error.code === '22001') {
        // String data right truncation / value too long
        return {
          error: 'One or more fields exceed maximum length',
          status: 400,
        }
      }
      // Re-throw other database errors
      throw error
    }
  }

  public async deleteUser(userId: string, user: User) {
    const userToDelete = await User.query().where('id', userId).whereNull('deleted_at').first()
    if (!userToDelete) {
      return {
        error: 'User not found',
        status: 404,
      }
    }
    if (user.id !== userToDelete.id) {
      return {
        error: 'You do not have permission to delete this user',
        status: 403,
      }
    }
    await userToDelete.softDelete()
    return { message: `User with ID: ${userId} deleted successfully` }
  }

  public async restoreUser(userId: string) {
    const userToRestore = await User.query().whereNotNull('deleted_at').where('id', userId).first()
    if (!userToRestore) {
      return {
        error: 'Deleted user not found',
        status: 404,
      }
    }
    await userToRestore.restore()
    return { message: `User with ID: ${userId} restored successfully` }
  }

  public async getAllWithTrashed() {
    return User.query()
  }

  public async getOnlyTrashed() {
    return User.query().whereNotNull('deleted_at')
  }

  public async createUser(payload: {
    firstName?: string
    lastName?: string
    username: string
    email: string
    password: string
  }) {
    const existingUser = await User.query()
      .where((query) => {
        query.where('email', payload.email).orWhere('username', payload.username)
      })
      .whereNull('deleted_at')
      .first()

    if (existingUser) {
      return {
        error: 'User with this email or username already exists',
        status: 409,
      }
    }

    try {
      const user = await User.create(payload)
      return user
    } catch (error: any) {
      // Handle database constraint errors (unique constraint, value too long, etc.)
      if (error.code === '23505') {
        // Unique constraint violation
        return {
          error: 'User with this email or username already exists',
          status: 409,
        }
      }
      if (error.code === '22001') {
        // String data right truncation / value too long
        return {
          error: 'One or more fields exceed maximum length',
          status: 400,
        }
      }
      // Re-throw other database errors
      throw error
    }
  }
}
