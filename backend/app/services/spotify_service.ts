import { DateTime } from 'luxon'
import env from '#start/env'
import UserIntegration from '#models/user_integration'
import { IntegrationProvider } from '#enums/integration_provider'

export type SpotifyTimeRange = 'short_term' | 'medium_term' | 'long_term'

export interface SpotifyUpsertPayload {
  providerUserId: string
  accessToken: string
  refreshToken?: string | null
  expiresAt?: DateTime | null
  scopes?: string | null
}

interface SpotifyRefreshResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
  token_type?: string
}

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const REFRESH_LEEWAY_SECONDS = 60

export class SpotifyService {
  async findByUserId(userId: string): Promise<UserIntegration | null> {
    return UserIntegration.query()
      .where('userId', userId)
      .where('provider', IntegrationProvider.SPOTIFY)
      .first()
  }

  async upsertIntegration(userId: string, payload: SpotifyUpsertPayload): Promise<UserIntegration> {
    const existing = await this.findByUserId(userId)

    const attributes = {
      userId,
      provider: IntegrationProvider.SPOTIFY,
      providerUserId: payload.providerUserId,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken ?? existing?.refreshToken ?? null,
      expiresAt: payload.expiresAt ?? null,
      scopes: payload.scopes ?? existing?.scopes ?? null,
    }

    return UserIntegration.updateOrCreate(
      { userId, provider: IntegrationProvider.SPOTIFY },
      attributes
    )
  }

  async unlink(userId: string): Promise<boolean> {
    const deleted = await UserIntegration.query()
      .where('userId', userId)
      .where('provider', IntegrationProvider.SPOTIFY)
      .delete()
    return Number(deleted[0]) > 0
  }

  async getValidAccessToken(userId: string): Promise<string> {
    const integration = await this.findByUserId(userId)
    if (!integration) {
      throw new Error('Spotify integration not found')
    }

    if (!this.needsRefresh(integration)) {
      return integration.accessToken
    }

    if (!integration.refreshToken) {
      throw new Error('Spotify refresh token missing')
    }

    const refreshed = await this.refreshAccessToken(integration.refreshToken)

    integration.accessToken = refreshed.access_token
    if (refreshed.refresh_token) {
      integration.refreshToken = refreshed.refresh_token
    }
    integration.expiresAt = DateTime.now().plus({ seconds: refreshed.expires_in })
    if (refreshed.scope) integration.scopes = refreshed.scope
    await integration.save()

    return integration.accessToken
  }

  async getTopTracks(
    userId: string,
    options: { timeRange?: SpotifyTimeRange; limit?: number } = {}
  ) {
    return this.spotifyGet(userId, '/me/top/tracks', {
      time_range: options.timeRange ?? 'medium_term',
      limit: String(options.limit ?? 20),
    })
  }

  async getTopArtists(
    userId: string,
    options: { timeRange?: SpotifyTimeRange; limit?: number } = {}
  ) {
    return this.spotifyGet(userId, '/me/top/artists', {
      time_range: options.timeRange ?? 'medium_term',
      limit: String(options.limit ?? 20),
    })
  }

  async getRecentlyPlayed(userId: string, options: { limit?: number } = {}) {
    return this.spotifyGet(userId, '/me/player/recently-played', {
      limit: String(options.limit ?? 20),
    })
  }

  private needsRefresh(integration: UserIntegration): boolean {
    if (!integration.expiresAt) return false
    return integration.expiresAt <= DateTime.now().plus({ seconds: REFRESH_LEEWAY_SECONDS })
  }

  private async refreshAccessToken(refreshToken: string): Promise<SpotifyRefreshResponse> {
    const clientId = env.get('SPOTIFY_CLIENT_ID')
    const clientSecret = env.get('SPOTIFY_CLIENT_SECRET')
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      throw new Error(`Spotify token refresh failed: ${response.status}`)
    }

    return response.json() as Promise<SpotifyRefreshResponse>
  }

  private async spotifyGet(
    userId: string,
    path: string,
    query: Record<string, string> = {}
  ): Promise<unknown> {
    const token = await this.getValidAccessToken(userId)
    const url = new URL(SPOTIFY_API_BASE + path)
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value)
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      throw new Error(`Spotify API error ${response.status} on ${path}`)
    }

    return response.json()
  }
}
