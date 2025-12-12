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
