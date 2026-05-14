import { test } from '@japa/runner'
import CuratedPlaylist from '#models/curated_playlist'
import { CuratedPlaylistService } from '#services/curated_playlist_service'
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
    CuratedPlaylistService.clearCache()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
    CuratedPlaylistService.clearCache()
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
      CuratedPlaylistService.clearCache()
    })

    group.each.teardown(() => {
      globalThis.fetch = originalFetch
      CuratedPlaylistService.clearCache()
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

const metaResponse = (body: Record<string, unknown>, status: number = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const validMeta = (id: number, title: string = 'Imported') =>
  metaResponse({
    id,
    title,
    picture_xl: `https://cdn/${id}.jpg`,
    nb_tracks: 100,
  })

test.group(
  'CuratedPlaylistsController - GET /api/games/blindtest/playlists/:id/all-tracks',
  (group) => {
    deleteCuratedPlaylists(group)
    let originalFetch: typeof fetch

    group.each.setup(() => {
      originalFetch = globalThis.fetch
      CuratedPlaylistService.clearCache()
    })

    group.each.teardown(() => {
      globalThis.fetch = originalFetch
      CuratedPlaylistService.clearCache()
    })

    test('requires authentication', async ({ client }) => {
      const response = await client.get('/api/games/blindtest/playlists/1/all-tracks')
      response.assertStatus(401)
    })

    test('rejects non-admin users', async ({ client }) => {
      const { token } = await createAuthenticatedUser('curated_all_user', 'user')
      const response = await client
        .get('/api/games/blindtest/playlists/1/all-tracks')
        .bearerToken(token)
      response.assertStatus(403)
    })

    test('returns 400 when the playlist id is not numeric', async ({ client }) => {
      const { token } = await createAuthenticatedUser('curated_all_badid', 'admin')
      const response = await client
        .get('/api/games/blindtest/playlists/not-a-number/all-tracks')
        .bearerToken(token)
      response.assertStatus(400)
    })

    test('returns 404 when the playlist is unknown', async ({ client }) => {
      const { token } = await createAuthenticatedUser('curated_all_missing', 'admin')
      const response = await client
        .get('/api/games/blindtest/playlists/9999999/all-tracks')
        .bearerToken(token)
      response.assertStatus(404)
    })

    test('returns every track in catalogue order for an admin', async ({ client, assert }) => {
      const { token } = await createAuthenticatedUser('curated_all_admin', 'admin')
      const playlist = await CuratedPlaylist.create({
        deezerPlaylistId: 8000,
        name: 'Full',
        genreLabel: 'Pop',
        coverUrl: null,
      })

      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({ data: sampleDeezerTracks, total: sampleDeezerTracks.length }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )

      const response = await client
        .get(`/api/games/blindtest/playlists/${playlist.id}/all-tracks`)
        .bearerToken(token)

      response.assertStatus(200)
      const tracks = response.body().tracks
      assert.deepEqual(
        tracks.map((t: { id: number }) => t.id),
        sampleDeezerTracks.map((t) => t.id)
      )
    })

    test('returns 502 when Deezer fails', async ({ client }) => {
      const { token } = await createAuthenticatedUser('curated_all_502', 'admin')
      const playlist = await CuratedPlaylist.create({
        deezerPlaylistId: 8010,
        name: 'Failing',
        genreLabel: 'Pop',
        coverUrl: null,
      })

      globalThis.fetch = async () => new Response('boom', { status: 500 })

      const response = await client
        .get(`/api/games/blindtest/playlists/${playlist.id}/all-tracks`)
        .bearerToken(token)

      response.assertStatus(502)
    })
  }
)

test.group('CuratedPlaylistsController - POST /api/games/blindtest/playlists', (group) => {
  deleteCuratedPlaylists(group)
  let originalFetch: typeof fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
    CuratedPlaylistService.clearCache()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
    CuratedPlaylistService.clearCache()
  })

  test('requires authentication', async ({ client }) => {
    const response = await client.post('/api/games/blindtest/playlists').json({
      url: 'https://www.deezer.com/playlist/4000',
      genreLabel: 'Pop',
    })
    response.assertStatus(401)
  })

  test('rejects non-admin users', async ({ client }) => {
    const { token } = await createAuthenticatedUser('curated_post_user', 'user')
    const response = await client
      .post('/api/games/blindtest/playlists')
      .json({ url: 'https://www.deezer.com/playlist/4000', genreLabel: 'Pop' })
      .bearerToken(token)
    response.assertStatus(403)
  })

  test('creates a curated playlist for an admin', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('curated_post_admin', 'admin')
    globalThis.fetch = async () => validMeta(4010, 'Deezer Title')

    const response = await client
      .post('/api/games/blindtest/playlists')
      .json({ url: 'https://www.deezer.com/fr/playlist/4010', genreLabel: 'Pop' })
      .bearerToken(token)

    response.assertStatus(201)
    const playlist = response.body().playlist
    assert.equal(playlist.deezerPlaylistId, 4010)
    assert.equal(playlist.name, 'Deezer Title')
    assert.equal(playlist.genreLabel, 'Pop')
    assert.equal(playlist.nameOverridden, false)
  })

  test('returns 400 on invalid Deezer URL', async ({ client }) => {
    const { token } = await createAuthenticatedUser('curated_post_bad_url', 'admin')
    const response = await client
      .post('/api/games/blindtest/playlists')
      .json({ url: 'https://malicious.example/playlist/123', genreLabel: 'Pop' })
      .bearerToken(token)
    response.assertStatus(400)
    response.assertBodyContains({ message: 'Invalid Deezer playlist URL' })
  })

  test('returns 422 on missing required fields', async ({ client }) => {
    const { token } = await createAuthenticatedUser('curated_post_bad_body', 'admin')
    const response = await client
      .post('/api/games/blindtest/playlists')
      .json({ genreLabel: 'Pop' })
      .bearerToken(token)
    response.assertStatus(422)
  })

  test('returns 409 when the Deezer playlist already exists', async ({ client }) => {
    const { token } = await createAuthenticatedUser('curated_post_dup', 'admin')
    await CuratedPlaylist.create({
      deezerPlaylistId: 4020,
      name: 'Existing',
      genreLabel: 'Pop',
      coverUrl: null,
    })

    const response = await client
      .post('/api/games/blindtest/playlists')
      .json({ url: 'https://www.deezer.com/playlist/4020', genreLabel: 'Pop' })
      .bearerToken(token)

    response.assertStatus(409)
  })

  test('returns 404 when Deezer reports the playlist missing', async ({ client }) => {
    const { token } = await createAuthenticatedUser('curated_post_404', 'admin')
    globalThis.fetch = async () =>
      metaResponse({ error: { code: 800, type: 'DataException', message: 'no data' } })

    const response = await client
      .post('/api/games/blindtest/playlists')
      .json({ url: 'https://www.deezer.com/playlist/4030', genreLabel: 'Pop' })
      .bearerToken(token)

    response.assertStatus(404)
  })

  test('returns 502 when Deezer is unreachable', async ({ client }) => {
    const { token } = await createAuthenticatedUser('curated_post_502', 'admin')
    globalThis.fetch = async () => new Response('boom', { status: 500 })

    const response = await client
      .post('/api/games/blindtest/playlists')
      .json({ url: 'https://www.deezer.com/playlist/4040', genreLabel: 'Pop' })
      .bearerToken(token)

    response.assertStatus(502)
  })
})

