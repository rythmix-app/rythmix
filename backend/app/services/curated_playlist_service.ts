import CuratedPlaylist from '#models/curated_playlist'

interface DeezerPlaylistMetaResponse {
  id?: number
  title?: string
  picture_xl?: string
  nb_tracks?: number
  error?: { code: number; type: string; message: string }
}

export interface DeezerPlaylistMeta {
  id: number
  title: string
  picture_xl: string
  nb_tracks: number
}

interface DeezerPlaylistTrackArtist {
  id: number
  name: string
  picture?: string
  picture_small?: string
  picture_medium?: string
  picture_big?: string
  picture_xl?: string
}

interface DeezerPlaylistTrackAlbum {
  id: number
  title: string
  cover?: string
  cover_small?: string
  cover_medium?: string
  cover_big?: string
  cover_xl?: string
}

export interface DeezerPlaylistTrack {
  id: number
  title: string
  title_short: string
  preview: string
  duration: number
  artist: DeezerPlaylistTrackArtist
  album: DeezerPlaylistTrackAlbum
}

interface DeezerPlaylistTracksResponse {
  data: DeezerPlaylistTrack[]
  total?: number
  next?: string
}

export class PlaylistNotFoundError extends Error {
  constructor(public playlistId: number) {
    super(`Curated playlist with id ${playlistId} not found`)
    this.name = 'PlaylistNotFoundError'
  }
}

export class DeezerPlaylistFetchError extends Error {
  constructor(
    public deezerPlaylistId: number,
    public status?: number
  ) {
    super(
      `Failed to fetch Deezer playlist ${deezerPlaylistId}${status ? ` (status ${status})` : ''}`
    )
    this.name = 'DeezerPlaylistFetchError'
  }
}

export class DeezerPlaylistNotFoundError extends Error {
  constructor(public deezerPlaylistId: number) {
    super(`Deezer playlist ${deezerPlaylistId} does not exist`)
    this.name = 'DeezerPlaylistNotFoundError'
  }
}

export class InvalidDeezerUrlError extends Error {
  constructor(public url: string) {
    super(`Invalid Deezer playlist URL: ${url}`)
    this.name = 'InvalidDeezerUrlError'
  }
}

export class DuplicateDeezerPlaylistError extends Error {
  constructor(public deezerPlaylistId: number) {
    super(`Deezer playlist ${deezerPlaylistId} is already in the catalogue`)
    this.name = 'DuplicateDeezerPlaylistError'
  }
}

const DEEZER_HOST_PATTERN = /^([a-z0-9-]+\.)?deezer\.com$/i
const DEEZER_PLAYLIST_PATH = /\/playlist\/(\d+)/
const DEEZER_SHORT_HOSTS = new Set(['link.deezer.com', 'deezer.page.link'])

function tryDirectExtract(rawUrl: string): number | null {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return null
  }
  if (!DEEZER_HOST_PATTERN.test(parsed.host)) return null
  const match = parsed.pathname.match(DEEZER_PLAYLIST_PATH)
  if (!match) return null
  const id = Number(match[1])
  return Number.isFinite(id) ? id : null
}

export async function parseDeezerPlaylistUrl(rawUrl: string): Promise<number> {
  const direct = tryDirectExtract(rawUrl)
  if (direct !== null) return direct

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new InvalidDeezerUrlError(rawUrl)
  }

  if (!DEEZER_SHORT_HOSTS.has(parsed.host.toLowerCase())) {
    throw new InvalidDeezerUrlError(rawUrl)
  }

  let response: Response
  try {
    response = await fetch(parsed.toString(), { redirect: 'follow' })
  } catch {
    throw new InvalidDeezerUrlError(rawUrl)
  }

  const resolved = tryDirectExtract(response.url)
  if (resolved === null) {
    throw new InvalidDeezerUrlError(rawUrl)
  }
  return resolved
}

