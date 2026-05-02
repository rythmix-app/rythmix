import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import User from '#models/user'
import UserTrackInteraction from '#models/user_track_interaction'
import { SpotifyApiError, SpotifyService } from '#services/spotify_service'
import { SpotifyPlaylistService } from '#services/spotify_playlist_service'
import { InteractionAction } from '#enums/interaction_action'
import { deleteUserIntegrations } from '#tests/utils/user_integration_helpers'
import { deleteTrackInteractions } from '#tests/utils/track_interaction_helpers'

async function createUser(tag: string) {
  return User.create({
    username: `pl_${tag}_${Date.now()}_${Math.random()}`,
    email: `pl_${tag}_${Date.now()}_${Math.random()}@example.com`,
    password: 'password123',
  })
}

async function linkSpotify(
  service: SpotifyService,
  userId: string,
  scopes: string = 'user-read-email playlist-modify-private'
) {
  await service.upsertIntegration(userId, {
    providerUserId: `sp_${userId.slice(0, 6)}`,
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresAt: DateTime.now().plus({ hours: 1 }),
    scopes,
  })
}

async function createLikedInteraction(
  userId: string,
  overrides: Partial<{
    deezerTrackId: string
    isrc: string | null
    title: string
    artist: string
  }> = {}
) {
  return UserTrackInteraction.create({
    userId,
    deezerTrackId: overrides.deezerTrackId ?? '12345',
    action: InteractionAction.Liked,
    title: overrides.title ?? 'Track Title',
    artist: overrides.artist ?? 'Artist Name',
    isrc: overrides.isrc === undefined ? 'USXX12345678' : overrides.isrc,
  })
}

interface FakeRequestRecord {
  path: string
  options: { method?: string; query?: Record<string, string>; body?: unknown }
}

function buildPlaylistService(
  responder: (record: FakeRequestRecord) => Promise<unknown> | unknown
) {
  const spotify = new SpotifyService()
  const calls: FakeRequestRecord[] = []
  spotify.spotifyApiRequest = (async (
    _userId: string,
    path: string,
    options: { method?: string; query?: Record<string, string>; body?: unknown } = {}
  ) => {
    const record = { path, options }
    calls.push(record)
    return responder(record)
  }) as typeof spotify.spotifyApiRequest

  return { service: new SpotifyPlaylistService(spotify), calls, spotify }
}

test.group('SpotifyPlaylistService - getOrCreateLikedPlaylist', (group) => {
  deleteUserIntegrations(group)
  deleteTrackInteractions(group)

  test('returns stored playlist id without calling API', async ({ assert }) => {
    const user = await createUser('cached_id')
    const { service, spotify, calls } = buildPlaylistService(async () => ({}))
    await linkSpotify(spotify, user.id)
    const integration = await spotify.findByUserId(user.id)
    integration!.spotifyLikedPlaylistId = 'pl_existing'
    await integration!.save()

    const id = await service.getOrCreateLikedPlaylist(user.id)
    assert.equal(id, 'pl_existing')
    assert.equal(calls.length, 0)
  })

  test('throws scope upgrade required when scopes lack playlist-modify-private', async ({
    assert,
  }) => {
    const user = await createUser('no_scope')
    const { service, spotify } = buildPlaylistService(async () => ({}))
    await linkSpotify(spotify, user.id, 'user-read-email user-top-read')

    await assert.rejects(async () => {
      await service.getOrCreateLikedPlaylist(user.id)
    }, /SPOTIFY_SCOPE_UPGRADE_REQUIRED/)
  })

  test('creates the playlist via POST and stores the returned id', async ({ assert }) => {
    const user = await createUser('create_ok')
    const { service, spotify, calls } = buildPlaylistService(async (record) => {
      if (record.path.includes('/playlists') && record.options.method === 'POST') {
        return { id: 'pl_new' }
      }
      return {}
    })
    await linkSpotify(spotify, user.id)

    const id = await service.getOrCreateLikedPlaylist(user.id)
    assert.equal(id, 'pl_new')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].options.method, 'POST')

    const integration = await spotify.findByUserId(user.id)
    assert.equal(integration!.spotifyLikedPlaylistId, 'pl_new')
  })

  test('throws SpotifyNotConnectedError when integration missing', async ({ assert }) => {
    const user = await createUser('missing')
    const { service } = buildPlaylistService(async () => ({}))
    await assert.rejects(async () => {
      await service.getOrCreateLikedPlaylist(user.id)
    }, /SPOTIFY_NOT_CONNECTED/)
  })

  test('throws scope upgrade required when integration has no scopes recorded', async ({
    assert,
  }) => {
    const user = await createUser('null_scope')
    const { service, spotify } = buildPlaylistService(async () => ({}))
    await linkSpotify(spotify, user.id, '')

    await assert.rejects(async () => {
      await service.getOrCreateLikedPlaylist(user.id)
    }, /SPOTIFY_SCOPE_UPGRADE_REQUIRED/)
  })

  test('translates 403 from playlist creation into scope upgrade required', async ({ assert }) => {
    const user = await createUser('forbidden')
    const { service, spotify } = buildPlaylistService(async () => {
      throw new SpotifyApiError(403, '/users/x/playlists')
    })
    await linkSpotify(spotify, user.id)

    await assert.rejects(async () => {
      await service.getOrCreateLikedPlaylist(user.id)
    }, /SPOTIFY_SCOPE_UPGRADE_REQUIRED/)
  })
})