test.group('CuratedPlaylistsController - PATCH /api/games/blindtest/playlists/:id', (group) => {
  deleteCuratedPlaylists(group)

  test('requires authentication', async ({ client }) => {
    const response = await client.patch('/api/games/blindtest/playlists/1').json({ name: 'New' })
    response.assertStatus(401)
  })

  test('rejects non-admin users', async ({ client }) => {
    const { token } = await createAuthenticatedUser('curated_patch_user', 'user')
    const response = await client
      .patch('/api/games/blindtest/playlists/1')
      .json({ name: 'New' })
      .bearerToken(token)
    response.assertStatus(403)
  })

  test('renames the playlist and flips nameOverridden', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('curated_patch_admin', 'admin')
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 5000,
      name: 'Initial',
      genreLabel: 'Pop',
      coverUrl: null,
    })

    const response = await client
      .patch(`/api/games/blindtest/playlists/${playlist.id}`)
      .json({ name: 'Renamed by admin' })
      .bearerToken(token)

    response.assertStatus(200)
    const updated = response.body().playlist
    assert.equal(updated.name, 'Renamed by admin')
    assert.isTrue(updated.nameOverridden)
  })

  test('returns 422 on empty name', async ({ client }) => {
    const { token } = await createAuthenticatedUser('curated_patch_empty', 'admin')
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 5010,
      name: 'Initial',
      genreLabel: 'Pop',
      coverUrl: null,
    })
    const response = await client
      .patch(`/api/games/blindtest/playlists/${playlist.id}`)
      .json({ name: '' })
      .bearerToken(token)
    response.assertStatus(422)
  })

  test('returns 400 when the playlist id is not numeric', async ({ client }) => {
    const { token } = await createAuthenticatedUser('curated_patch_badid', 'admin')
    const response = await client
      .patch('/api/games/blindtest/playlists/not-a-number')
      .json({ name: 'whatever' })
      .bearerToken(token)
    response.assertStatus(400)
  })

  test('returns 404 when the playlist is unknown', async ({ client }) => {
    const { token } = await createAuthenticatedUser('curated_patch_missing', 'admin')
    const response = await client
      .patch('/api/games/blindtest/playlists/9999999')
      .json({ name: 'whatever' })
      .bearerToken(token)
    response.assertStatus(404)
  })
})

