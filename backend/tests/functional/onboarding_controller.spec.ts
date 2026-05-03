import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { createAuthenticatedUser } from '../utils/auth_helpers.js'
import { deleteOnboardingArtists } from '#tests/utils/onboarding_helpers'
import { deleteUserIntegrations } from '#tests/utils/user_integration_helpers'
import { SpotifyService } from '#services/spotify_service'
import UserOnboardingArtist from '#models/user_onboarding_artist'

const FAKE_ARTISTS: Record<string, { id: number; name: string; picture_medium: string }> = {
  '27': { id: 27, name: 'Daft Punk', picture_medium: 'https://e-cdns/27.jpg' },
  '413': { id: 413, name: 'Stromae', picture_medium: 'https://e-cdns/413.jpg' },
  '288166': { id: 288166, name: 'Angèle', picture_medium: 'https://e-cdns/288166.jpg' },
  '5343921': {
    id: 5343921,
    name: 'Aya Nakamura',
    picture_medium: 'https://e-cdns/5343921.jpg',
  },
}

const ARTISTS_BY_NAME: Record<string, { id: number; name: string; picture_medium: string }> = {
  'Daft Punk': FAKE_ARTISTS['27'],
  'Stromae': FAKE_ARTISTS['413'],
  'Angèle': FAKE_ARTISTS['288166'],
  'Aya Nakamura': FAKE_ARTISTS['5343921'],
}

