import { test } from '@japa/runner'
import Game from '#models/game'
import CuratedPlaylist from '#models/curated_playlist'
import { createAuthenticatedUser } from '../utils/auth_helpers.js'
import { CuratedPlaylistService } from '#services/curated_playlist_service'
import { LyricsService } from '#services/lyrics_service'
import { PARKEUR_GAME_NAME, PARKEUR_TARGET_ROUNDS } from '#services/parkeur_service'
import { deleteCuratedPlaylists } from '#tests/utils/curated_playlist_helpers'
import { deleteGameSession } from '#tests/utils/game_session_helpers'

const SAMPLE_LYRICS = Array.from({ length: 25 }, (_, i) => `Ligne ${i + 1}`).join('\n')

const AZ_HTML = `
  <html><body>
    <div class="col-xs-12 col-lg-8 text-center">
      <div class="ringtone"></div>
      <div>${SAMPLE_LYRICS.replace(/\n/g, '<br>') + '<br>line line line line line line line line'}</div>
    </div>
  </body></html>
`

const buildDeezerTrack = (id: number) => ({
  id,
  title: `Track ${id}`,
  title_short: `Track ${id}`,
  preview: `https://preview/${id}.mp3`,
  duration: 30,
  artist: { id: id * 10, name: `Artist ${id}` },
  album: { id: id * 100, title: `Album ${id}` },
})

function fetchMock(handlers: { deezer?: () => Response; azSucceeds?: boolean }) {
  return async (input: any) => {
    const url = typeof input === 'string' ? input : (input as URL).toString()
    if (url.includes('api.deezer.com') && handlers.deezer) return handlers.deezer()
    if (url.includes('azlyrics.com')) {
      return handlers.azSucceeds
        ? new Response(AZ_HTML, { status: 200, headers: { 'Content-Type': 'text/html' } })
        : new Response('not found', { status: 404 })
    }
    // Every other lyrics source returns 500 so Promise.any falls through.
    return new Response('boom', { status: 500 })
  }
}

test.group('ParkeurController - Functional', (group) => {
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

  test('POST /api/games/parkeur/start returns 401 when unauthenticated', async ({ client }) => {
    const res = await client.post('/api/games/parkeur/start').json({ playlistId: 1 })
    res.assertStatus(401)
  })

  test('POST /api/games/parkeur/start returns 422 when payload is invalid', async ({ client }) => {
    const { token } = await createAuthenticatedUser('parkeur_inv')
    const res = await client
      .post('/api/games/parkeur/start')
      .bearerToken(token)
      .json({ playlistId: 'not-a-number' })
    res.assertStatus(422)
  })

  test('POST /api/games/parkeur/start creates session with 10 rounds on happy path', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser('parkeur_ok')
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 8001,
      name: 'Rap FR',
      genreLabel: 'Rap FR',
      coverUrl: null,
    })

    const tracks = Array.from({ length: 30 }, (_, i) => buildDeezerTrack(7000 + i))
    globalThis.fetch = fetchMock({
      deezer: () =>
        new Response(JSON.stringify({ data: tracks, total: tracks.length }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      azSucceeds: true,
    })

    const res = await client
      .post('/api/games/parkeur/start')
      .bearerToken(token)
      .json({ playlistId: playlist.id })

    res.assertStatus(201)
    const body = res.body()
    assert.equal(body.rounds.length, PARKEUR_TARGET_ROUNDS)
    assert.equal(body.session.gameData.maxScore, PARKEUR_TARGET_ROUNDS)
    assert.equal(body.session.gameData.playlistId, playlist.id)
  })

  test('POST /api/games/parkeur/start returns 422 when lyrics are missing', async ({ client }) => {
    const { token } = await createAuthenticatedUser('parkeur_miss')
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 8002,
      name: 'Mostly instrumental',
      genreLabel: 'Lounge',
      coverUrl: null,
    })

    const tracks = Array.from({ length: 30 }, (_, i) => buildDeezerTrack(8000 + i))
    globalThis.fetch = fetchMock({
      deezer: () =>
        new Response(JSON.stringify({ data: tracks, total: tracks.length }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      azSucceeds: false,
    })

    const res = await client
      .post('/api/games/parkeur/start')
      .bearerToken(token)
      .json({ playlistId: playlist.id })

    res.assertStatus(422)
  })

  test('POST /api/games/parkeur/start returns 404 when playlist does not exist', async ({
    client,
  }) => {
    const { token } = await createAuthenticatedUser('parkeur_nopl')
    const res = await client
      .post('/api/games/parkeur/start')
      .bearerToken(token)
      .json({ playlistId: 999999 })
    res.assertStatus(404)
  })

  test('POST /api/games/parkeur/start returns 500 when an unexpected error occurs', async ({
    client,
  }) => {
    const { token } = await createAuthenticatedUser('parkeur_500')
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 8003,
      name: 'Crashing',
      genreLabel: 'Rock',
      coverUrl: null,
    })

    // Returning a 200 with invalid JSON triggers a SyntaxError in response.json(),
    // which is not caught by curated_playlist_service and propagates up — exactly the
    // unexpected-error path that parkeur_service rethrows and the controller renders as 500.
    globalThis.fetch = async (input: any) => {
      const url = typeof input === 'string' ? input : (input as URL).toString()
      if (url.includes('api.deezer.com'))
        return new Response('not-json', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      throw new Error(`Unexpected URL ${url}`)
    }

    const res = await client
      .post('/api/games/parkeur/start')
      .bearerToken(token)
      .json({ playlistId: playlist.id })

    res.assertStatus(500)
  })

  test('POST /api/games/parkeur/start returns 422 when neither playlistId nor artistId is set', async ({
    client,
  }) => {
    const { token } = await createAuthenticatedUser('parkeur_neither')
    const res = await client.post('/api/games/parkeur/start').bearerToken(token).json({})
    res.assertStatus(422)
  })

  test('POST /api/games/parkeur/start returns 422 when both playlistId and artistId are set', async ({
    client,
  }) => {
    const { token } = await createAuthenticatedUser('parkeur_both')
    const res = await client
      .post('/api/games/parkeur/start')
      .bearerToken(token)
      .json({ playlistId: 1, artistId: 27 })
    res.assertStatus(422)
  })

  test('POST /api/games/parkeur/start with artistId creates a session from Deezer top tracks', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser('parkeur_artist_func')
    const tracks = Array.from({ length: 30 }, (_, i) => ({
      id: 6000 + i,
      title: `Track ${i}`,
      title_short: `Track ${i}`,
      preview: `https://preview/${i}.mp3`,
      duration: 30,
      artist: { id: 27, name: 'Stromae' },
      album: { id: i + 1, title: `Album ${i}` },
    }))
    globalThis.fetch = fetchMock({
      deezer: () =>
        new Response(JSON.stringify({ data: tracks }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      azSucceeds: true,
    })

    const res = await client
      .post('/api/games/parkeur/start')
      .bearerToken(token)
      .json({ artistId: 27 })

    res.assertStatus(201)
    const body = res.body() as any
    assert.equal(body.session.gameData.artistId, 27)
    assert.equal(body.session.gameData.artistName, 'Stromae')
  })
})
