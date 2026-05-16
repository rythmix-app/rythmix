import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { inject } from '@adonisjs/core'
import UserOnboardingArtist from '#models/user_onboarding_artist'
import { SpotifyService } from '#services/spotify_service'
import { MIN_ONBOARDING_ARTISTS } from '#validators/onboarding_validator'
import type { ServiceError } from '#types/service_error'

const DEEZER_API_BASE = 'https://api.deezer.com'
const SUGGESTIONS_TIMEOUT_MS = 8000
const SPOTIFY_TOP_ARTISTS_LIMIT = 20

export interface DeezerArtistSuggestion {
  id: number
  name: string
  picture_medium: string
  picture_big: string
  nb_fan?: number
}

interface DeezerChartArtistsResponse {
  data: DeezerArtistSuggestion[]
}

interface DeezerSearchArtistsResponse {
  data: DeezerArtistSuggestion[]
}

interface SpotifyTopArtistsResponse {
  items: { id: string; name: string }[]
}

@inject()
export class OnboardingService {
  constructor(private readonly spotifyService: SpotifyService) {}

  async listArtists(userId: string): Promise<UserOnboardingArtist[]> {
    return UserOnboardingArtist.query().where('userId', userId).orderBy('rank', 'asc')
  }

  async getStatus(userId: string): Promise<{ completed: boolean; artistsCount: number }> {
    const row = await UserOnboardingArtist.query()
      .where('userId', userId)
      .count('* as total')
      .firstOrFail()

    const artistsCount = Number(row.$extras.total)
    return {
      completed: artistsCount >= MIN_ONBOARDING_ARTISTS,
      artistsCount,
    }
  }

  async replaceArtists(
    userId: string,
    deezerArtistIds: number[]
  ): Promise<UserOnboardingArtist[] | ServiceError> {
    const suggestions = await this.fetchSuggestionsByIds(deezerArtistIds)
    const byId = new Map(suggestions.map((artist) => [String(artist.id), artist]))

    const missing = deezerArtistIds.filter((id) => !byId.has(String(id)))
    if (missing.length > 0) {
      return {
        error: `Unknown Deezer artist ids: ${missing.join(', ')}`,
        status: 422,
      }
    }

    return await db.transaction(async (trx) => {
      await UserOnboardingArtist.query({ client: trx }).where('userId', userId).delete()

      const rows = deezerArtistIds.map((id, index) => ({
        userId,
        deezerArtistId: String(id),
        artistName: byId.get(String(id))!.name,
        rank: index + 1,
      }))

      await UserOnboardingArtist.createMany(rows, { client: trx })

      return UserOnboardingArtist.query({ client: trx })
        .where('userId', userId)
        .orderBy('rank', 'asc')
    })
  }

  async getSuggestions(
    userId: string,
    options: { country?: string; limit?: number } = {}
  ): Promise<DeezerArtistSuggestion[]> {
    const country = (options.country ?? 'FR').toUpperCase()
    const limit = options.limit ?? 20

    const url = `${DEEZER_API_BASE}/chart/${encodeURIComponent(country)}/artists?limit=${limit}`
    const data = await this.fetchDeezer<DeezerChartArtistsResponse>(url)

    const selected = await UserOnboardingArtist.query()
      .where('userId', userId)
      .select('deezerArtistId')
    const selectedIds = new Set(selected.map((row) => row.deezerArtistId))

    return (data.data ?? []).filter((artist) => !selectedIds.has(String(artist.id)))
  }

  async getSpotifySuggestions(userId: string): Promise<DeezerArtistSuggestion[] | ServiceError> {
    const integration = await this.spotifyService.findByUserId(userId)
    if (!integration) {
      return { error: 'Spotify integration not found', status: 409 }
    }

    const top = (await this.spotifyService.getTopArtists(userId, {
      limit: SPOTIFY_TOP_ARTISTS_LIMIT,
    })) as SpotifyTopArtistsResponse

    const names = (top.items ?? []).map((artist) => artist.name).filter(Boolean)
    if (names.length === 0) return []

    const resolved = await Promise.all(names.map((name) => this.resolveDeezerArtistByName(name)))

    const seen = new Set<string>()
    const suggestions: DeezerArtistSuggestion[] = []
    for (const artist of resolved) {
      if (!artist) continue
      const id = String(artist.id)
      if (seen.has(id)) continue
      seen.add(id)
      suggestions.push(artist)
    }

    return suggestions
  }

  private async resolveDeezerArtistByName(name: string): Promise<DeezerArtistSuggestion | null> {
    try {
      const url = `${DEEZER_API_BASE}/search/artist?q=${encodeURIComponent(name)}&limit=1`
      const data = await this.fetchDeezer<DeezerSearchArtistsResponse>(url)
      const first = data.data?.[0]
      if (!first || typeof first.id !== 'number') {
        logger.warn({ name }, 'Spotify artist not resolved on Deezer')
        return null
      }
      return first
    } catch (error) {
      logger.warn({ err: error, name }, 'Deezer search by name failed')
      return null
    }
  }

  private async fetchSuggestionsByIds(ids: number[]): Promise<DeezerArtistSuggestion[]> {
    const unique = Array.from(new Set(ids))
    const results = await Promise.all(
      unique.map(async (id) => {
        try {
          return await this.fetchDeezer<DeezerArtistSuggestion>(`${DEEZER_API_BASE}/artist/${id}`)
        } catch (error) {
          logger.warn({ err: error, id }, 'Deezer artist lookup failed')
          return null
        }
      })
    )

    return results.filter((value): value is DeezerArtistSuggestion => {
      return value !== null && typeof (value as { id?: unknown }).id === 'number'
    })
  }

  private async fetchDeezer<T>(url: string): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), SUGGESTIONS_TIMEOUT_MS)

    try {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) {
        throw new Error(`Deezer request failed: ${response.status}`)
      }
      return (await response.json()) as T
    } finally {
      clearTimeout(timeout)
    }
  }
}

export default OnboardingService
