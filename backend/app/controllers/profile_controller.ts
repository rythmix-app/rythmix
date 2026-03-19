import type { HttpContext } from '@adonisjs/core/http'
import { UserService } from '#services/user_service'
import User from '#models/user'
import { inject } from '@adonisjs/core'
import { ApiOperation, ApiResponse, ApiSecurity, ApiBody } from '@foadonis/openapi/decorators'

@inject()
export default class ProfileController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieve the authenticated user profile',
  })
  @ApiSecurity('bearerAuth')
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  public async show({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const profile = await this.userService.getById(user.id)
    if (!profile) {
      return response.status(404).json({ message: 'User not found' })
    }
    return response.json({ user: profile })
  }

  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Update the authenticated user profile (firstName, lastName, username)',
  })
  @ApiSecurity('bearerAuth')
  @ApiBody({
    description: 'Profile data to update',
    required: true,
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        username: { type: 'string', minLength: 3, example: 'johndoe' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Username already taken' })
  public async update({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const result = await this.userService.updateUser(
      user.id,
      request.only(['firstName', 'lastName', 'username'])
    )
    if (!(result instanceof User)) {
      return response.status(result.status || 500).json({ message: result.error })
    }
    return response.json({ user: result })
  }
}
