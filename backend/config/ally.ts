import env from '#start/env'
import { defineConfig, services } from '@adonisjs/ally'

const allyConfig = defineConfig({
  spotify: services.spotify({
    clientId: env.get('SPOTIFY_CLIENT_ID'),
    clientSecret: env.get('SPOTIFY_CLIENT_SECRET'),
    callbackUrl: env.get('SPOTIFY_CALLBACK_URL'),
    scopes: [
      'user-read-email',
      'user-top-read',
      'user-read-recently-played',
      'playlist-modify-private',
    ],
  }),
  google: services.google({
    clientId: env.get('GOOGLE_CLIENT_ID'),
    clientSecret: env.get('GOOGLE_CLIENT_SECRET'),
    callbackUrl: env.get('GOOGLE_CALLBACK_URL'),
    scopes: ['userinfo.email', 'userinfo.profile'],
  }),
})

export default allyConfig

declare module '@adonisjs/ally/types' {
  interface SocialProviders extends InferSocialProviders<typeof allyConfig> {}
}