test.group('SpotifyPlaylistService - addTrack', (group) => {
  deleteUserIntegrations(group)
  deleteTrackInteractions(group)

  test('matches by ISRC and adds the track with the right URI', async ({ assert }) => {
    const user = await createUser('add_isrc')
    const { service, spotify, calls } = buildPlaylistService(async (record) => {
      if (record.path === '/search') {
        return { tracks: { items: [{ uri: 'spotify:track:abc123' }] } }
      }
      if (record.path.endsWith('/playlists') && record.options.method === 'POST') {
        return { id: 'pl_test' }
      }
      if (record.path.includes('/items') && record.options.method === 'GET') {
        return { items: [], next: null }
      }
      return {}
    })
    await linkSpotify(spotify, user.id)
    await createLikedInteraction(user.id, { isrc: 'USXX12345678' })

    const result = await service.addTrack(user.id, '12345')
    assert.deepEqual(result, { added: true })

    const search = calls.find((c) => c.path === '/search')!
    assert.equal(search.options.query!.q, 'isrc:USXX12345678')

    const addCall = calls.find(
      (c) => c.path === '/playlists/pl_test/items' && c.options.method === 'POST'
    )!
    assert.deepEqual(addCall.options.body, { uris: ['spotify:track:abc123'] })
  })

  test('falls back to title+artist search when ISRC matches nothing', async ({ assert }) => {
    const user = await createUser('add_fallback')
    let searchCalls = 0
    const { service, spotify, calls } = buildPlaylistService(async (record) => {
      if (record.path === '/search') {
        searchCalls++
        if (searchCalls === 1) {
          return { tracks: { items: [] } }
        }
        return { tracks: { items: [{ uri: 'spotify:track:fallback' }] } }
      }
      if (record.path.endsWith('/playlists') && record.options.method === 'POST') {
        return { id: 'pl_fb' }
      }
      if (record.path.includes('/items') && record.options.method === 'GET') {
        return { items: [], next: null }
      }
      return {}
    })
    await linkSpotify(spotify, user.id)
    await createLikedInteraction(user.id, {
      isrc: 'USXX99999999',
      title: 'Hello',
      artist: 'Adele',
    })

    const result = await service.addTrack(user.id, '12345')
    assert.deepEqual(result, { added: true })
    assert.equal(searchCalls, 2)
    const fallback = calls.filter((c) => c.path === '/search')[1]
    assert.match(fallback.options.query!.q, /track:.*Hello.*artist:.*Adele/)
  })

  test('returns notOnSpotify when both searches return empty', async ({ assert }) => {
    const user = await createUser('add_not_on_spotify')
    const { service, spotify } = buildPlaylistService(async (record) => {
      if (record.path === '/search') return { tracks: { items: [] } }
      return {}
    })
    await linkSpotify(spotify, user.id)
    await createLikedInteraction(user.id, { isrc: 'USXX00000000' })

    const result = await service.addTrack(user.id, '12345')
    assert.deepEqual(result, { added: false, notOnSpotify: true })
  })

  test('is idempotent: skips POST when track already in playlist', async ({ assert }) => {
    const user = await createUser('idempotent')
    const { service, spotify, calls } = buildPlaylistService(async (record) => {
      if (record.path === '/search') {
        return { tracks: { items: [{ uri: 'spotify:track:dup' }] } }
      }
      if (record.path.endsWith('/playlists') && record.options.method === 'POST') {
        return { id: 'pl_idem' }
      }
      if (record.path.includes('/items') && record.options.method === 'GET') {
        return { items: [{ track: { uri: 'spotify:track:dup' } }], next: null }
      }
      return {}
    })
    await linkSpotify(spotify, user.id)
    await createLikedInteraction(user.id)

    const result = await service.addTrack(user.id, '12345')
    assert.deepEqual(result, { added: false })

    const addCall = calls.find(
      (c) => c.path === '/playlists/pl_idem/items' && c.options.method === 'POST'
    )
    assert.isUndefined(addCall)
  })

  test('returns added:false when the interaction does not exist', async ({ assert }) => {
    const user = await createUser('add_no_interaction')
    const { service, spotify } = buildPlaylistService(async () => ({}))
    await linkSpotify(spotify, user.id)
    const result = await service.addTrack(user.id, 'unknown')
    assert.deepEqual(result, { added: false })
  })

  test('paginates the playlist when checking for duplicates', async ({ assert }) => {
    const user = await createUser('paginate')
    let getCalls = 0
    const { service, spotify, calls } = buildPlaylistService(async (record) => {
      if (record.path === '/search') {
        return { tracks: { items: [{ uri: 'spotify:track:dup' }] } }
      }
      if (record.path.endsWith('/playlists') && record.options.method === 'POST') {
        return { id: 'pl_paged' }
      }
      if (record.path.includes('/items') && record.options.method === 'GET') {
        getCalls++
        if (getCalls === 1) {
          return {
            items: [{ track: { uri: 'spotify:track:other' } }],
            next: 'https://api.spotify.com/v1/playlists/pl_paged/items?offset=100&limit=100',
          }
        }
        return { items: [{ track: { uri: 'spotify:track:dup' } }], next: null }
      }
      return {}
    })
    await linkSpotify(spotify, user.id)
    await createLikedInteraction(user.id)

    const result = await service.addTrack(user.id, '12345')
    assert.deepEqual(result, { added: false })
    assert.equal(getCalls, 2)
    const addCall = calls.find(
      (c) => c.path === '/playlists/pl_paged/items' && c.options.method === 'POST'
    )
    assert.isUndefined(addCall)
  })

  test('rethrows non-403 errors from playlist creation', async ({ assert }) => {
    const user = await createUser('create_error')
    const { service, spotify } = buildPlaylistService(async () => {
      throw new SpotifyApiError(500, '/users/x/playlists')
    })
    await linkSpotify(spotify, user.id)

    await assert.rejects(async () => {
      await service.getOrCreateLikedPlaylist(user.id)
    }, /500/)
  })

  test('returns null when interaction has neither isrc nor title+artist', async ({ assert }) => {
    const user = await createUser('add_no_match_inputs')
    const { service, spotify } = buildPlaylistService(async () => ({}))
    await linkSpotify(spotify, user.id)
    await UserTrackInteraction.create({
      userId: user.id,
      deezerTrackId: '777',
      action: InteractionAction.Liked,
      title: '',
      artist: '',
      isrc: null,
    })
    const result = await service.addTrack(user.id, '777')
    assert.deepEqual(result, { added: false, notOnSpotify: true })
  })
})

