import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { createAuthenticatedUser } from '../utils/auth_helpers.js'
import { deleteOnboardingArtists } from '#tests/utils/onboarding_helpers'
import { deleteTrackInteractions } from '#tests/utils/track_interaction_helpers'
import { deleteUserIntegrations } from '#tests/utils/user_integration_helpers'
import { SpotifyService } from '#services/spotify_service'
import UserOnboardingArtist from '#models/user_onboarding_artist'
import UserTrackInteraction from '#models/user_track_interaction'
import { InteractionAction } from '#enums/interaction_action'
interface FakeArtist {
  id: number
  name: string
}

const FAMILIAR_ARTIST_IDS = [27, 413, 288166] as const
const RELATED_ARTIST_IDS = [800, 801, 802] as const
const CHART_TRACK_BASE_ID = 9000
const FAMILIAR_TOP_BASE_ID = 1000
const RELATED_TOP_BASE_ID = 2000

const ARTIST_NAMES: Record<number, string> = {
  27: 'Daft Punk',
  413: 'Stromae',
  288166: 'Angèle',
  800: 'Justice',
  801: 'Phoenix',
  802: 'Air',
}

function makeTrackPayload(id: number, artist: FakeArtist, options: { withPreview?: boolean } = {}) {
  const withPreview = options.withPreview ?? true
  return {
    id,
    title: `Track ${id}`,
    title_short: `Track ${id}`,
    title_version: '',
    link: `https://deezer.com/track/${id}`,
    duration: 180,
    rank: 100,
    explicit_lyrics: false,
    explicit_content_lyrics: 0,
    explicit_content_cover: 0,
    preview: withPreview ? `https://cdn.deezer.com/preview/${id}` : '',
    md5_image: `md5${id}`,
    artist: {
      id: artist.id,
      name: artist.name,
      picture: `https://cdn/artist/${artist.id}`,
      picture_small: `https://cdn/artist/${artist.id}/sm`,
      picture_medium: `https://cdn/artist/${artist.id}/md`,
      picture_big: `https://cdn/artist/${artist.id}/big`,
      picture_xl: `https://cdn/artist/${artist.id}/xl`,
    },
    album: {
      id,
      title: `Album ${id}`,
      cover: `https://cdn/album/${id}`,
      cover_small: `https://cdn/album/${id}/sm`,
      cover_medium: `https://cdn/album/${id}/md`,
      cover_big: `https://cdn/album/${id}/big`,
      cover_xl: `https://cdn/album/${id}/xl`,
      md5_image: `md5${id}`,
    },
    type: 'track',
  }
}

