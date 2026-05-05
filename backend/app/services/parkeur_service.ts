import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import {
  CuratedPlaylistService,
  DeezerPlaylistFetchError,
  DeezerPlaylistTrack,
  PlaylistNotFoundError,
} from '#services/curated_playlist_service'
import { LyricsService } from '#services/lyrics_service'
import { GameSessionService } from '#services/game_session_service'
import GameSession from '#models/game_session'
import Game from '#models/game'
import { GameSessionStatus } from '#enums/game_session_status'

export const PARKEUR_GAME_NAME = 'Parkeur'
export const PARKEUR_TARGET_ROUNDS = 10
export const PARKEUR_OVERSHOOT_FACTOR = 3
const DEEZER_API_BASE = 'https://api.deezer.com'
const DEEZER_ARTIST_TOP_LIMIT = 50
const DEEZER_FETCH_TIMEOUT_MS = 5000

export interface ParkeurRound {
  trackId: number
  artist: string
  title: string
  coverUrl: string | null
  lines: [string, string]
  answerLine: string
}

export interface ParkeurStartResult {
  session: GameSession
  rounds: ParkeurRound[]
}

export type ServiceError = { error: string; status: number }

export type ParkeurStartOptions =
  | { mode: 'playlist'; playlistId: number }
  | { mode: 'artist'; artistId: number }

interface SourceMeta {
  playlistId?: number
  playlistName?: string
  artistId?: number
  artistName?: string
}

interface ResolvedSource {
  tracks: DeezerPlaylistTrack[]
  meta: SourceMeta
}

@inject()
export class ParkeurService {
  constructor(
    private readonly curatedPlaylistService: CuratedPlaylistService,
    private readonly lyricsService: LyricsService,
    private readonly gameSessionService: GameSessionService
  ) {}

  /**
   * Pre-loads up to {@link PARKEUR_TARGET_ROUNDS} lyric rounds from either a curated
   * playlist or a Deezer artist's top tracks (overshooting the track sample to absorb
   * tracks without lyrics) and creates the GameSession. Returns 422 when too few
   * playable rounds can be assembled.
   */
  async startSession(
    userId: string,
    options: ParkeurStartOptions
  ): Promise<ParkeurStartResult | ServiceError> {
    const game = await Game.findBy('name', PARKEUR_GAME_NAME)
    if (!game || !game.isEnabled) {
      return { error: 'Parkeur game is not available', status: 404 }
    }

    const sourceOrError = await this.resolveSource(options)
    if ('error' in sourceOrError) return sourceOrError

    const rounds = await this.buildRounds(sourceOrError.tracks)
    if (rounds.length < PARKEUR_TARGET_ROUNDS) {
      return {
        error: 'Not enough playable lyrics for this selection. Try another one.',
        status: 422,
      }
    }

    const sessionResult = await this.gameSessionService.createGameSession({
      gameId: game.id,
      status: GameSessionStatus.Active,
      players: [{ userId, status: 'active', score: 0, rank: 1 }],
      gameData: {
        ...sourceOrError.meta,
        rounds,
        currentRound: 0,
        score: 0,
        maxScore: rounds.length,
        answers: [],
        startedAt: DateTime.now().toISO(),
        completedAt: null,
        timeElapsed: 0,
      },
    })

    if (!(sessionResult instanceof GameSession)) {
      return sessionResult
    }

    return { session: sessionResult, rounds }
  }

  protected async resolveSource(
    options: ParkeurStartOptions
  ): Promise<ResolvedSource | ServiceError> {
    if (options.mode === 'playlist') {
      try {
        const tracks = await this.curatedPlaylistService.getRandomTracks(
          options.playlistId,
          PARKEUR_TARGET_ROUNDS * PARKEUR_OVERSHOOT_FACTOR
        )
        const playlist = await this.curatedPlaylistService.findById(options.playlistId)
        return {
          tracks,
          meta: { playlistId: options.playlistId, playlistName: playlist!.name },
        }
      } catch (error) {
        if (error instanceof PlaylistNotFoundError) {
          return { error: 'Curated playlist not found', status: 404 }
        }
        if (error instanceof DeezerPlaylistFetchError) {
          return { error: 'Failed to load playlist tracks', status: 502 }
        }
        throw error
      }
    }
    return this.resolveArtistSource(options.artistId)
  }

  protected async resolveArtistSource(artistId: number): Promise<ResolvedSource | ServiceError> {
    let response: Response
    try {
      response = await fetch(
        `${DEEZER_API_BASE}/artist/${artistId}/top?limit=${DEEZER_ARTIST_TOP_LIMIT}`,
        { signal: AbortSignal.timeout(DEEZER_FETCH_TIMEOUT_MS) }
      )
    } catch {
      return { error: 'Failed to load artist top tracks', status: 502 }
    }
    if (!response.ok) {
      return { error: 'Failed to load artist top tracks', status: 502 }
    }
    const payload = (await response.json()) as {
      data?: DeezerPlaylistTrack[]
      error?: { code?: number; message?: string }
    }
    if (payload.error || !payload.data || payload.data.length === 0) {
      return { error: 'Artist not found or has no top tracks', status: 404 }
    }
    return {
      tracks: this.curatedPlaylistService.shuffle(payload.data),
      meta: { artistId, artistName: payload.data[0].artist.name },
    }
  }

  protected async buildRounds(tracks: DeezerPlaylistTrack[]): Promise<ParkeurRound[]> {
    const rounds: ParkeurRound[] = []

    // Process tracks in parallel batches and stop as soon as we have enough rounds.
    // Best case (all tracks have lyrics): one batch ≈ 1-2s instead of 30 sequential
    // calls. Worst case still bounded by tracks.length / PARKEUR_TARGET_ROUNDS batches.
    for (
      let i = 0;
      i < tracks.length && rounds.length < PARKEUR_TARGET_ROUNDS;
      i += PARKEUR_TARGET_ROUNDS
    ) {
      const batch = tracks.slice(i, i + PARKEUR_TARGET_ROUNDS)
      const results = await Promise.allSettled(
        batch.map(async (track) => ({
          track,
          lyrics: await this.lyricsService.getLyricsForTrack({
            id: track.id,
            artist: track.artist.name,
            title: track.title,
          }),
        }))
      )

      for (const result of results) {
        if (rounds.length >= PARKEUR_TARGET_ROUNDS) break
        if (result.status === 'rejected') continue
        const { track, lyrics } = result.value
        if (!lyrics || lyrics.lines.length < 3) continue
        rounds.push(this.pickRound(track, lyrics.lines))
      }
    }

    return rounds
  }

  protected pickRound(track: DeezerPlaylistTrack, lines: string[]): ParkeurRound {
    // Caller guarantees lines.length >= 3 — see buildRounds filter above.
    const startIndex = Math.floor(Math.random() * (lines.length - 2))
    return {
      trackId: track.id,
      artist: track.artist.name,
      title: track.title,
      coverUrl: track.album.cover_xl ?? track.album.cover_big ?? null,
      lines: [lines[startIndex], lines[startIndex + 1]],
      answerLine: lines[startIndex + 2],
    }
  }
}

export default ParkeurService