function fakeDeezerFetch(): typeof fetch {
  return (async (input: Parameters<typeof fetch>[0]) => {
    const url = typeof input === 'string' ? input : input.toString()

    if (url.includes('/chart/')) {
      return new Response(JSON.stringify({ data: Object.values(FAKE_ARTISTS) }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    const searchMatch = url.match(/\/search\/artist\?q=([^&]+)/)
    if (searchMatch) {
      const decoded = decodeURIComponent(searchMatch[1])
      const artist = ARTISTS_BY_NAME[decoded]
      const data = artist ? [artist] : []
      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    const match = url.match(/\/artist\/(\d+)/)
    if (match) {
      const artist = FAKE_ARTISTS[match[1]]
      if (!artist) {
        return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
      }
      return new Response(JSON.stringify(artist), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    return new Response('{}', { status: 200 })
  }) as typeof fetch
}

function fakeSpotifyAndDeezerFetch(
  spotifyArtistNames: string[],
  options: { failingDeezerSearchNames?: Set<string> } = {}
): typeof fetch {
  return (async (input: Parameters<typeof fetch>[0]) => {
    const url = typeof input === 'string' ? input : input.toString()

    if (url.includes('api.spotify.com/v1/me/top/artists')) {
      const items = spotifyArtistNames.map((name, index) => ({
        id: `sp_${index}`,
        name,
      }))
      return new Response(JSON.stringify({ items }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    const searchMatch = url.match(/\/search\/artist\?q=([^&]+)/)
    if (searchMatch && options.failingDeezerSearchNames) {
      const decoded = decodeURIComponent(searchMatch[1])
      if (options.failingDeezerSearchNames.has(decoded)) {
        return new Response('upstream error', { status: 500 })
      }
    }

    return fakeDeezerFetch()(input)
  }) as typeof fetch
}

test.group('OnboardingController - auth guards', (group) => {
  deleteOnboardingArtists(group)

  test('GET /api/me/onboarding/status requires auth', async ({ client }) => {
    const response = await client.get('/api/me/onboarding/status')
    response.assertStatus(401)
  })

  test('GET /api/me/onboarding/artists requires auth', async ({ client }) => {
    const response = await client.get('/api/me/onboarding/artists')
    response.assertStatus(401)
  })

  test('POST /api/me/onboarding/artists requires auth', async ({ client }) => {
    const response = await client
      .post('/api/me/onboarding/artists')
      .json({ deezerArtistIds: [27, 413, 288166] })
    response.assertStatus(401)
  })

  test('GET /api/me/onboarding/artists/suggestions requires auth', async ({ client }) => {
    const response = await client.get('/api/me/onboarding/artists/suggestions')
    response.assertStatus(401)
  })

  test('GET /api/me/onboarding/artists/spotify-suggestions requires auth', async ({ client }) => {
    const response = await client.get('/api/me/onboarding/artists/spotify-suggestions')
    response.assertStatus(401)
  })
})

test.group('OnboardingController - status', (group) => {
  deleteOnboardingArtists(group)

  test('returns completed=false when no artists are stored', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('onboarding_status_empty')

    const response = await client.get('/api/me/onboarding/status').bearerToken(token)

    response.assertStatus(200)
    assert.deepEqual(response.body(), { completed: false, artistsCount: 0 })
  })

  test('returns completed=true when 3+ artists are stored', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser('onboarding_status_done')

    await UserOnboardingArtist.createMany([
      { userId: user.id, deezerArtistId: '27', artistName: 'Daft Punk', rank: 1 },
      { userId: user.id, deezerArtistId: '413', artistName: 'Stromae', rank: 2 },
      { userId: user.id, deezerArtistId: '288166', artistName: 'Angèle', rank: 3 },
    ])

    const response = await client.get('/api/me/onboarding/status').bearerToken(token)

    response.assertStatus(200)
    assert.deepEqual(response.body(), { completed: true, artistsCount: 3 })
  })
})

test.group('OnboardingController - list', (group) => {
  deleteOnboardingArtists(group)

  test('returns the user artists ordered by rank', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser('onboarding_list')

    await UserOnboardingArtist.createMany([
      { userId: user.id, deezerArtistId: '413', artistName: 'Stromae', rank: 2 },
      { userId: user.id, deezerArtistId: '27', artistName: 'Daft Punk', rank: 1 },
      { userId: user.id, deezerArtistId: '288166', artistName: 'Angèle', rank: 3 },
    ])

    const response = await client.get('/api/me/onboarding/artists').bearerToken(token)

    response.assertStatus(200)
    const artists = response.body().artists as { deezerArtistId: string; rank: number }[]
    assert.equal(artists.length, 3)
    assert.deepEqual(
      artists.map((a) => a.deezerArtistId),
      ['27', '413', '288166']
    )
  })
})

test.group('OnboardingController - replace', (group) => {
  deleteOnboardingArtists(group)

  let originalFetch: typeof fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = fakeDeezerFetch()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('persists artists in submitted order with rank starting at 1', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser('onboarding_save')

    const response = await client
      .post('/api/me/onboarding/artists')
      .bearerToken(token)
      .json({ deezerArtistIds: [413, 27, 288166] })

    response.assertStatus(200)
    const stored = await UserOnboardingArtist.query()
      .where('userId', user.id)
      .orderBy('rank', 'asc')

    assert.equal(stored.length, 3)
    assert.equal(stored[0].deezerArtistId, '413')
    assert.equal(stored[0].rank, 1)
    assert.equal(stored[2].deezerArtistId, '288166')
    assert.equal(stored[2].rank, 3)
  })

  test('rejects fewer than 3 artists with 422', async ({ client }) => {
    const { token } = await createAuthenticatedUser('onboarding_too_few')

    const response = await client
      .post('/api/me/onboarding/artists')
      .bearerToken(token)
      .json({ deezerArtistIds: [27, 413] })

    response.assertStatus(422)
  })

  test('rejects more than 5 artists with 422', async ({ client }) => {
    const { token } = await createAuthenticatedUser('onboarding_too_many')

    const response = await client
      .post('/api/me/onboarding/artists')
      .bearerToken(token)
      .json({ deezerArtistIds: [27, 413, 288166, 5343921, 1, 2] })

    response.assertStatus(422)
  })

  test('rejects duplicate artist ids with 422', async ({ client }) => {
    const { token } = await createAuthenticatedUser('onboarding_dupes')

    const response = await client
      .post('/api/me/onboarding/artists')
      .bearerToken(token)
      .json({ deezerArtistIds: [27, 27, 413] })

    response.assertStatus(422)
  })

  test('replaces an existing selection in full', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser('onboarding_replace')

    await UserOnboardingArtist.createMany([
      { userId: user.id, deezerArtistId: '5343921', artistName: 'Aya Nakamura', rank: 1 },
    ])

    const response = await client
      .post('/api/me/onboarding/artists')
      .bearerToken(token)
      .json({ deezerArtistIds: [27, 413, 288166] })

    response.assertStatus(200)
    const stored = await UserOnboardingArtist.query().where('userId', user.id)
    assert.equal(stored.length, 3)
    assert.notInclude(
      stored.map((row) => row.deezerArtistId),
      '5343921'
    )
  })

  test('returns 422 with service-error message when an artist id is unknown on Deezer', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser('onboarding_unknown_id')

    const response = await client
      .post('/api/me/onboarding/artists')
      .bearerToken(token)
      .json({ deezerArtistIds: [27, 99999, 413] })

    response.assertStatus(422)
    assert.match(response.body().message, /Unknown Deezer artist ids:.*99999/)
  })
})

test.group('OnboardingController - suggestions', (group) => {
  deleteOnboardingArtists(group)

  let originalFetch: typeof fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = fakeDeezerFetch()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('returns suggestions and excludes already-selected artists', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser('onboarding_sugg')

    await UserOnboardingArtist.create({
      userId: user.id,
      deezerArtistId: '27',
      artistName: 'Daft Punk',
      rank: 1,
    })

    const response = await client
      .get('/api/me/onboarding/artists/suggestions?country=FR&limit=20')
      .bearerToken(token)

    response.assertStatus(200)
    const ids = (response.body().artists as { id: number }[]).map((a) => a.id)
    assert.notInclude(ids, 27)
    assert.includeMembers(ids, [413, 288166, 5343921])
  })

  test('returns 422 when query params are invalid', async ({ client }) => {
    const { token } = await createAuthenticatedUser('onboarding_sugg_bad_qs')

    const response = await client
      .get('/api/me/onboarding/artists/suggestions?country=FRA')
      .bearerToken(token)

    response.assertStatus(422)
    response.assertBodyContains({ message: 'Validation failed' })
  })

  test('returns 502 when Deezer charts upstream fails', async ({ client }) => {
    const { token } = await createAuthenticatedUser('onboarding_sugg_502')

    globalThis.fetch = (async () => new Response('upstream down', { status: 500 })) as typeof fetch

    const response = await client.get('/api/me/onboarding/artists/suggestions').bearerToken(token)

    response.assertStatus(502)
    response.assertBodyContains({ message: 'Failed to fetch artist suggestions' })
  })

  test('returns an empty list when Deezer chart payload omits the data field', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser('onboarding_sugg_malformed')

    globalThis.fetch = (async () =>
      new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch

    const response = await client.get('/api/me/onboarding/artists/suggestions').bearerToken(token)

    response.assertStatus(200)
    assert.deepEqual(response.body(), { artists: [] })
  })
})

test.group('OnboardingController - spotify suggestions', (group) => {
  deleteOnboardingArtists(group)
  deleteUserIntegrations(group)

  let originalFetch: typeof fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('returns 409 when the user has no Spotify integration', async ({ client }) => {
    const { token } = await createAuthenticatedUser('onboarding_sp_unlinked')

    const response = await client
      .get('/api/me/onboarding/artists/spotify-suggestions')
      .bearerToken(token)

    response.assertStatus(409)
    response.assertBodyContains({ message: 'Spotify integration not found' })
  })

  test('resolves Spotify top artists to Deezer suggestions, including already-selected', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser('onboarding_sp_ok')
    await new SpotifyService().upsertIntegration(user.id, {
      providerUserId: 'sp_user',
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: DateTime.now().plus({ hours: 1 }),
      scopes: 'user-top-read',
    })
    await UserOnboardingArtist.create({
      userId: user.id,
      deezerArtistId: '27',
      artistName: 'Daft Punk',
      rank: 1,
    })

    globalThis.fetch = fakeSpotifyAndDeezerFetch(['Daft Punk', 'Stromae', 'Angèle'])

    const response = await client
      .get('/api/me/onboarding/artists/spotify-suggestions')
      .bearerToken(token)

    response.assertStatus(200)
    const ids = (response.body().artists as { id: number }[]).map((a) => a.id)
    assert.includeMembers(ids, [27, 413, 288166])
  })

  test('returns 502 when Spotify upstream fails', async ({ client }) => {
    const { user, token } = await createAuthenticatedUser('onboarding_sp_502')
    await new SpotifyService().upsertIntegration(user.id, {
      providerUserId: 'sp_user_fail',
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: DateTime.now().plus({ hours: 1 }),
      scopes: 'user-top-read',
    })

    globalThis.fetch = (async () =>
      new Response('{"error":{"status":500}}', {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch

    const response = await client
      .get('/api/me/onboarding/artists/spotify-suggestions')
      .bearerToken(token)

    response.assertStatus(502)
  })

  test('drops a Spotify artist when its Deezer search throws', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser('onboarding_sp_drop_throw')
    await new SpotifyService().upsertIntegration(user.id, {
      providerUserId: 'sp_user_drop',
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: DateTime.now().plus({ hours: 1 }),
      scopes: 'user-top-read',
    })

    globalThis.fetch = fakeSpotifyAndDeezerFetch(['Daft Punk', 'Stromae', 'Angèle'], {
      failingDeezerSearchNames: new Set(['Stromae']),
    })

    const response = await client
      .get('/api/me/onboarding/artists/spotify-suggestions')
      .bearerToken(token)

    response.assertStatus(200)
    const ids = (response.body().artists as { id: number }[]).map((a) => a.id)
    assert.includeMembers(ids, [27, 288166])
    assert.notInclude(ids, 413)
  })

  test('drops a Spotify artist when its Deezer search returns no match', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser('onboarding_sp_drop_empty')
    await new SpotifyService().upsertIntegration(user.id, {
      providerUserId: 'sp_user_empty',
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: DateTime.now().plus({ hours: 1 }),
      scopes: 'user-top-read',
    })

    globalThis.fetch = fakeSpotifyAndDeezerFetch(['Daft Punk', 'Unknown Artist'])

    const response = await client
      .get('/api/me/onboarding/artists/spotify-suggestions')
      .bearerToken(token)

    response.assertStatus(200)
    const ids = (response.body().artists as { id: number }[]).map((a) => a.id)
    assert.deepEqual(ids, [27])
  })

  test('returns an empty list when Spotify has no top artists', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser('onboarding_sp_empty')
    await new SpotifyService().upsertIntegration(user.id, {
      providerUserId: 'sp_user_no_items',
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: DateTime.now().plus({ hours: 1 }),
      scopes: 'user-top-read',
    })

    globalThis.fetch = fakeSpotifyAndDeezerFetch([])

    const response = await client
      .get('/api/me/onboarding/artists/spotify-suggestions')
      .bearerToken(token)

    response.assertStatus(200)
    assert.deepEqual(response.body(), { artists: [] })
  })

  test('returns an empty list when Spotify response omits the items field', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser('onboarding_sp_malformed')
    await new SpotifyService().upsertIntegration(user.id, {
      providerUserId: 'sp_user_no_items_field',
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: DateTime.now().plus({ hours: 1 }),
      scopes: 'user-top-read',
    })

    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('api.spotify.com/v1/me/top/artists')) {
        return new Response('{}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      return fakeDeezerFetch()(input)
    }) as typeof fetch

    const response = await client
      .get('/api/me/onboarding/artists/spotify-suggestions')
      .bearerToken(token)

    response.assertStatus(200)
    assert.deepEqual(response.body(), { artists: [] })
  })

  test('deduplicates Spotify suggestions when names resolve to the same Deezer artist', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser('onboarding_sp_dedup')
    await new SpotifyService().upsertIntegration(user.id, {
      providerUserId: 'sp_user_dedup',
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: DateTime.now().plus({ hours: 1 }),
      scopes: 'user-top-read',
    })

    globalThis.fetch = fakeSpotifyAndDeezerFetch(['Daft Punk', 'Daft Punk', 'Stromae'])

    const response = await client
      .get('/api/me/onboarding/artists/spotify-suggestions')
      .bearerToken(token)

    response.assertStatus(200)
    const ids = (response.body().artists as { id: number }[]).map((a) => a.id)
    assert.deepEqual(ids.sort(), [27, 413].sort())
  })
})
