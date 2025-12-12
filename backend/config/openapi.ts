import { defineConfig } from '@foadonis/openapi'
import env from '#start/env'

export default defineConfig({
  /**
   * User interface integration
   */
  ui: 'swagger',

  /**
   * Base OpenAPI document configuration
   */
  document: {
    info: {
      title: 'Rythmix API',
      version: '1.0.0',
      description: "API pour l'application musicale Rythmix",
    },
    servers: [
      {
        url:
          env.get('NODE_ENV') === 'production'
            ? 'https://api.yourdomain.com'
            : 'https://api.localhost',
        description: env.get('NODE_ENV') === 'production' ? 'Production' : 'Development',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Bearer token authentication. Use the access token obtained from /api/auth/login',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            username: { type: 'string', example: 'johndoe' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
            emailVerifiedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Game: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Guess the Song' },
            description: { type: 'string', example: 'Players guess songs from audio clips' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Achievement: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            description: { type: 'string', example: 'Complete 10 games' },
            type: { type: 'string', example: 'games_completed' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        GameSession: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
            gameId: { type: 'integer', example: 1 },
            status: { type: 'string', enum: ['pending', 'active', 'completed'], example: 'active' },
            players: { type: 'object', example: { player1: 'John', player2: 'Jane' } },
            gameData: { type: 'object', example: { score: 100, round: 3 } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        LikedTrack: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            userId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
            spotifyId: { type: 'string', example: '3n3Ppam7vgaVa1iaRUc9Lp' },
            title: { type: 'string', example: 'Bohemian Rhapsody' },
            artist: { type: 'string', example: 'Queen' },
            type: { type: 'string', example: 'song' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'An error occurred' },
            errors: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'User authentication and authorization endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Games', description: 'Game management endpoints (admin)' },
      { name: 'Achievements', description: 'Achievement management endpoints' },
      { name: 'GameSessions', description: 'Game session management endpoints' },
      { name: 'LikedTracks', description: 'User liked tracks endpoints' },
    ],
    externalDocs: {
      description: 'Rythmix Project Documentation',
      url: 'https://github.com/yourrepo/rythmix',
    },
  },
})