test.group('SpotifyPlaylistService - removeTrack', (group) => {
  deleteUserIntegrations(group)
  deleteTrackInteractions(group)

  test('returns removed:false when integration is missing', async ({ assert }) => {
    const user = await createUser('remove_no_integration')
    const { service } = buildPlaylistService(async () => ({}))
    const result = await service.removeTrack(user.id, '12345')
    assert.deepEqual(result, { removed: false })
  })

  test('returns removed:false when the playlist has not been created yet', async ({ assert }) => {
    const user = await createUser('remove_no_playlist')
    const { service, spotify } = buildPlaylistService(async () => ({}))
    await linkSpotify(spotify, user.id)
    const result = await service.removeTrack(user.id, '12345')
    assert.deepEqual(result, { removed: false })
  })

  test('returns removed:false when the interaction does not exist', async ({ assert }) => {
    const user = await createUser('remove_no_interaction')
    const { service, spotify } = buildPlaylistService(async () => ({}))
    await linkSpotify(spotify, user.id)
    const integration = await spotify.findByUserId(user.id)
    integration!.spotifyLikedPlaylistId = 'pl_x'
    await integration!.save()

    const result = await service.removeTrack(user.id, 'unknown')
    assert.deepEqual(result, { removed: false })
  })

  test('returns removed:false when the track cannot be found on Spotify', async ({ assert }) => {
    const user = await createUser('remove_not_found')
    const { service, spotify } = buildPlaylistService(async (record) => {
      if (record.path === '/search') return { tracks: { items: [] } }
      return {}
    })
    await linkSpotify(spotify, user.id)
    const integration = await spotify.findByUserId(user.id)
    integration!.spotifyLikedPlaylistId = 'pl_x'
    await integration!.save()
    await createLikedInteraction(user.id, { isrc: 'USXX00000000' })

    const result = await service.removeTrack(user.id, '12345')
    assert.deepEqual(result, { removed: false })
  })

  test('issues DELETE on the playlist when the track is found', async ({ assert }) => {
    const user = await createUser('remove_ok')
    const { service, spotify, calls } = buildPlaylistService(async (record) => {
      if (record.path === '/search') {
        return { tracks: { items: [{ uri: 'spotify:track:rm' }] } }
      }
      return undefined
    })
    await linkSpotify(spotify, user.id)
    const integration = await spotify.findByUserId(user.id)
    integration!.spotifyLikedPlaylistId = 'pl_rm'
    await integration!.save()
    await createLikedInteraction(user.id)

    const result = await service.removeTrack(user.id, '12345')
    assert.deepEqual(result, { removed: true })

    const del = calls.find(
      (c) => c.path === '/playlists/pl_rm/items' && c.options.method === 'DELETE'
    )!
    assert.deepEqual(del.options.body, { tracks: [{ uri: 'spotify:track:rm' }] })
  })
})

