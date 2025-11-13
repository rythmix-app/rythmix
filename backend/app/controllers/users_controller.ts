import type { HttpContext } from '@adonisjs/core/http'
import { UserService } from '#services/user_service'
import User from '#models/user'
import { inject } from '@adonisjs/core'

@inject()
export default class UsersController {
  constructor(private userService: UserService) {}

  public async index({ response }: HttpContext) {
    const users = await this.userService.getAll()
    return response.json({ users: users })
  }

  public async create({ request, response }: HttpContext) {
    const result = await this.userService.createUser(
      request.only(['firstName', 'lastName', 'username', 'email', 'password'])
    )
    if (!(result instanceof User)) {
      return response.status(result.status || 500).json({ message: result.error })
    }
    return response.status(201).json({ user: result })
  }

  public async show({ params, response }: HttpContext) {
    const userId = params.id
    const user = await this.userService.getById(userId)
    if (!user) {
      return response.status(404).json({ message: 'User not found' })
    }
    return response.json({ user })
  }

  public async update({ params, request, response }: HttpContext) {
    const userId = params.id
    const result = await this.userService.updateUser(
      userId,
      request.only(['role', 'firstName', 'lastName'])
    )
    if (!(result instanceof User)) {
      return response.status(result.status || 500).json({ message: result.error })
    }
    return response.json({ user: result })
  }

  public async delete({ params, response, auth }: HttpContext) {
    const userId = params.id
    const result = await this.userService.deleteUser(userId, auth.user!)
    if (result.error) {
      return response.status(result.status).json({ message: result.error })
    }
    return response.json({ message: `User with ID: ${userId} soft deleted successfully` })
  }

  public async restore({ params, response }: HttpContext) {
    const userId = params.id
    const result = await this.userService.restoreUser(userId)
    if (result.error) {
      return response.status(result.status).json({ message: result.error })
    }
    return response.json({ message: `User with ID: ${userId} restored successfully` })
  }

  public async trashed({ response }: HttpContext) {
    const users = await this.userService.getOnlyTrashed()
    return response.json({ users })
  }
}
