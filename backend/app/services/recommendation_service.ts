import logger from '@adonisjs/core/services/logger'
import { inject } from '@adonisjs/core'
import UserOnboardingArtist from '#models/user_onboarding_artist'
import UserTrackInteraction from '#models/user_track_interaction'
import { SpotifyService } from '#services/spotify_service'
import { InteractionAction } from '#enums/interaction_action'

const DEEZER_API_BASE = 'https://api.deezer.com'
const FETCH_TIMEOUT_MS = 8000
const CACHE_TTL_MS = 5 * 60 * 1000
const SEED_ARTISTS_LIMIT = 5
const FAMILIAR_TRACKS_PER_ARTIST = 5
const DISCOVERY_CHART_LIMIT = 30
const DISCOVERY_RELATED_PER_SEED = 2
const RELATED_ARTISTS_PER_SEED = 3
const LIKED_INTERACTIONS_LOOKBACK = 50

export interface FeedArtist {
  id: number
  name: string
  picture: string
  picture_small: string
  picture_medium: string
  picture_big: string
  picture_xl: string
}

export interface FeedAlbum {
  id: number
  title: string
  cover: string
  cover_small: string
  cover_medium: string
  cover_big: string
  cover_xl: string
  md5_image: string
}

export interface FeedTrack {
  id: number
  title: string
  title_short: string
  title_version: string
  link: string
  duration: number
  rank: number
  explicit_lyrics: boolean
  explicit_content_lyrics: number
  explicit_content_cover: number
  preview: string
  md5_image: string
  artist: FeedArtist
  album: FeedAlbum
  type: string
}

interface DeezerTrackPayload {
  id: number
  title?: string
  title_short?: string
  title_version?: string
  link?: string
  duration?: number
  rank?: number
  explicit_lyrics?: boolean
  explicit_content_lyrics?: number
  explicit_content_cover?: number
  preview?: string
  md5_image?: string
  artist?: Partial<FeedArtist>
  album?: Partial<FeedAlbum>
  type?: string
}

interface DeezerTrackListResponse {
  data?: DeezerTrackPayload[]
}

interface DeezerArtistListResponse {
  data?: { id: number; name?: string }[]
}

interface DeezerArtistSearchResponse {
  data?: { id: number; name?: string }[]
}

interface SpotifyTopArtistsResponse {
  items?: { id: string; name: string }[]
}

export interface FeedOptions {
  limit?: number
  offset?: number
  country?: string
}

interface PoolEntry {
  tracks: FeedTrack[]
  expiresAt: number
}

const poolCache = new Map<string, PoolEntry>()

@inject()
export class RecommendationService {
  constructor(private readonly spotifyService: SpotifyService) {}

  async getPersonalizedFeed(userId: string, options: FeedOptions = {}): Promise<FeedTrack[]> {
    const limit = options.limit ?? 20
    const offset = options.offset ?? 0
    const country = (options.country ?? 'FR').toUpperCase()

    const [pool, excluded] = await Promise.all([
      this.getOrBuildPool(userId, country),
      this.getExcludedTrackIds(userId),
    ])

    const visible = pool.filter((track) => !excluded.has(String(track.id)))
    return visible.slice(offset, offset + limit)
  }

  private async getOrBuildPool(userId: string, country: string): Promise<FeedTrack[]> {
    const cached = poolCache.get(userId)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.tracks
    }

