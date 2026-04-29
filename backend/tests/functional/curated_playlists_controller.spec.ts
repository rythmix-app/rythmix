import { test } from '@japa/runner'
import CuratedPlaylist from '#models/curated_playlist'
import { createAuthenticatedUser } from '#tests/utils/auth_helpers'
import { deleteCuratedPlaylists } from '#tests/utils/curated_playlist_helpers'

const sampleDeezerTracks = [
  {
    id: 1,
    title: 'Song A',
    title_short: 'Song A',
    preview: 'https://preview/a.mp3',
    duration: 30,
    artist: { id: 11, name: 'Artist A' },
    album: { id: 111, title: 'Album A' },
  },
  {
    id: 2,
    title: 'Song B',
    title_short: 'Song B',
    preview: 'https://preview/b.mp3',
    duration: 30,
    artist: { id: 12, name: 'Artist B' },
    album: { id: 112, title: 'Album B' },
  },
]

test.group('CuratedPlaylistsController - GET /api/games/blindtest/playlists', (group) => {
  deleteCuratedPlaylists(group)
  let originalFetch: typeof fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('requires authentication', async ({ client }) => {
    const response = await client.get('/api/games/blindtest/playlists')
    response.assertStatus(401)
  })

  test('returns the list of curated playlists for an authenticated user', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser('curated_index')
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 2000,
      name: 'Hits FR',
      genreLabel: 'Pop FR',
      coverUrl: 'https://cover.example/fr.jpg',
    })

    const response = await client.get('/api/games/blindtest/playlists').bearerToken(token)

    response.assertStatus(200)
    const playlists = response.body().playlists
    assert.isArray(playlists)
    assert.exists(playlists.find((p: { id: number }) => p.id === playlist.id))
  })
})

test.group(
  'CuratedPlaylistsController - GET /api/games/blindtest/playlists/:id/tracks',
  (group) => {
    deleteCuratedPlaylists(group)
    let originalFetch: typeof fetch

    group.each.setup(() => {
      originalFetch = globalThis.fetch
    })

    group.each.teardown(() => {
      globalThis.fetch = originalFetch
    })

    test('requires authentication', async ({ client }) => {
      const response = await client.get('/api/games/blindtest/playlists/1/tracks')
      response.assertStatus(401)
    })

    test('returns 404 when playlist is unknown', async ({ client }) => {
      const { token } = await createAuthenticatedUser('curated_404')
      const response = await client
        .get('/api/games/blindtest/playlists/999999/tracks')
        .bearerToken(token)

      response.assertStatus(404)
      response.assertBodyContains({ message: 'Curated playlist not found' })
    })

    test('returns a sample of tracks fetched from Deezer', async ({ client, assert }) => {
      const { token } = await createAuthenticatedUser('curated_tracks_ok')
      const playlist = await CuratedPlaylist.create({
        deezerPlaylistId: 3000,
        name: 'Rap FR',
        genreLabel: 'Rap FR',
        coverUrl: null,
      })

      let calledUrl: string | null = null
      globalThis.fetch = async (input) => {
        calledUrl = typeof input === 'string' ? input : (input as URL).toString()
        return new Response(
          JSON.stringify({ data: sampleDeezerTracks, total: sampleDeezerTracks.length }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const response = await client
        .get(`/api/games/blindtest/playlists/${playlist.id}/tracks?count=2`)
        .bearerToken(token)

      response.assertStatus(200)
      const tracks = response.body().tracks
      assert.equal(tracks.length, 2)
      assert.include(calledUrl!, '/playlist/3000/tracks')
    })

    test('returns 502 when Deezer fails', async ({ client }) => {
      const { token } = await createAuthenticatedUser('curated_tracks_502')
      const playlist = await CuratedPlaylist.create({
        deezerPlaylistId: 3010,
        name: 'Will fail',
        genreLabel: 'Rock',
        coverUrl: null,
      })

      globalThis.fetch = async () => new Response('boom', { status: 503 })

      const response = await client
        .get(`/api/games/blindtest/playlists/${playlist.id}/tracks`)
        .bearerToken(token)

      response.assertStatus(502)
      response.assertBodyContains({ message: 'Failed to fetch tracks from Deezer' })
    })

    test('rejects invalid count query parameter', async ({ client }) => {
      const { token } = await createAuthenticatedUser('curated_tracks_invalid')
      const playlist = await CuratedPlaylist.create({
        deezerPlaylistId: 3020,
        name: 'Invalid count',
        genreLabel: 'Rock',
        coverUrl: null,
      })

      const response = await client
        .get(`/api/games/blindtest/playlists/${playlist.id}/tracks?count=999`)
        .bearerToken(token)

      response.assertStatus(422)
    })
  }
)