const DEEZER_API_BASE = 'https://api.deezer.com'
const DEFAULT_TRACK_COUNT = 50
const PAGE_SIZE = 500
const CACHE_TTL_MS = 5 * 60 * 1000

interface CacheEntry {
  tracks: DeezerPlaylistTrack[]
  expiresAt: number
}

export class CuratedPlaylistService {
  private static cache = new Map<number, CacheEntry>()

  static clearCache() {
    CuratedPlaylistService.cache.clear()
  }

  static invalidateCache(deezerPlaylistId: number) {
    CuratedPlaylistService.cache.delete(Number(deezerPlaylistId))
  }

  async listPlaylists(): Promise<CuratedPlaylist[]> {
    return CuratedPlaylist.query().orderBy('id', 'asc')
  }

  async findById(id: number): Promise<CuratedPlaylist | null> {
    return CuratedPlaylist.query().where('id', id).first()
  }

  async createFromDeezerUrl(input: { url: string; genreLabel: string }): Promise<CuratedPlaylist> {
    const deezerPlaylistId = await parseDeezerPlaylistUrl(input.url)
    const existing = await CuratedPlaylist.query()
      .where('deezerPlaylistId', deezerPlaylistId)
      .first()
    if (existing) {
      throw new DuplicateDeezerPlaylistError(deezerPlaylistId)
    }
    const meta = await this.fetchDeezerPlaylistMeta(deezerPlaylistId)
    return CuratedPlaylist.create({
      deezerPlaylistId,
      name: meta.title,
      genreLabel: input.genreLabel,
      coverUrl: meta.picture_xl,
      trackCount: meta.nb_tracks,
      nameOverridden: false,
    })
  }

  async renamePlaylist(id: number, name: string): Promise<CuratedPlaylist> {
    const playlist = await this.findById(id)
    if (!playlist) {
      throw new PlaylistNotFoundError(id)
    }
    playlist.name = name
    playlist.nameOverridden = true
    await playlist.save()
    return playlist
  }

  async refreshPlaylist(id: number): Promise<CuratedPlaylist> {
    const playlist = await this.findById(id)
    if (!playlist) {
      throw new PlaylistNotFoundError(id)
    }
    const meta = await this.fetchDeezerPlaylistMeta(playlist.deezerPlaylistId)
    playlist.coverUrl = meta.picture_xl
    playlist.trackCount = meta.nb_tracks
    if (!playlist.nameOverridden) {
      playlist.name = meta.title
    }
    await playlist.save()
    CuratedPlaylistService.invalidateCache(playlist.deezerPlaylistId)
    return playlist
  }

  async deletePlaylist(id: number): Promise<void> {
    const playlist = await this.findById(id)
    if (!playlist) {
      throw new PlaylistNotFoundError(id)
    }
    const deezerPlaylistId = playlist.deezerPlaylistId
    await playlist.delete()
    CuratedPlaylistService.invalidateCache(deezerPlaylistId)
  }

  protected async fetchDeezerPlaylistMeta(deezerPlaylistId: number): Promise<DeezerPlaylistMeta> {
    let response: Response
    try {
      response = await fetch(`${DEEZER_API_BASE}/playlist/${deezerPlaylistId}`)
    } catch {
      throw new DeezerPlaylistFetchError(deezerPlaylistId)
    }
    if (!response.ok) {
      throw new DeezerPlaylistFetchError(deezerPlaylistId, response.status)
    }
    let body: DeezerPlaylistMetaResponse
    try {
      body = (await response.json()) as DeezerPlaylistMetaResponse
    } catch {
      throw new DeezerPlaylistFetchError(deezerPlaylistId)
    }
    if (body.error) {
      if (body.error.code === 800 || body.error.code === 4) {
        throw new DeezerPlaylistNotFoundError(deezerPlaylistId)
      }
      throw new DeezerPlaylistFetchError(deezerPlaylistId)
    }
    if (
      typeof body.id !== 'number' ||
      typeof body.title !== 'string' ||
      typeof body.picture_xl !== 'string' ||
      typeof body.nb_tracks !== 'number'
    ) {
      throw new DeezerPlaylistFetchError(deezerPlaylistId)
    }
    return {
      id: body.id,
      title: body.title,
      picture_xl: body.picture_xl,
      nb_tracks: body.nb_tracks,
    }
  }