test.group('SpotifyPlaylistService - syncAllLikes', (group) => {
  deleteUserIntegrations(group)
  deleteTrackInteractions(group)

  test('aggregates added/notOnSpotify/skipped across the user likes', async ({ assert }) => {
    const user = await createUser('sync_ok')
    const { service, spotify } = buildPlaylistService(async (record) => {
      if (record.path === '/search') {
        const q = record.options.query!.q
        if (q.includes('USXX11111111')) return { tracks: { items: [{ uri: 'spotify:track:1' }] } }
        if (q.includes('NotOnSpotify')) return { tracks: { items: [] } }
        if (q.includes('USXX22222222')) return { tracks: { items: [] } }
        return { tracks: { items: [{ uri: 'spotify:track:dup' }] } }
      }
      if (record.path.endsWith('/playlists') && record.options.method === 'POST') {
        return { id: 'pl_sync' }
      }
      if (record.path.includes('/items') && record.options.method === 'GET') {
        return { items: [{ track: { uri: 'spotify:track:dup' } }], next: null }
      }
      return {}
    })
    await linkSpotify(spotify, user.id)
    await createLikedInteraction(user.id, { deezerTrackId: '1', isrc: 'USXX11111111' })
    await createLikedInteraction(user.id, {
      deezerTrackId: '2',
      isrc: 'USXX22222222',
      title: 'NotOnSpotify',
      artist: 'NotOnSpotify',
    })
    await createLikedInteraction(user.id, { deezerTrackId: '3', isrc: 'USXX33333333' })

    const result = await service.syncAllLikes(user.id)
    assert.deepEqual(result, { added: 1, notOnSpotify: 1, skipped: 1 })
  })

  test('rethrows scope upgrade required errors raised during the sync', async ({ assert }) => {
    const user = await createUser('sync_scope')
    const { service, spotify } = buildPlaylistService(async (record) => {
      if (record.path === '/search') {
        return { tracks: { items: [{ uri: 'spotify:track:1' }] } }
      }
      if (record.path.includes('/playlists') && record.options.method === 'POST') {
        throw new SpotifyApiError(403, '/users/x/playlists')
      }
      return {}
    })
    await linkSpotify(spotify, user.id, 'user-read-email playlist-modify-private')
    await createLikedInteraction(user.id, { isrc: 'USXX11111111' })

    await assert.rejects(async () => {
      await service.syncAllLikes(user.id)
    }, /SPOTIFY_SCOPE_UPGRADE_REQUIRED/)
  })

  test('counts unexpected addTrack errors as skipped', async ({ assert }) => {
    const user = await createUser('sync_skip')
    const { service, spotify } = buildPlaylistService(async (record) => {
      if (record.path === '/search') {
        return { tracks: { items: [{ uri: 'spotify:track:1' }] } }
      }
      if (record.path.endsWith('/playlists') && record.options.method === 'POST') {
        return { id: 'pl_skip' }
      }
      if (record.path.includes('/items') && record.options.method === 'GET') {
        return { items: [], next: null }
      }
      if (record.path.includes('/items') && record.options.method === 'POST') {
        throw new Error('boom')
      }
      return {}
    })
    await linkSpotify(spotify, user.id)
    await createLikedInteraction(user.id, { isrc: 'USXX11111111' })

    const result = await service.syncAllLikes(user.id)
    assert.deepEqual(result, { added: 0, notOnSpotify: 0, skipped: 1 })
  })
})
