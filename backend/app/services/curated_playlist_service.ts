import CuratedPlaylist from '#models/curated_playlist'

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

const DEEZER_API_BASE = 'https://api.deezer.com'
const DEFAULT_TRACK_COUNT = 50
const PAGE_SIZE = 500

export class CuratedPlaylistService {
  async listPlaylists(): Promise<CuratedPlaylist[]> {
    return CuratedPlaylist.query().orderBy('id', 'asc')
  }

  async findById(id: number): Promise<CuratedPlaylist | null> {
    return CuratedPlaylist.query().where('id', id).first()
  }

  async getRandomTracks(
    playlistId: number,
    count: number = DEFAULT_TRACK_COUNT
  ): Promise<DeezerPlaylistTrack[]> {
    const playlist = await this.findById(playlistId)
    if (!playlist) {
      throw new PlaylistNotFoundError(playlistId)
    }

    const tracks = await this.fetchDeezerPlaylistTracks(playlist.deezerPlaylistId)
    const unique = this.dedupeById(tracks)
    const shuffled = this.shuffle(unique)
    return shuffled.slice(0, Math.max(0, count))
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
    // Deezer paginates /playlist/:id/tracks (default limit=25, max=500). To make every
    // track of the playlist eligible we probe for the total, then fetch every page in
    // parallel.
    const probe = await this.requestDeezer(
      deezerPlaylistId,
      `${DEEZER_API_BASE}/playlist/${deezerPlaylistId}/tracks?limit=1`
    )
    const total = probe.total ?? 0
    if (total === 0) return []

    const pageCount = Math.ceil(total / PAGE_SIZE)
    const pages = await Promise.all(
      Array.from({ length: pageCount }, (_, page) =>
        this.requestDeezer(
          deezerPlaylistId,
          `${DEEZER_API_BASE}/playlist/${deezerPlaylistId}/tracks?limit=${PAGE_SIZE}&index=${page * PAGE_SIZE}`
        )
      )
    )
    return pages.flatMap((p) => p.data)
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

  protected shuffle<T>(items: T[]): T[] {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }
}