  async getRandomTracks(
    playlistId: number,
    count: number = DEFAULT_TRACK_COUNT
  ): Promise<DeezerPlaylistTrack[]> {
    const playlist = await this.findById(playlistId)
    if (!playlist) {
      throw new PlaylistNotFoundError(playlistId)
    }

    const unique = await this.getUniqueDeezerTracks(playlist.deezerPlaylistId)
    const shuffled = this.shuffle(unique)
    return shuffled.slice(0, Math.max(0, count))
  }

  async listAllTracks(playlistId: number): Promise<DeezerPlaylistTrack[]> {
    const playlist = await this.findById(playlistId)
    if (!playlist) {
      throw new PlaylistNotFoundError(playlistId)
    }
    return this.getUniqueDeezerTracks(playlist.deezerPlaylistId)
  }

  protected async getUniqueDeezerTracks(deezerPlaylistId: number): Promise<DeezerPlaylistTrack[]> {
    const cacheKey = Number(deezerPlaylistId)
    const now = Date.now()
    const cached = CuratedPlaylistService.cache.get(cacheKey)
    if (cached && cached.expiresAt > now) {
      return cached.tracks
    }

    const tracks = await this.fetchDeezerPlaylistTracks(deezerPlaylistId)
    const unique = this.dedupeById(tracks)
    CuratedPlaylistService.cache.set(cacheKey, {
      tracks: unique,
      expiresAt: now + CACHE_TTL_MS,
    })
    return unique
  }

  protected dedupeById(tracks: DeezerPlaylistTrack[]): DeezerPlaylistTrack[] {
    const seen = new Set<number>()
    const result: DeezerPlaylistTrack[] = []
    for (const track of tracks) {
      if (seen.has(track.id)) continue
      seen.add(track.id)
      result.push(track)
    }
    return result
  }

  protected async fetchDeezerPlaylistTracks(
    deezerPlaylistId: number
  ): Promise<DeezerPlaylistTrack[]> {
    // Deezer paginates /playlist/:id/tracks (default limit=25, max=500). The first page
    // also returns `total`, so we use it both to seed the result and to compute the
    // remaining pages — saves one round-trip vs. a dedicated probe call.
    const firstPage = await this.requestDeezer(
      deezerPlaylistId,
      `${DEEZER_API_BASE}/playlist/${deezerPlaylistId}/tracks?limit=${PAGE_SIZE}&index=0`
    )
    const data = firstPage.data ?? []
    const total = firstPage.total ?? data.length
    if (total <= PAGE_SIZE) return data

    const remainingPages = Math.ceil(total / PAGE_SIZE) - 1
    const pages = await Promise.all(
      Array.from({ length: remainingPages }, (_, i) =>
        this.requestDeezer(
          deezerPlaylistId,
          `${DEEZER_API_BASE}/playlist/${deezerPlaylistId}/tracks?limit=${PAGE_SIZE}&index=${(i + 1) * PAGE_SIZE}`
        )
      )
    )
    return [data, ...pages.map((p) => p.data)].flat()
  }

  protected async requestDeezer(
    deezerPlaylistId: number,
    url: string
  ): Promise<DeezerPlaylistTracksResponse> {
    let response: Response
    try {
      response = await fetch(url)
    } catch {
      throw new DeezerPlaylistFetchError(deezerPlaylistId)
    }

    if (!response.ok) {
      throw new DeezerPlaylistFetchError(deezerPlaylistId, response.status)
    }

    return (await response.json()) as DeezerPlaylistTracksResponse
  }

  public shuffle<T>(items: T[]): T[] {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }
}