test.group(
  'CuratedPlaylistsController - POST /api/games/blindtest/playlists/:id/refresh',
  (group) => {
    deleteCuratedPlaylists(group)
    let originalFetch: typeof fetch

    group.each.setup(() => {
      originalFetch = globalThis.fetch
      CuratedPlaylistService.clearCache()
    })

    group.each.teardown(() => {
      globalThis.fetch = originalFetch
      CuratedPlaylistService.clearCache()
    })

    test('requires authentication', async ({ client }) => {
      const response = await client.post('/api/games/blindtest/playlists/1/refresh')
      response.assertStatus(401)
    })

    test('rejects non-admin users', async ({ client }) => {
      const { token } = await createAuthenticatedUser('curated_refresh_user', 'user')
      const response = await client
        .post('/api/games/blindtest/playlists/1/refresh')
        .bearerToken(token)
      response.assertStatus(403)
    })

    test('refreshes Deezer metadata for an admin', async ({ client, assert }) => {
      const { token } = await createAuthenticatedUser('curated_refresh_admin', 'admin')
      const playlist = await CuratedPlaylist.create({
        deezerPlaylistId: 6000,
        name: 'Initial',
        genreLabel: 'Pop',
        coverUrl: 'https://old/cover.jpg',
        trackCount: 1,
      })

      globalThis.fetch = async () =>
        metaResponse({
          id: 6000,
          title: 'Fresh from Deezer',
          picture_xl: 'https://new/cover.jpg',
          nb_tracks: 250,
        })

      const response = await client
        .post(`/api/games/blindtest/playlists/${playlist.id}/refresh`)
        .bearerToken(token)

      response.assertStatus(200)
      const updated = response.body().playlist
      assert.equal(updated.name, 'Fresh from Deezer')
      assert.equal(updated.coverUrl, 'https://new/cover.jpg')
      assert.equal(updated.trackCount, 250)
    })

    test('returns 400 when the playlist id is not numeric', async ({ client }) => {
      const { token } = await createAuthenticatedUser('curated_refresh_badid', 'admin')
      const response = await client
        .post('/api/games/blindtest/playlists/not-a-number/refresh')
        .bearerToken(token)
      response.assertStatus(400)
    })

    test('returns 404 when the playlist is unknown', async ({ client }) => {
      const { token } = await createAuthenticatedUser('curated_refresh_missing', 'admin')
      const response = await client
        .post('/api/games/blindtest/playlists/9999999/refresh')
        .bearerToken(token)
      response.assertStatus(404)
    })

    test('returns 404 when Deezer no longer hosts the playlist', async ({ client }) => {
      const { token } = await createAuthenticatedUser('curated_refresh_deezer_404', 'admin')
      const playlist = await CuratedPlaylist.create({
        deezerPlaylistId: 6010,
        name: 'Lost',
        genreLabel: 'Pop',
        coverUrl: null,
      })
      globalThis.fetch = async () =>
        metaResponse({ error: { code: 800, type: 'DataException', message: 'no data' } })

      const response = await client
        .post(`/api/games/blindtest/playlists/${playlist.id}/refresh`)
        .bearerToken(token)

      response.assertStatus(404)
    })

    test('returns 502 when Deezer is unreachable', async ({ client }) => {
      const { token } = await createAuthenticatedUser('curated_refresh_502', 'admin')
      const playlist = await CuratedPlaylist.create({
        deezerPlaylistId: 6020,
        name: 'Fails',
        genreLabel: 'Pop',
        coverUrl: null,
      })
      globalThis.fetch = async () => new Response('boom', { status: 500 })

      const response = await client
        .post(`/api/games/blindtest/playlists/${playlist.id}/refresh`)
        .bearerToken(token)

      response.assertStatus(502)
    })
  }
)

test.group('CuratedPlaylistsController - DELETE /api/games/blindtest/playlists/:id', (group) => {
  deleteCuratedPlaylists(group)

  test('requires authentication', async ({ client }) => {
    const response = await client.delete('/api/games/blindtest/playlists/1')
    response.assertStatus(401)
  })

  test('rejects non-admin users', async ({ client }) => {
    const { token } = await createAuthenticatedUser('curated_delete_user', 'user')
    const response = await client.delete('/api/games/blindtest/playlists/1').bearerToken(token)
    response.assertStatus(403)
  })

  test('deletes the playlist for an admin', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('curated_delete_admin', 'admin')
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 7000,
      name: 'Doomed',
      genreLabel: 'Pop',
      coverUrl: null,
    })

    const response = await client
      .delete(`/api/games/blindtest/playlists/${playlist.id}`)
      .bearerToken(token)

    response.assertStatus(204)
    const remaining = await CuratedPlaylist.query().where('id', playlist.id).first()
    assert.isNull(remaining)
  })

  test('returns 400 when the playlist id is not numeric', async ({ client }) => {
    const { token } = await createAuthenticatedUser('curated_delete_badid', 'admin')
    const response = await client
      .delete('/api/games/blindtest/playlists/not-a-number')
      .bearerToken(token)
    response.assertStatus(400)
  })

  test('returns 404 when the playlist is unknown', async ({ client }) => {
    const { token } = await createAuthenticatedUser('curated_delete_missing', 'admin')
    const response = await client
      .delete('/api/games/blindtest/playlists/9999999')
      .bearerToken(token)
    response.assertStatus(404)
  })
})
