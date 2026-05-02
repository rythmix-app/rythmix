import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import UserIntegration from '#models/user_integration'
import UserTrackInteraction from '#models/user_track_interaction'
import { InteractionAction } from '#enums/interaction_action'
import { SpotifyApiError, SpotifyService } from '#services/spotify_service'

export const SPOTIFY_LIKED_PLAYLIST_NAME = 'Rythmix Likes'
export const SPOTIFY_LIKED_PLAYLIST_DESCRIPTION = 'Tes likes SwipeMix exportés depuis Rythmix.'
export const SPOTIFY_PLAYLIST_SCOPE = 'playlist-modify-private'

export const SPOTIFY_ERROR_CODE = {
  ScopeUpgradeRequired: 'SPOTIFY_SCOPE_UPGRADE_REQUIRED',
  NotConnected: 'SPOTIFY_NOT_CONNECTED',
} as const

export class SpotifyScopeUpgradeRequiredError extends Error {
  constructor() {
    super(SPOTIFY_ERROR_CODE.ScopeUpgradeRequired)
    this.name = 'SpotifyScopeUpgradeRequiredError'
  }
}

export class SpotifyNotConnectedError extends Error {
  constructor() {
    super(SPOTIFY_ERROR_CODE.NotConnected)
    this.name = 'SpotifyNotConnectedError'
  }
}

export interface SpotifyAddTrackResult {
  added: boolean
  notOnSpotify?: boolean
}

export interface SpotifyRemoveTrackResult {
  removed: boolean
}

export interface SpotifySyncResult {
  added: number
  notOnSpotify: number
  skipped: number
}

@inject()
export class SpotifyPlaylistService {
  constructor(private readonly spotifyService: SpotifyService) {}

  async getOrCreateLikedPlaylist(userId: string): Promise<string> {
    const integration = await this.requireIntegration(userId)
    if (integration.spotifyLikedPlaylistId) {
      return integration.spotifyLikedPlaylistId
    }

    if (!this.hasPlaylistScope(integration)) {
      throw new SpotifyScopeUpgradeRequiredError()
    }

    try {
      const created = await this.spotifyService.spotifyApiRequest<{ id: string }>(
        userId,
        `/users/${integration.providerUserId}/playlists`,
        {
          method: 'POST',
          body: {
            name: SPOTIFY_LIKED_PLAYLIST_NAME,
            public: false,
            description: SPOTIFY_LIKED_PLAYLIST_DESCRIPTION,
          },
        }
      )

      integration.spotifyLikedPlaylistId = created.id
      await integration.save()
      return created.id
    } catch (error) {
      if (error instanceof SpotifyApiError && error.status === 403) {
        throw new SpotifyScopeUpgradeRequiredError()
      }
      throw error
    }
  }

  async addTrack(userId: string, deezerTrackId: string): Promise<SpotifyAddTrackResult> {
    const interaction = await UserTrackInteraction.query()
      .where('userId', userId)
      .where('deezerTrackId', deezerTrackId)
      .first()
    if (!interaction) {
      return { added: false }
    }

    const trackUri = await this.findSpotifyTrackUri(userId, interaction)
    if (!trackUri) {
      logger.info({ userId, deezerTrackId }, 'Track not available on Spotify')
      return { added: false, notOnSpotify: true }
    }

    const playlistId = await this.getOrCreateLikedPlaylist(userId)

    if (await this.isTrackInPlaylist(userId, playlistId, trackUri)) {
      return { added: false }
    }

    await this.spotifyService.spotifyApiRequest(userId, `/playlists/${playlistId}/items`, {
      method: 'POST',
      body: { uris: [trackUri] },
    })

    return { added: true }
  }

  async removeTrack(userId: string, deezerTrackId: string): Promise<SpotifyRemoveTrackResult> {
    const integration = await this.spotifyService.findByUserId(userId)
    if (!integration?.spotifyLikedPlaylistId) {
      return { removed: false }
    }

    const interaction = await UserTrackInteraction.query()
      .where('userId', userId)
      .where('deezerTrackId', deezerTrackId)
      .first()
    if (!interaction) {
      return { removed: false }
    }

    const trackUri = await this.findSpotifyTrackUri(userId, interaction)
    if (!trackUri) {
      return { removed: false }
    }

    await this.spotifyService.spotifyApiRequest(
      userId,
      `/playlists/${integration.spotifyLikedPlaylistId}/items`,
      {
        method: 'DELETE',
        body: { tracks: [{ uri: trackUri }] },
      }
    )

    return { removed: true }
  }

  async syncAllLikes(userId: string): Promise<SpotifySyncResult> {
    await this.requireIntegration(userId)

    const likes = await UserTrackInteraction.query()
      .where('userId', userId)
      .where('action', InteractionAction.Liked)

    const result: SpotifySyncResult = { added: 0, notOnSpotify: 0, skipped: 0 }

    for (const like of likes) {
      try {
        const r = await this.addTrack(userId, like.deezerTrackId)
        if (r.added) result.added++
        else if (r.notOnSpotify) result.notOnSpotify++
        else result.skipped++
      } catch (error) {
        if (error instanceof SpotifyScopeUpgradeRequiredError) throw error
        logger.error(
          { err: error, userId, deezerTrackId: like.deezerTrackId },
          'Spotify playlist sync addTrack failed'
        )
        result.skipped++
      }
    }

    return result
  }

  private async requireIntegration(userId: string): Promise<UserIntegration> {
    const integration = await this.spotifyService.findByUserId(userId)
    if (!integration) {
      throw new SpotifyNotConnectedError()
    }
    return integration
  }

  private async findSpotifyTrackUri(
    userId: string,
    interaction: UserTrackInteraction
  ): Promise<string | null> {
    if (interaction.isrc) {
      const isrcUri = await this.searchTrack(userId, `isrc:${interaction.isrc}`)
      if (isrcUri) return isrcUri
    }
    if (interaction.title && interaction.artist) {
      const query = `track:"${interaction.title}" artist:"${interaction.artist}"`
      return this.searchTrack(userId, query)
    }
    return null
  }

  private async searchTrack(userId: string, query: string): Promise<string | null> {
    const data = await this.spotifyService.spotifyApiRequest<{
      tracks?: { items?: { uri: string }[] }
    }>(userId, '/search', {
      method: 'GET',
      query: { q: query, type: 'track', limit: '1' },
    })
    return data.tracks?.items?.[0]?.uri ?? null
  }

  private async isTrackInPlaylist(
    userId: string,
    playlistId: string,
    trackUri: string
  ): Promise<boolean> {
    let path = `/playlists/${playlistId}/items`
    let query: Record<string, string> | undefined = {
      fields: 'items(track(uri)),next',
      limit: '100',
    }

    while (true) {
      const data: { items: { track: { uri: string } | null }[]; next: string | null } =
        await this.spotifyService.spotifyApiRequest(userId, path, { method: 'GET', query })

      if (data.items.some((item) => item.track?.uri === trackUri)) return true
      if (!data.next) return false

      const nextUrl = new URL(data.next)
      path = nextUrl.pathname.replace(/^\/v1/, '')
      query = Object.fromEntries(nextUrl.searchParams.entries())
    }
  }

  private hasPlaylistScope(integration: UserIntegration): boolean {
    if (!integration.scopes) return false
    return integration.scopes.split(/\s+/).includes(SPOTIFY_PLAYLIST_SCOPE)
  }
}

export default SpotifyPlaylistService