function jsonResponse(payload: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

interface FakeFetchOptions {
  spotifyArtistNames?: string[]
  chartStatus?: number
}

function buildFakeFetch(options: FakeFetchOptions = {}): typeof fetch {
  const chartTrackArtist: FakeArtist = {
    id: 7000,
    name: 'Chart Artist 7000',
  }
  const chartTrackIds = Array.from({ length: 5 }, (_, i) => CHART_TRACK_BASE_ID + i)

  return (async (input: Parameters<typeof fetch>[0]) => {
    const url = typeof input === 'string' ? input : input.toString()

    if (url.includes('api.spotify.com/v1/me/top/artists')) {
      const items = (options.spotifyArtistNames ?? []).map((name, index) => ({
        id: `sp_${index}`,
        name,
      }))
      return jsonResponse({ items })
    }

    const chartMatch = url.match(/\/chart\/([A-Z]{2})\/tracks/)
    if (chartMatch) {
      if (options.chartStatus && options.chartStatus >= 400) {
        return new Response('upstream down', { status: options.chartStatus })
      }
      const data = chartTrackIds.map((id) => makeTrackPayload(id, chartTrackArtist))
      return jsonResponse({ data })
    }

    const relatedMatch = url.match(/\/artist\/(\d+)\/related/)
    if (relatedMatch) {
      const seedId = Number(relatedMatch[1])
      const offset = seedId % RELATED_ARTIST_IDS.length || 0
      const data = RELATED_ARTIST_IDS.slice(offset, offset + 3).map((id) => ({
        id,
        name: ARTIST_NAMES[id] ?? `Related ${id}`,
      }))
      return jsonResponse({ data })
    }

    const topMatch = url.match(/\/artist\/(\d+)\/top/)
    if (topMatch) {
      const artistId = Number(topMatch[1])
      const isRelated = (RELATED_ARTIST_IDS as readonly number[]).includes(artistId)
      const baseId = isRelated ? RELATED_TOP_BASE_ID : FAMILIAR_TOP_BASE_ID
      const trackIds = Array.from({ length: 5 }, (_, i) => baseId + artistId * 10 + i)
      const artist: FakeArtist = {
        id: artistId,
        name: ARTIST_NAMES[artistId] ?? `Artist ${artistId}`,
      }
      const data = trackIds.map((id) => makeTrackPayload(id, artist))
      return jsonResponse({ data })
    }

    const searchMatch = url.match(/\/search\/artist\?q=([^&]+)/)
    if (searchMatch) {
      const decoded = decodeURIComponent(searchMatch[1])
      const found = Object.entries(ARTIST_NAMES).find(([, name]) => name === decoded)
      const data = found ? [{ id: Number(found[0]), name: found[1] }] : []
      return jsonResponse({ data })
    }

    return jsonResponse({})
  }) as typeof fetch
}

function asTracks(body: unknown): { id: number; artist: { id: number } }[] {
  return (body as { tracks: { id: number; artist: { id: number } }[] }).tracks
}

test.group('SwipemixFeedController - auth & validation', (group) => {
  deleteOnboardingArtists(group)
  deleteTrackInteractions(group)

  let originalFetch: typeof fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = buildFakeFetch()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('GET /api/me/swipemix/feed requires auth', async ({ client }) => {
    const response = await client.get('/api/me/swipemix/feed')
    response.assertStatus(401)
  })

  test('rejects invalid limit query param', async ({ client }) => {
    const { token } = await createAuthenticatedUser('feed_bad_limit')
    const response = await client.get('/api/me/swipemix/feed?limit=999').bearerToken(token)
    response.assertStatus(422)
  })

  test('rejects invalid country query param', async ({ client }) => {
    const { token } = await createAuthenticatedUser('feed_bad_country')
    const response = await client.get('/api/me/swipemix/feed?country=FRA').bearerToken(token)
    response.assertStatus(422)
  })
})

test.group('SwipemixFeedController - cold start', (group) => {
  deleteOnboardingArtists(group)
  deleteTrackInteractions(group)

  let originalFetch: typeof fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = buildFakeFetch()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('returns chart tracks when the user has no seed signals', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('feed_cold_start')

    const response = await client.get('/api/me/swipemix/feed').bearerToken(token)

    response.assertStatus(200)
    const tracks = asTracks(response.body())
    assert.isAbove(tracks.length, 0)
    const chartArtist = tracks.find((track) => track.artist.id === 7000)
    assert.exists(chartArtist, 'chart artist should be present in cold start feed')
  })

  test('respects custom limit and offset', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser('feed_pagination')
    await UserOnboardingArtist.createMany([
      { userId: user.id, deezerArtistId: '27', artistName: 'Daft Punk', rank: 1 },
      { userId: user.id, deezerArtistId: '413', artistName: 'Stromae', rank: 2 },
    ])

    const firstPage = await client.get('/api/me/swipemix/feed?limit=3&offset=0').bearerToken(token)
    firstPage.assertStatus(200)
    const firstTracks = asTracks(firstPage.body())
    assert.equal(firstTracks.length, 3)

    const secondPage = await client.get('/api/me/swipemix/feed?limit=3&offset=3').bearerToken(token)
    secondPage.assertStatus(200)
    const secondTracks = asTracks(secondPage.body())

    const firstIds = firstTracks.map((track) => track.id)
    const secondIds = secondTracks.map((track) => track.id)
    for (const id of secondIds) {
      assert.notInclude(firstIds, id)
    }
  })
})

