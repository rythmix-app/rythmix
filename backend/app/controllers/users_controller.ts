import type { HttpContext } from '@adonisjs/core/http'
import { UserService } from '#services/user_service'
import User from '#models/user'
import { inject } from '@adonisjs/core'
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiSecurity, ApiBody } from '@foadonis/openapi/decorators'

@inject()
@ApiTags('Users')
export default class UsersController {
  constructor(private userService: UserService) {}

  @ApiOperation({ summary: 'List all users', description: 'Get a list of all users in the system' })
  @ApiResponse({ status: 200, description: 'List of users retrieved successfully' })
  public async index({ response }: HttpContext) {
    const users = await this.userService.getAll()
    return response.json({ users: users })
  }

  @ApiOperation({ summary: 'Create a new user', description: 'Create a new user account' })
  @ApiBody({
    description: 'User data',
    required: true,
    schema: {
      type: 'object',
      required: ['email', 'username', 'password'],
      properties: {
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        username: { type: 'string', minLength: 3, example: 'johndoe' },
        email: { type: 'string', format: 'email', example: 'john@example.com' },
        password: { type: 'string', format: 'password', minLength: 8, example: 'SecurePass123!' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 500, description: 'Error creating user' })
  public async create({ request, response }: HttpContext) {
    const result = await this.userService.createUser(
      request.only(['firstName', 'lastName', 'username', 'email', 'password'])
    )
    if (!(result instanceof User)) {
      return response.status(result.status || 500).json({ message: result.error })
    }
    return response.status(201).json({ user: result })
  }

  @ApiOperation({ summary: 'Get user by ID', description: 'Retrieve a specific user by their ID' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)', required: true })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  public async show({ params, response }: HttpContext) {
    const userId = params.id
    const user = await this.userService.getById(userId)
    if (!user) {
      return response.status(404).json({ message: 'User not found' })
    }
    return response.json({ user })
  }

  @ApiOperation({ summary: 'Update user', description: 'Update user information (role, firstName, lastName)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)', required: true })
  @ApiBody({
    description: 'User data to update',
    required: true,
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 500, description: 'Error updating user' })
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

  @ApiOperation({ summary: 'Soft delete user', description: 'Soft delete a user (requires authentication)' })
  @ApiSecurity('bearerAuth')
  @ApiParam({ name: 'id', description: 'User ID (UUID)', required: true })
  @ApiResponse({ status: 200, description: 'User soft deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Cannot delete your own account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  public async delete({ params, response, auth }: HttpContext) {
    const userId = params.id
    const result = await this.userService.deleteUser(userId, auth.user!)
    if (result.error) {
      return response.status(result.status).json({ message: result.error })
    }
    return response.json({ message: `User with ID: ${userId} soft deleted successfully` })
  }

  @ApiOperation({ summary: 'Restore soft-deleted user', description: 'Restore a previously soft-deleted user' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)', required: true })
  @ApiResponse({ status: 200, description: 'User restored successfully' })
  @ApiResponse({ status: 404, description: 'User not found or not deleted' })
  public async restore({ params, response }: HttpContext) {
    const userId = params.id
    const result = await this.userService.restoreUser(userId)
    if (result.error) {
      return response.status(result.status).json({ message: result.error })
    }
    return response.json({ message: `User with ID: ${userId} restored successfully` })
  }

  @ApiOperation({ summary: 'List soft-deleted users', description: 'Get a list of all soft-deleted users' })
  @ApiResponse({ status: 200, description: 'List of soft-deleted users retrieved successfully' })
  public async trashed({ response }: HttpContext) {
    const users = await this.userService.getOnlyTrashed()
    return response.json({ users })
  }
}