    const tracks = await this.buildPool(userId, country)
    poolCache.set(userId, {
      tracks,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })
    return tracks
  }

  private async buildPool(userId: string, country: string): Promise<FeedTrack[]> {
    const seedArtistIds = await this.collectSeedArtistIds(userId)

    const [familiarRaw, discoveryRaw] = await Promise.all([
      this.buildFamiliarBucket(seedArtistIds),
      this.buildDiscoveryBucket(seedArtistIds, country),
    ])

    const familiar = this.dedupe(familiarRaw, new Set())
    const familiarIds = new Set(familiar.map((track) => String(track.id)))
    const discovery = this.dedupe(discoveryRaw, familiarIds)

    this.shuffle(familiar)
    this.shuffle(discovery)

    return this.interleave(familiar, discovery)
  }

  private async collectSeedArtistIds(userId: string): Promise<string[]> {
    const ids = new Set<string>()

    const [spotifyIds, likedIds, onboardingIds] = await Promise.all([
      this.collectSpotifySeeds(userId),
      this.collectLikedSeeds(userId),
      this.collectOnboardingSeeds(userId),
    ])

    spotifyIds.forEach((id) => ids.add(id))
    likedIds.forEach((id) => ids.add(id))
    onboardingIds.forEach((id) => ids.add(id))

    return Array.from(ids)
  }

  private async collectSpotifySeeds(userId: string): Promise<string[]> {
    try {
      const integration = await this.spotifyService.findByUserId(userId)
      if (!integration) return []

      const top = (await this.spotifyService.getTopArtists(userId, {
        limit: SEED_ARTISTS_LIMIT,
      })) as SpotifyTopArtistsResponse

      /* c8 ignore next */
      const names = (top.items ?? []).map((item) => item.name).filter(Boolean)
      /* c8 ignore next */
      if (names.length === 0) return []

      const resolved = await Promise.all(names.map((name) => this.resolveDeezerArtistByName(name)))
      return resolved
        .filter((value): value is { id: number; name?: string } => value !== null)
        .map((artist) => String(artist.id))
    } catch (error) {
      logger.warn({ err: error, userId }, 'Spotify seeds resolution failed')
      return []
    }
  }

  private async collectLikedSeeds(userId: string): Promise<string[]> {
    const interactions = await UserTrackInteraction.query()
      .where('userId', userId)
      .where('action', InteractionAction.Liked)
      .whereNotNull('deezerArtistId')
      .orderBy('createdAt', 'desc')
      .limit(LIKED_INTERACTIONS_LOOKBACK)

    const counts = new Map<string, number>()
    for (const interaction of interactions) {
      const artistId = interaction.deezerArtistId
      /* c8 ignore next */
      if (!artistId) continue
      counts.set(artistId, (counts.get(artistId) ?? 0) + 1)
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, SEED_ARTISTS_LIMIT)
      .map(([id]) => id)
  }

  private async collectOnboardingSeeds(userId: string): Promise<string[]> {
    const rows = await UserOnboardingArtist.query()
      .where('userId', userId)
      .orderBy('rank', 'asc')
      .limit(SEED_ARTISTS_LIMIT)

    return rows.map((row) => row.deezerArtistId)
  }

  private async getExcludedTrackIds(userId: string): Promise<Set<string>> {
    const interactions = await UserTrackInteraction.query()
      .where('userId', userId)
      .select('deezerTrackId')

    return new Set(interactions.map((row) => row.deezerTrackId))
  }

  private async buildFamiliarBucket(seedArtistIds: string[]): Promise<FeedTrack[]> {
    if (seedArtistIds.length === 0) return []

    const responses = await Promise.all(
      seedArtistIds.map((id) =>
        this.fetchDeezer<DeezerTrackListResponse>(
          `${DEEZER_API_BASE}/artist/${encodeURIComponent(id)}/top?limit=${FAMILIAR_TRACKS_PER_ARTIST}`
        ).catch((error) => {
          logger.warn({ err: error, artistId: id }, 'Deezer artist top fetch failed')
          return null
        })
      )
    )

    return responses
      .flatMap((response) => response?.data ?? [])
      .map((track) => this.normalizeTrack(track))
      .filter((track): track is FeedTrack => track !== null)
  }

  private async buildDiscoveryBucket(
    seedArtistIds: string[],
    country: string
  ): Promise<FeedTrack[]> {
    const chartUrl = `${DEEZER_API_BASE}/chart/${encodeURIComponent(country)}/tracks?limit=${DISCOVERY_CHART_LIMIT}`
    const chartPromise = this.fetchDeezer<DeezerTrackListResponse>(chartUrl).catch((error) => {
      logger.warn({ err: error, country }, 'Deezer chart fetch failed')
      return null
    })

    const relatedPromise = this.fetchRelatedArtistTopTracks(seedArtistIds)

    const [chart, related] = await Promise.all([chartPromise, relatedPromise])

    const chartTracks = (chart?.data ?? [])
      .map((track) => this.normalizeTrack(track))
      .filter((track): track is FeedTrack => track !== null)

    return [...related, ...chartTracks]
  }

  private async fetchRelatedArtistTopTracks(seedArtistIds: string[]): Promise<FeedTrack[]> {
    if (seedArtistIds.length === 0) return []

    const relatedLists = await Promise.all(
      seedArtistIds.map(
        (id) =>
          this.fetchDeezer<DeezerArtistListResponse>(
            `${DEEZER_API_BASE}/artist/${encodeURIComponent(id)}/related?limit=${RELATED_ARTISTS_PER_SEED}`
            /* c8 ignore start */
          ).catch((error) => {
            logger.warn({ err: error, artistId: id }, 'Deezer related artists fetch failed')
            return null
          })
        /* c8 ignore stop */
      )
    )

    const seedSet = new Set(seedArtistIds)
    const relatedIds = new Set<string>()
    for (const list of relatedLists) {
      /* c8 ignore next */
      for (const artist of list?.data ?? []) {
        const id = String(artist.id)
        if (!seedSet.has(id)) relatedIds.add(id)
      }
    }

    if (relatedIds.size === 0) return []

    const trackResponses = await Promise.all(
      Array.from(relatedIds).map(
        (id) =>
          this.fetchDeezer<DeezerTrackListResponse>(
            `${DEEZER_API_BASE}/artist/${encodeURIComponent(id)}/top?limit=${DISCOVERY_RELATED_PER_SEED}`
            /* c8 ignore start */
          ).catch((error) => {
            logger.warn({ err: error, artistId: id }, 'Deezer related artist top fetch failed')
            return null
          })
        /* c8 ignore stop */
      )
    )

    return (
      trackResponses
        /* c8 ignore next */
        .flatMap((response) => response?.data ?? [])
        .map((track) => this.normalizeTrack(track))
        .filter((track): track is FeedTrack => track !== null)
    )
  }

  private dedupe(tracks: FeedTrack[], alreadyTaken: Set<string>): FeedTrack[] {
    const seen = new Set<string>()
    const result: FeedTrack[] = []

    for (const track of tracks) {
      const id = String(track.id)
      /* c8 ignore next */
      if (alreadyTaken.has(id) || seen.has(id)) continue
      seen.add(id)
      result.push(track)
    }

    return result
  }

  private shuffle<T>(items: T[]): void {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[items[i], items[j]] = [items[j], items[i]]
    }
  }

  private interleave(familiar: FeedTrack[], discovery: FeedTrack[]): FeedTrack[] {
    const result: FeedTrack[] = []
    let famIdx = 0
    let disIdx = 0
    const total = familiar.length + discovery.length

    for (let position = 0; position < total; position++) {
      const wantFamiliar = this.shouldBeFamiliar(position)
      if (wantFamiliar && famIdx < familiar.length) {
        result.push(familiar[famIdx++])
      } else if (!wantFamiliar && disIdx < discovery.length) {
        result.push(discovery[disIdx++])
      } else if (famIdx < familiar.length) {
        result.push(familiar[famIdx++])
      } else {
        result.push(discovery[disIdx++])
      }
    }

    return result
  }

  private shouldBeFamiliar(position: number): boolean {
    // 80/20 sur les 5 premières cartes (4 familier + 1 découverte),
    // puis 60/40 sur les blocs suivants (6 familier + 4 découverte par cycle de 10).
    if (position < 5) {
      return position < 4
    }
    const cyclePosition = (position - 5) % 10
    return [0, 1, 2, 4, 5, 7].includes(cyclePosition)
  }

  private normalizeTrack(payload: DeezerTrackPayload | undefined | null): FeedTrack | null {
    if (!payload || typeof payload.id !== 'number') return null
    if (!payload.preview) return null

    const artist = payload.artist
    const album = payload.album
    if (!artist || typeof artist.id !== 'number' || !artist.name) return null
    if (!album || typeof album.id !== 'number' || !album.title) return null

    return {
      id: payload.id,
      title: payload.title ?? '',
      title_short: payload.title_short ?? payload.title ?? '',
      title_version: payload.title_version ?? '',
      link: payload.link ?? '',
      duration: payload.duration ?? 0,
      rank: payload.rank ?? 0,
      explicit_lyrics: payload.explicit_lyrics ?? false,
      explicit_content_lyrics: payload.explicit_content_lyrics ?? 0,
      explicit_content_cover: payload.explicit_content_cover ?? 0,
      preview: payload.preview,
      md5_image: payload.md5_image ?? '',
      artist: {
        id: artist.id,
        name: artist.name,
        picture: artist.picture ?? '',
        picture_small: artist.picture_small ?? '',
        picture_medium: artist.picture_medium ?? '',
        picture_big: artist.picture_big ?? '',
        picture_xl: artist.picture_xl ?? '',
      },
      album: {
        id: album.id,
        title: album.title,
        cover: album.cover ?? '',
        cover_small: album.cover_small ?? '',
        cover_medium: album.cover_medium ?? '',
        cover_big: album.cover_big ?? '',
        cover_xl: album.cover_xl ?? '',
        md5_image: album.md5_image ?? '',
      },
      type: payload.type ?? 'track',
    }
  }

  private async resolveDeezerArtistByName(
    name: string
  ): Promise<{ id: number; name?: string } | null> {
    try {
      const url = `${DEEZER_API_BASE}/search/artist?q=${encodeURIComponent(name)}&limit=1`
      const data = await this.fetchDeezer<DeezerArtistSearchResponse>(url)
      const first = data.data?.[0]
      if (!first || typeof first.id !== 'number') return null
      return first
    } catch (error) {
      logger.warn({ err: error, name }, 'Deezer artist name resolution failed')
      return null
    }
  }

  private async fetchDeezer<T>(url: string): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

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

export default RecommendationService