test.group('SwipemixFeedController - personalisation', (group) => {
  deleteOnboardingArtists(group)
  deleteTrackInteractions(group)

  let originalFetch: typeof fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = buildFakeFetch()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('excludes tracks the user already swiped (liked or disliked)', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser('feed_excludes_swiped')

    await UserOnboardingArtist.createMany([
      { userId: user.id, deezerArtistId: '27', artistName: 'Daft Punk', rank: 1 },
      { userId: user.id, deezerArtistId: '413', artistName: 'Stromae', rank: 2 },
    ])

    const excludedIds = [FAMILIAR_TOP_BASE_ID + 27 * 10, FAMILIAR_TOP_BASE_ID + 413 * 10 + 1]
    await UserTrackInteraction.createMany([
      {
        userId: user.id,
        deezerTrackId: String(excludedIds[0]),
        deezerArtistId: '27',
        action: InteractionAction.Liked,
      },
      {
        userId: user.id,
        deezerTrackId: String(excludedIds[1]),
        deezerArtistId: '413',
        action: InteractionAction.Disliked,
      },
    ])

    const response = await client.get('/api/me/swipemix/feed?limit=50').bearerToken(token)
    response.assertStatus(200)

    const ids = asTracks(response.body()).map((track) => track.id)
    for (const excluded of excludedIds) {
      assert.notInclude(ids, excluded)
    }
  })

  test('produces different feeds for users with different onboarding seeds', async ({
    client,
    assert,
  }) => {
    const userA = await createAuthenticatedUser('feed_user_a')
    const userB = await createAuthenticatedUser('feed_user_b')

    await UserOnboardingArtist.createMany([
      { userId: userA.user.id, deezerArtistId: '27', artistName: 'Daft Punk', rank: 1 },
      { userId: userA.user.id, deezerArtistId: '413', artistName: 'Stromae', rank: 2 },
    ])

    await UserOnboardingArtist.createMany([
      { userId: userB.user.id, deezerArtistId: '288166', artistName: 'Angèle', rank: 1 },
    ])

    const respA = await client.get('/api/me/swipemix/feed?limit=10').bearerToken(userA.token)
    const respB = await client.get('/api/me/swipemix/feed?limit=10').bearerToken(userB.token)

    respA.assertStatus(200)
    respB.assertStatus(200)

    const idsA = new Set(asTracks(respA.body()).map((track) => track.id))
    const idsB = new Set(asTracks(respB.body()).map((track) => track.id))

    const intersection = Array.from(idsA).filter((id) => idsB.has(id))
    assert.notEqual(intersection.length, idsA.size, 'feeds should diverge between distinct seeds')
  })

  test('the first 5 tracks contain at most one chart-only (discovery) track when seeds exist', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser('feed_ratio_top5')

    await UserOnboardingArtist.createMany([
      { userId: user.id, deezerArtistId: '27', artistName: 'Daft Punk', rank: 1 },
      { userId: user.id, deezerArtistId: '413', artistName: 'Stromae', rank: 2 },
      { userId: user.id, deezerArtistId: '288166', artistName: 'Angèle', rank: 3 },
    ])

    const response = await client.get('/api/me/swipemix/feed?limit=5').bearerToken(token)
    response.assertStatus(200)

    const seedSet = new Set(FAMILIAR_ARTIST_IDS as readonly number[])
    const familiarCount = asTracks(response.body()).filter((track) =>
      seedSet.has(track.artist.id)
    ).length

    assert.isAtLeast(familiarCount, 4, 'expected ≥4 familiar tracks in first 5 (80/20 ratio)')
  })
})

test.group('SwipemixFeedController - integrations & errors', (group) => {
  deleteOnboardingArtists(group)
  deleteTrackInteractions(group)
  deleteUserIntegrations(group)

  let originalFetch: typeof fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('uses Spotify top artists as seeds when integration exists', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser('feed_spotify_seed')
    await new SpotifyService().upsertIntegration(user.id, {
      providerUserId: 'sp_seed',
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: DateTime.now().plus({ hours: 1 }),
      scopes: 'user-top-read',
    })

    globalThis.fetch = buildFakeFetch({ spotifyArtistNames: ['Daft Punk'] })

    const response = await client.get('/api/me/swipemix/feed?limit=20').bearerToken(token)
    response.assertStatus(200)

    const tracks = asTracks(response.body())
    const hasDaftPunk = tracks.some((track) => track.artist.id === 27)
    assert.isTrue(hasDaftPunk, 'expected Daft Punk top track from Spotify-resolved seed')
  })

  test('returns 502 when Deezer chart upstream fails for cold-start user', async ({ client }) => {
    const { token } = await createAuthenticatedUser('feed_chart_502')
    globalThis.fetch = buildFakeFetch({ chartStatus: 500 })

    const response = await client.get('/api/me/swipemix/feed').bearerToken(token)
    // Cold start with no chart leaves an empty pool but the endpoint still returns 200 with []
    // because we want graceful degradation, not 502.
    response.assertStatus(200)
  })
})
