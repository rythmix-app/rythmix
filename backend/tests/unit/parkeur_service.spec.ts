import { test } from '@japa/runner'
import Game from '#models/game'
import GameSession from '#models/game_session'
import CuratedPlaylist from '#models/curated_playlist'
import { GameSessionService } from '#services/game_session_service'
import { LyricsService, type LyricsResult } from '#services/lyrics_service'
import { CuratedPlaylistService } from '#services/curated_playlist_service'
import { PARKEUR_GAME_NAME, PARKEUR_TARGET_ROUNDS, ParkeurService } from '#services/parkeur_service'
import { GameSessionStatus } from '#enums/game_session_status'
import { createAuthenticatedUser } from '../utils/auth_helpers.js'
import { deleteCuratedPlaylists } from '#tests/utils/curated_playlist_helpers'
import { deleteGameSession } from '#tests/utils/game_session_helpers'

const SAMPLE_LINES = Array.from({ length: 25 }, (_, i) => `Ligne ${i + 1}`)

class FakeLyricsService extends LyricsService {
  private calls = 0
  constructor(
    private behavior: 'success' | 'fail' | 'mixed' | 'throw' | 'first-half-fail' = 'success'
  ) {
    super()
  }

  async getLyricsForTrack(_track: {
    id?: number
    artist: string
    title: string
  }): Promise<LyricsResult | null> {
    this.calls += 1
    if (this.behavior === 'fail') return null
    if (this.behavior === 'throw') throw new Error('boom')
    if (this.behavior === 'mixed') {
      // Deterministic: every 4th call throws, every 3rd returns null, rest succeed.
      // With batches of 10 we still average ~5 successes per batch.
      if (this.calls % 4 === 0) throw new Error('boom')
      if (this.calls % 3 === 0) return null
    }
    if (this.behavior === 'first-half-fail') {
      // Calls 1-5 return null, calls 6+ all succeed. Batch 1 yields 5 (rounds=5),
      // batch 2 would yield 10 — exercises the inner break that caps rounds at target.
      if (this.calls <= 5) return null
    }
    return { lines: [...SAMPLE_LINES], source: 'fake' }
  }
}

const buildDeezerTrack = (id: number) => ({
  id,
  title: `Track ${id}`,
  title_short: `Track ${id}`,
  preview: `https://preview/${id}.mp3`,
  duration: 30,
  artist: { id: id * 10, name: `Artist ${id}` },
  album: { id: id * 100, title: `Album ${id}` },
})

function deezerFetchMock(response: () => Response) {
  return async (input: any) => {
    const url = typeof input === 'string' ? input : (input as URL).toString()
    if (url.includes('api.deezer.com')) return response()
    throw new Error(`Unexpected URL ${url}`)
  }
}

function makeService(lyrics: LyricsService = new FakeLyricsService('success')) {
  return new ParkeurService(new CuratedPlaylistService(), lyrics, new GameSessionService())
}

test.group('ParkeurService', (group) => {
  deleteCuratedPlaylists(group)
  deleteGameSession(group)

  let originalFetch: typeof fetch

  group.each.setup(async () => {
    originalFetch = globalThis.fetch
    CuratedPlaylistService.clearCache()
    LyricsService.clearCache()
    await Game.updateOrCreate(
      { name: PARKEUR_GAME_NAME },
      {
        name: PARKEUR_GAME_NAME,
        description: 'Devine la suite des paroles',
        isMultiplayer: false,
        isEnabled: true,
      }
    )
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
    CuratedPlaylistService.clearCache()
  })

  test('startSession builds 10 rounds and creates a Parkeur GameSession', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('parkeur_happy')
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 9001,
      name: 'Rap FR',
      genreLabel: 'Rap FR',
      coverUrl: null,
    })

    const tracks = Array.from({ length: 30 }, (_, i) => buildDeezerTrack(i + 1))
    globalThis.fetch = deezerFetchMock(
      () =>
        new Response(JSON.stringify({ data: tracks, total: tracks.length }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    )

    const result = await makeService().startSession(user.id, {
      mode: 'playlist',
      playlistId: playlist.id,
    })
    assert.notProperty(result, 'error')
    if ('error' in result) throw new Error('expected success')
    assert.lengthOf(result.rounds, PARKEUR_TARGET_ROUNDS)
    for (const round of result.rounds) {
      assert.lengthOf(round.lines, 2)
      assert.isString(round.answerLine)
      assert.notInclude([...round.lines, round.answerLine], '')
    }
    assert.equal(result.session.status, GameSessionStatus.Active)
    assert.equal((result.session.gameData as any).playlistName, 'Rap FR')
    assert.equal((result.session.gameData as any).maxScore, PARKEUR_TARGET_ROUNDS)
  })

  test('startSession returns 422 when not enough lyrics are available', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('parkeur_few')
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 9002,
      name: 'Mostly instrumental',
      genreLabel: 'Lounge',
      coverUrl: null,
    })

    const tracks = Array.from({ length: 30 }, (_, i) => buildDeezerTrack(2000 + i))
    globalThis.fetch = deezerFetchMock(
      () =>
        new Response(JSON.stringify({ data: tracks, total: tracks.length }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    )

    const result = await makeService(new FakeLyricsService('fail')).startSession(user.id, {
      mode: 'playlist',
      playlistId: playlist.id,
    })
    assert.equal((result as any).status, 422)
    assert.match((result as any).error, /Not enough playable lyrics/)
  })

  test('startSession returns 404 when the playlist does not exist', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('parkeur_nopl')
    const result = await makeService().startSession(user.id, {
      mode: 'playlist',
      playlistId: 999999,
    })
    assert.equal((result as any).status, 404)
    assert.match((result as any).error, /Curated playlist not found/)
  })

  test('startSession returns 502 when the Deezer fetch fails', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('parkeur_502')
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 9003,
      name: 'Failing',
      genreLabel: 'Pop',
      coverUrl: null,
    })

    globalThis.fetch = deezerFetchMock(() => new Response('boom', { status: 500 }))

    const result = await makeService().startSession(user.id, {
      mode: 'playlist',
      playlistId: playlist.id,
    })
    assert.equal((result as any).status, 502)
  })

  test('startSession returns 404 when the Parkeur game is disabled', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('parkeur_disabled')
    await Game.updateOrCreate(
      { name: PARKEUR_GAME_NAME },
      { name: PARKEUR_GAME_NAME, isEnabled: false, isMultiplayer: false, description: 'x' }
    )

    const result = await makeService().startSession(user.id, { mode: 'playlist', playlistId: 1 })
    assert.equal((result as any).status, 404)
    assert.match((result as any).error, /not available/)
  })

  test('startSession propagates 409 when an active session already exists', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('parkeur_active')
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 9004,
      name: 'Pop',
      genreLabel: 'Pop',
      coverUrl: null,
    })
    const game = await Game.findBy('name', PARKEUR_GAME_NAME)
    await GameSession.create({
      gameId: game!.id,
      status: GameSessionStatus.Active,
      players: [{ userId: user.id, status: 'active', score: 0, rank: 1 }],
      gameData: {},
    })

    globalThis.fetch = deezerFetchMock(
      () =>
        new Response(
          JSON.stringify({
            data: Array.from({ length: 30 }, (_, i) => buildDeezerTrack(3000 + i)),
            total: 30,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    )

    const result = await makeService().startSession(user.id, {
      mode: 'playlist',
      playlistId: playlist.id,
    })
    assert.equal((result as any).status, 409)
  })

  test('startSession rethrows unexpected errors from the playlist service', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('parkeur_throw')
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 9006,
      name: 'Boom',
      genreLabel: 'Pop',
      coverUrl: null,
    })

    const customSvc = new (class extends CuratedPlaylistService {
      async getRandomTracks(): Promise<any> {
        throw new Error('unexpected boom')
      }
    })()
    const customService = new ParkeurService(
      customSvc,
      new FakeLyricsService('success'),
      new GameSessionService()
    )

    await assert.rejects(async () => {
      await customService.startSession(user.id, { mode: 'playlist', playlistId: playlist.id })
    }, /unexpected boom/)
  })

  test('startSession caps rounds at the target even when a later batch would overshoot', async ({
    assert,
  }) => {
    const { user } = await createAuthenticatedUser('parkeur_cap')
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 9008,
      name: 'Cap',
      genreLabel: 'Pop',
      coverUrl: null,
    })

    const tracks = Array.from({ length: 30 }, (_, i) => buildDeezerTrack(7000 + i))
    globalThis.fetch = deezerFetchMock(
      () =>
        new Response(JSON.stringify({ data: tracks, total: tracks.length }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    )

    const result = await makeService(new FakeLyricsService('first-half-fail')).startSession(
      user.id,
      { mode: 'playlist', playlistId: playlist.id }
    )
    if ('error' in result) throw new Error('expected success')
    assert.lengthOf(result.rounds, PARKEUR_TARGET_ROUNDS)
  })

  test('buildRounds skips tracks whose lyrics service throws and still completes 10 rounds', async ({
    assert,
  }) => {
    const { user } = await createAuthenticatedUser('parkeur_throwlyrics')
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 9007,
      name: 'Mixed throws',
      genreLabel: 'Rap',
      coverUrl: null,
    })

    const tracks = Array.from({ length: 60 }, (_, i) => buildDeezerTrack(5000 + i))
    globalThis.fetch = deezerFetchMock(
      () =>
        new Response(JSON.stringify({ data: tracks, total: tracks.length }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    )

    const result = await makeService(new FakeLyricsService('mixed')).startSession(user.id, {
      mode: 'playlist',
      playlistId: playlist.id,
    })
    if ('error' in result) throw new Error('expected success')
    assert.lengthOf(result.rounds, PARKEUR_TARGET_ROUNDS)
  })

  test('startSession with artist mode builds 10 rounds from Deezer top tracks', async ({
    assert,
  }) => {
    const { user } = await createAuthenticatedUser('parkeur_artist_ok')
    const tracks = Array.from({ length: 30 }, (_, i) => buildDeezerTrack(8000 + i))
    globalThis.fetch = deezerFetchMock(
      () =>
        new Response(JSON.stringify({ data: tracks }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    )

    const result = await makeService().startSession(user.id, { mode: 'artist', artistId: 27 })
    if ('error' in result) throw new Error('expected success')
    assert.lengthOf(result.rounds, PARKEUR_TARGET_ROUNDS)
    assert.equal((result.session.gameData as any).artistId, 27)
    assert.equal((result.session.gameData as any).artistName, 'Artist 8000')
  })

  test('startSession with artist mode returns 404 when Deezer responds with an error payload', async ({
    assert,
  }) => {
    const { user } = await createAuthenticatedUser('parkeur_artist_404')
    globalThis.fetch = deezerFetchMock(
      () =>
        new Response(JSON.stringify({ error: { code: 800, message: 'no data' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    )

    const result = await makeService().startSession(user.id, { mode: 'artist', artistId: 99 })
    assert.equal((result as any).status, 404)
    assert.match((result as any).error, /Artist not found/)
  })

  test('startSession with artist mode returns 404 when Deezer returns an empty data array', async ({
    assert,
  }) => {
    const { user } = await createAuthenticatedUser('parkeur_artist_empty')
    globalThis.fetch = deezerFetchMock(
      () =>
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    )

    const result = await makeService().startSession(user.id, { mode: 'artist', artistId: 99 })
    assert.equal((result as any).status, 404)
  })

  test('startSession with artist mode returns 502 when Deezer fetch errors out', async ({
    assert,
  }) => {
    const { user } = await createAuthenticatedUser('parkeur_artist_502')
    globalThis.fetch = deezerFetchMock(() => new Response('boom', { status: 500 }))

    const result = await makeService().startSession(user.id, { mode: 'artist', artistId: 99 })
    assert.equal((result as any).status, 502)
  })

  test('startSession with artist mode returns 502 when fetch throws (network error)', async ({
    assert,
  }) => {
    const { user } = await createAuthenticatedUser('parkeur_artist_net')
    globalThis.fetch = (async () => {
      throw new Error('network down')
    }) as any

    const result = await makeService().startSession(user.id, { mode: 'artist', artistId: 99 })
    assert.equal((result as any).status, 502)
  })
})
