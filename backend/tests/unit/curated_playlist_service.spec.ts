import { test } from '@japa/runner'
import CuratedPlaylist from '#models/curated_playlist'
import { CuratedPlaylistService, parseDeezerPlaylistUrl } from '#services/curated_playlist_service'
import { deleteCuratedPlaylists } from '#tests/utils/curated_playlist_helpers'

const sampleDeezerTracks = [
  {
    id: 1,
    title: 'Track 1',
    title_short: 'Track 1',
    preview: 'https://preview/1.mp3',
    duration: 30,
    artist: { id: 11, name: 'Artist 1' },
    album: { id: 111, title: 'Album 1' },
  },
  {
    id: 2,
    title: 'Track 2',
    title_short: 'Track 2',
    preview: 'https://preview/2.mp3',
    duration: 30,
    artist: { id: 12, name: 'Artist 2' },
    album: { id: 112, title: 'Album 2' },
  },
  {
    id: 3,
    title: 'Track 3',
    title_short: 'Track 3',
    preview: 'https://preview/3.mp3',
    duration: 30,
    artist: { id: 13, name: 'Artist 3' },
    album: { id: 113, title: 'Album 3' },
  },
]

test.group('CuratedPlaylistService', (group) => {
  deleteCuratedPlaylists(group)

  let service: CuratedPlaylistService
  let originalFetch: typeof fetch

  group.each.setup(() => {
    service = new CuratedPlaylistService()
    originalFetch = globalThis.fetch
    CuratedPlaylistService.clearCache()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
    CuratedPlaylistService.clearCache()
  })

  test('listPlaylists returns playlists ordered by id', async ({ assert }) => {
    const p1 = await CuratedPlaylist.create({
      deezerPlaylistId: 1001,
      name: 'P1',
      genreLabel: 'Rap FR',
      coverUrl: null,
    })
    const p2 = await CuratedPlaylist.create({
      deezerPlaylistId: 1002,
      name: 'P2',
      genreLabel: 'Pop',
      coverUrl: 'https://cover/2.jpg',
    })

    const result = await service.listPlaylists()
    const ids = result.map((p) => p.id)
    assert.includeMembers(ids, [p1.id, p2.id])
    const indexes = [ids.indexOf(p1.id), ids.indexOf(p2.id)]
    assert.isBelow(indexes[0], indexes[1])
  })

  test('findById returns the playlist when present', async ({ assert }) => {
    const p = await CuratedPlaylist.create({
      deezerPlaylistId: 1010,
      name: 'Find',
      genreLabel: 'Rock',
      coverUrl: null,
    })
    const found = await service.findById(p.id)
    assert.isNotNull(found)
    assert.equal(found?.id, p.id)
  })

  test('findById returns null when missing', async ({ assert }) => {
    const found = await service.findById(999_999)
    assert.isNull(found)
  })

  test('getRandomTracks throws PlaylistNotFoundError when playlist is unknown', async ({
    assert,
  }) => {
    await assert.rejects(async () => {
      await service.getRandomTracks(999_999)
    }, /not found/)
  })

  test('getRandomTracks returns up to count tracks from Deezer', async ({ assert }) => {
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 1020,
      name: 'Sample',
      genreLabel: 'Hits',
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

    const tracks = await service.getRandomTracks(playlist.id, 2)
    assert.equal(tracks.length, 2)
    assert.include(calledUrl!, '/playlist/1020/tracks')
    for (const track of tracks) {
      assert.exists(sampleDeezerTracks.find((t) => t.id === track.id))
    }
  })

  test('getRandomTracks paginates through every page when the playlist exceeds the page size', async ({
    assert,
  }) => {
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 1025,
      name: 'Huge',
      genreLabel: 'Hits',
      coverUrl: null,
    })

    const buildTrack = (id: number) => ({
      id,
      title: `Track ${id}`,
      title_short: `Track ${id}`,
      preview: `https://preview/${id}.mp3`,
      duration: 30,
      artist: { id: id * 10, name: `Artist ${id}` },
      album: { id: id * 100, title: `Album ${id}` },
    })

    const calledUrls: string[] = []
    globalThis.fetch = async (input) => {
      const url = typeof input === 'string' ? input : (input as URL).toString()
      calledUrls.push(url)
      // Probe call (limit=1, no index)
      if (url.includes('limit=1') && !url.includes('limit=500')) {
        return new Response(JSON.stringify({ data: [], total: 1200 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      // Page calls return distinct tracks per page so we can verify dedupe-friendly merging
      const indexMatch = url.match(/index=(\d+)/)
      const offset = indexMatch ? Number(indexMatch[1]) : 0
      const data = Array.from({ length: 5 }, (_, i) => buildTrack(offset + i + 1))
      return new Response(JSON.stringify({ data, total: 1200 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const tracks = await service.getRandomTracks(playlist.id, 100)
    const pageCalls = calledUrls.filter((u) => u.includes('limit=500'))
    assert.equal(pageCalls.length, Math.ceil(1200 / 500))
    const offsets = pageCalls.map((u) => Number(u.match(/index=(\d+)/)![1])).sort((a, b) => a - b)
    assert.deepEqual(offsets, [0, 500, 1000])
    assert.equal(tracks.length, 15)
  })

  test('getRandomTracks returns all tracks when count exceeds total', async ({ assert }) => {
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 1030,
      name: 'Full',
      genreLabel: 'Hits',
      coverUrl: null,
    })

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: sampleDeezerTracks, total: sampleDeezerTracks.length }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const tracks = await service.getRandomTracks(playlist.id, 50)
    assert.equal(tracks.length, sampleDeezerTracks.length)
  })

  test('getRandomTracks dedupes tracks by id before sampling', async ({ assert }) => {
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 1035,
      name: 'Dup',
      genreLabel: 'Hits',
      coverUrl: null,
    })

    const duplicated = [
      sampleDeezerTracks[0],
      sampleDeezerTracks[0],
      sampleDeezerTracks[1],
      sampleDeezerTracks[1],
      sampleDeezerTracks[2],
    ]

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: duplicated, total: duplicated.length }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const tracks = await service.getRandomTracks(playlist.id, 50)
    const ids = tracks.map((t) => t.id)
    assert.equal(tracks.length, 3)
    assert.deepEqual([...new Set(ids)].sort(), ids.slice().sort())
  })

  test('getRandomTracks returns empty array when Deezer returns no data', async ({ assert }) => {
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 1040,
      name: 'Empty',
      genreLabel: 'Hits',
      coverUrl: null,
    })

    globalThis.fetch = async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const tracks = await service.getRandomTracks(playlist.id, 10)
    assert.deepEqual(tracks, [])
  })

  test('getRandomTracks throws DeezerPlaylistFetchError on non-2xx response', async ({
    assert,
  }) => {
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 1050,
      name: 'Failing',
      genreLabel: 'Hits',
      coverUrl: null,
    })

    globalThis.fetch = async () => new Response('boom', { status: 500 })

    await assert.rejects(async () => {
      await service.getRandomTracks(playlist.id)
    }, /Failed to fetch Deezer playlist/)
  })

  test('getRandomTracks throws DeezerPlaylistFetchError on network failure', async ({ assert }) => {
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 1060,
      name: 'Network failing',
      genreLabel: 'Hits',
      coverUrl: null,
    })

    globalThis.fetch = async () => {
      throw new TypeError('network down')
    }

    await assert.rejects(async () => {
      await service.getRandomTracks(playlist.id)
    }, /Failed to fetch Deezer playlist/)
  })

  test('getRandomTracks hits the cache on the second call for the same playlist', async ({
    assert,
  }) => {
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 1070,
      name: 'Cached',
      genreLabel: 'Hits',
      coverUrl: null,
    })

    let fetchCallCount = 0
    globalThis.fetch = async () => {
      fetchCallCount += 1
      return new Response(
        JSON.stringify({ data: sampleDeezerTracks, total: sampleDeezerTracks.length }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    await service.getRandomTracks(playlist.id, 2)
    const firstCallCount = fetchCallCount

    await service.getRandomTracks(playlist.id, 2)
    assert.equal(fetchCallCount, firstCallCount)

    CuratedPlaylistService.clearCache()
    await service.getRandomTracks(playlist.id, 2)
    assert.isAbove(fetchCallCount, firstCallCount)
  })

  test('listAllTracks returns every unique track in catalogue order', async ({ assert }) => {
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 1090,
      name: 'Full',
      genreLabel: 'Hits',
      coverUrl: null,
    })

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: sampleDeezerTracks, total: sampleDeezerTracks.length }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const tracks = await service.listAllTracks(playlist.id)
    assert.deepEqual(
      tracks.map((t) => t.id),
      sampleDeezerTracks.map((t) => t.id)
    )
  })

  test('listAllTracks throws PlaylistNotFoundError when missing', async ({ assert }) => {
    await assert.rejects(async () => {
      await service.listAllTracks(999_999)
    }, /Curated playlist with id .* not found/)
  })

  test('invalidateCache evicts only the targeted Deezer playlist entry', async ({ assert }) => {
    const a = await CuratedPlaylist.create({
      deezerPlaylistId: 1080,
      name: 'A',
      genreLabel: 'Hits',
      coverUrl: null,
    })
    const b = await CuratedPlaylist.create({
      deezerPlaylistId: 1081,
      name: 'B',
      genreLabel: 'Hits',
      coverUrl: null,
    })

    let fetchCallCount = 0
    globalThis.fetch = async () => {
      fetchCallCount += 1
      return new Response(
        JSON.stringify({ data: sampleDeezerTracks, total: sampleDeezerTracks.length }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    await service.getRandomTracks(a.id, 2)
    await service.getRandomTracks(b.id, 2)
    const baseline = fetchCallCount

    CuratedPlaylistService.invalidateCache(a.deezerPlaylistId)

    await service.getRandomTracks(b.id, 2)
    assert.equal(fetchCallCount, baseline)
    await service.getRandomTracks(a.id, 2)
    assert.equal(fetchCallCount, baseline + 1)
  })
})

test.group('parseDeezerPlaylistUrl', (group) => {
  let originalFetch: typeof fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('parses canonical deezer.com playlist URL', async ({ assert }) => {
    assert.equal(
      await parseDeezerPlaylistUrl('https://www.deezer.com/playlist/15223693943'),
      15223693943
    )
  })

  test('parses deezer.com URL with locale segment', async ({ assert }) => {
    assert.equal(
      await parseDeezerPlaylistUrl('https://www.deezer.com/fr/playlist/15223693943'),
      15223693943
    )
    assert.equal(await parseDeezerPlaylistUrl('https://deezer.com/en/playlist/42'), 42)
  })

  test('parses api.deezer.com playlist URL', async ({ assert }) => {
    assert.equal(
      await parseDeezerPlaylistUrl('https://api.deezer.com/playlist/908622995'),
      908622995
    )
  })

  test('ignores trailing path segments and query parameters', async ({ assert }) => {
    assert.equal(
      await parseDeezerPlaylistUrl('https://www.deezer.com/fr/playlist/12345?utm_source=share'),
      12345
    )
  })

  test('resolves link.deezer.com short links via redirect', async ({ assert }) => {
    let calledWith: string | null = null
    globalThis.fetch = async (input, init) => {
      calledWith = typeof input === 'string' ? input : (input as URL).toString()
      assert.equal((init as RequestInit | undefined)?.redirect, 'follow')
      const r = new Response(null, { status: 200 })
      Object.defineProperty(r, 'url', { value: 'https://www.deezer.com/fr/playlist/77777' })
      return r
    }
    assert.equal(await parseDeezerPlaylistUrl('https://link.deezer.com/s/abcdef'), 77777)
    assert.equal(calledWith, 'https://link.deezer.com/s/abcdef')
  })

  test('resolves deezer.page.link short links via redirect', async ({ assert }) => {
    globalThis.fetch = async () => {
      const r = new Response(null, { status: 200 })
      Object.defineProperty(r, 'url', { value: 'https://www.deezer.com/playlist/88888' })
      return r
    }
    assert.equal(await parseDeezerPlaylistUrl('https://deezer.page.link/xyz'), 88888)
  })

  test('throws InvalidDeezerUrlError on garbage strings', async ({ assert }) => {
    await assert.rejects(async () => {
      await parseDeezerPlaylistUrl('not-a-url')
    }, /Invalid Deezer playlist URL/)
  })

  test('throws InvalidDeezerUrlError when host is not Deezer', async ({ assert }) => {
    await assert.rejects(async () => {
      await parseDeezerPlaylistUrl('https://malicious.example/playlist/123')
    }, /Invalid Deezer playlist URL/)
  })

  test('throws InvalidDeezerUrlError when short-link resolution returns a non-playlist URL', async ({
    assert,
  }) => {
    globalThis.fetch = async () => {
      const r = new Response(null, { status: 200 })
      Object.defineProperty(r, 'url', { value: 'https://www.deezer.com/fr/artist/123' })
      return r
    }
    await assert.rejects(async () => {
      await parseDeezerPlaylistUrl('https://link.deezer.com/s/zzz')
    }, /Invalid Deezer playlist URL/)
  })

  test('throws InvalidDeezerUrlError when short-link fetch fails', async ({ assert }) => {
    globalThis.fetch = async () => {
      throw new TypeError('network down')
    }
    await assert.rejects(async () => {
      await parseDeezerPlaylistUrl('https://link.deezer.com/s/zzz')
    }, /Invalid Deezer playlist URL/)
  })

  test('throws InvalidDeezerUrlError when path matches but id is not numeric (regex never matches)', async ({
    assert,
  }) => {
    await assert.rejects(async () => {
      await parseDeezerPlaylistUrl('https://www.deezer.com/fr/playlist/not-a-number')
    }, /Invalid Deezer playlist URL/)
  })

  test('throws InvalidDeezerUrlError on absurdly long numeric ids that overflow Number', async ({
    assert,
  }) => {
    await assert.rejects(async () => {
      await parseDeezerPlaylistUrl(`https://www.deezer.com/playlist/${'9'.repeat(310)}`)
    }, /Invalid Deezer playlist URL/)
  })
})

test.group('CuratedPlaylistService - CRUD', (group) => {
  deleteCuratedPlaylists(group)

  let service: CuratedPlaylistService
  let originalFetch: typeof fetch

  const meta = (overrides: Partial<Record<string, unknown>> = {}) =>
    new Response(
      JSON.stringify({
        id: 9001,
        title: 'Deezer Title',
        picture_xl: 'https://cdn/cover.jpg',
        nb_tracks: 250,
        ...overrides,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  group.each.setup(() => {
    service = new CuratedPlaylistService()
    originalFetch = globalThis.fetch
    CuratedPlaylistService.clearCache()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
    CuratedPlaylistService.clearCache()
  })

  test('createFromDeezerUrl persists Deezer metadata with nameOverridden false', async ({
    assert,
  }) => {
    globalThis.fetch = async () =>
      meta({
        id: 2100,
        title: 'Imported Playlist',
        picture_xl: 'https://cdn/imported.jpg',
        nb_tracks: 42,
      })

    const created = await service.createFromDeezerUrl({
      url: 'https://www.deezer.com/fr/playlist/2100',
      genreLabel: 'Pop',
    })

    assert.equal(created.deezerPlaylistId, 2100)
    assert.equal(created.name, 'Imported Playlist')
    assert.equal(created.genreLabel, 'Pop')
    assert.equal(created.coverUrl, 'https://cdn/imported.jpg')
    assert.equal(created.trackCount, 42)
    assert.isFalse(created.nameOverridden)
  })

  test('createFromDeezerUrl throws DuplicateDeezerPlaylistError when the Deezer ID is already imported', async ({
    assert,
  }) => {
    await CuratedPlaylist.create({
      deezerPlaylistId: 2200,
      name: 'Existing',
      genreLabel: 'Pop',
      coverUrl: null,
    })

    await assert.rejects(async () => {
      await service.createFromDeezerUrl({
        url: 'https://www.deezer.com/playlist/2200',
        genreLabel: 'Pop',
      })
    }, /already in the catalogue/)
  })

  test('createFromDeezerUrl throws DeezerPlaylistNotFoundError when Deezer returns error code 800', async ({
    assert,
  }) => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ error: { code: 800, type: 'DataException', message: 'no data' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )

    await assert.rejects(async () => {
      await service.createFromDeezerUrl({
        url: 'https://www.deezer.com/playlist/2300',
        genreLabel: 'Pop',
      })
    }, /does not exist/)
  })

  test('createFromDeezerUrl throws DeezerPlaylistFetchError when Deezer returns an unknown error code', async ({
    assert,
  }) => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { code: 700, type: 'X', message: 'oops' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    await assert.rejects(async () => {
      await service.createFromDeezerUrl({
        url: 'https://www.deezer.com/playlist/2305',
        genreLabel: 'Pop',
      })
    }, /Failed to fetch Deezer playlist/)
  })

  test('createFromDeezerUrl throws DeezerPlaylistFetchError on non-2xx', async ({ assert }) => {
    globalThis.fetch = async () => new Response('boom', { status: 503 })

    await assert.rejects(async () => {
      await service.createFromDeezerUrl({
        url: 'https://www.deezer.com/playlist/2400',
        genreLabel: 'Pop',
      })
    }, /Failed to fetch Deezer playlist/)
  })

  test('createFromDeezerUrl throws DeezerPlaylistFetchError when fetch itself fails', async ({
    assert,
  }) => {
    globalThis.fetch = async () => {
      throw new TypeError('network down')
    }
    await assert.rejects(async () => {
      await service.createFromDeezerUrl({
        url: 'https://www.deezer.com/playlist/2410',
        genreLabel: 'Pop',
      })
    }, /Failed to fetch Deezer playlist/)
  })

  test('createFromDeezerUrl throws DeezerPlaylistFetchError when response is not valid JSON', async ({
    assert,
  }) => {
    globalThis.fetch = async () =>
      new Response('not-json', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    await assert.rejects(async () => {
      await service.createFromDeezerUrl({
        url: 'https://www.deezer.com/playlist/2415',
        genreLabel: 'Pop',
      })
    }, /Failed to fetch Deezer playlist/)
  })

  test('createFromDeezerUrl throws DeezerPlaylistFetchError when payload is missing fields', async ({
    assert,
  }) => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ id: 1, title: 'No tracks' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    await assert.rejects(async () => {
      await service.createFromDeezerUrl({
        url: 'https://www.deezer.com/playlist/2420',
        genreLabel: 'Pop',
      })
    }, /Failed to fetch Deezer playlist/)
  })

  test('createFromDeezerUrl propagates InvalidDeezerUrlError from the parser', async ({
    assert,
  }) => {
    await assert.rejects(async () => {
      await service.createFromDeezerUrl({
        url: 'not-a-url',
        genreLabel: 'Pop',
      })
    }, /Invalid Deezer playlist URL/)
  })

  test('renamePlaylist updates name and flips nameOverridden', async ({ assert }) => {
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 2500,
      name: 'Original',
      genreLabel: 'Pop',
      coverUrl: null,
    })

    const updated = await service.renamePlaylist(playlist.id, 'Renamed by admin')

    assert.equal(updated.name, 'Renamed by admin')
    assert.isTrue(updated.nameOverridden)

    const reloaded = await CuratedPlaylist.findOrFail(playlist.id)
    assert.equal(reloaded.name, 'Renamed by admin')
    assert.isTrue(reloaded.nameOverridden)
  })

  test('renamePlaylist throws PlaylistNotFoundError when missing', async ({ assert }) => {
    await assert.rejects(async () => {
      await service.renamePlaylist(987654, 'whatever')
    }, /Curated playlist with id .* not found/)
  })

  test('refreshPlaylist updates cover, trackCount and name when not overridden', async ({
    assert,
  }) => {
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 2600,
      name: 'Initial',
      genreLabel: 'Pop',
      coverUrl: 'https://old/cover.jpg',
      trackCount: 10,
    })

    globalThis.fetch = async () =>
      meta({
        id: 2600,
        title: 'Fresh from Deezer',
        picture_xl: 'https://new/cover.jpg',
        nb_tracks: 999,
      })

    const refreshed = await service.refreshPlaylist(playlist.id)
    assert.equal(refreshed.name, 'Fresh from Deezer')
    assert.equal(refreshed.coverUrl, 'https://new/cover.jpg')
    assert.equal(refreshed.trackCount, 999)
  })

  test('refreshPlaylist preserves admin-overridden name', async ({ assert }) => {
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 2700,
      name: 'Custom by admin',
      genreLabel: 'Pop',
      coverUrl: 'https://old/cover.jpg',
      trackCount: 10,
      nameOverridden: true,
    })

    globalThis.fetch = async () =>
      meta({
        id: 2700,
        title: 'Deezer wants to rename me',
        picture_xl: 'https://new/cover.jpg',
        nb_tracks: 999,
      })

    const refreshed = await service.refreshPlaylist(playlist.id)
    assert.equal(refreshed.name, 'Custom by admin')
    assert.equal(refreshed.coverUrl, 'https://new/cover.jpg')
    assert.equal(refreshed.trackCount, 999)
  })

  test('refreshPlaylist invalidates the in-memory track cache for that Deezer playlist', async ({
    assert,
  }) => {
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 2800,
      name: 'Cached then refreshed',
      genreLabel: 'Pop',
      coverUrl: null,
    })

    let fetchCount = 0
    globalThis.fetch = async (input) => {
      fetchCount += 1
      const url = typeof input === 'string' ? input : (input as URL).toString()
      if (url.includes('/tracks')) {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: 1,
                title: 't',
                title_short: 't',
                preview: '',
                duration: 30,
                artist: { id: 1, name: 'a' },
                album: { id: 1, title: 'al' },
              },
            ],
            total: 1,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return meta({
        id: 2800,
        title: 'Refreshed',
        picture_xl: 'https://new/cover.jpg',
        nb_tracks: 5,
      })
    }

    await service.getRandomTracks(playlist.id, 1)
    const cachedFetchCount = fetchCount
    await service.getRandomTracks(playlist.id, 1)
    assert.equal(fetchCount, cachedFetchCount, 'cache must hit before refresh')

    await service.refreshPlaylist(playlist.id)

    const afterRefresh = fetchCount
    await service.getRandomTracks(playlist.id, 1)
    assert.isAbove(fetchCount, afterRefresh, 'cache must be invalidated after refresh')
  })

  test('refreshPlaylist throws PlaylistNotFoundError when missing', async ({ assert }) => {
    await assert.rejects(async () => {
      await service.refreshPlaylist(987654)
    }, /Curated playlist with id .* not found/)
  })

  test('refreshPlaylist propagates DeezerPlaylistFetchError on Deezer failure', async ({
    assert,
  }) => {
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 2900,
      name: 'Fails to refresh',
      genreLabel: 'Pop',
      coverUrl: null,
    })

    globalThis.fetch = async () => new Response('boom', { status: 500 })

    await assert.rejects(async () => {
      await service.refreshPlaylist(playlist.id)
    }, /Failed to fetch Deezer playlist/)
  })

  test('deletePlaylist hard-deletes and invalidates the cache', async ({ assert }) => {
    const playlist = await CuratedPlaylist.create({
      deezerPlaylistId: 3000,
      name: 'To be deleted',
      genreLabel: 'Pop',
      coverUrl: null,
    })

    let fetchCount = 0
    globalThis.fetch = async () => {
      fetchCount += 1
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 1,
              title: 't',
              title_short: 't',
              preview: '',
              duration: 30,
              artist: { id: 1, name: 'a' },
              album: { id: 1, title: 'al' },
            },
          ],
          total: 1,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    await service.getRandomTracks(playlist.id, 1)
    const cachedFetchCount = fetchCount

    await service.deletePlaylist(playlist.id)

    const reloaded = await CuratedPlaylist.query().where('id', playlist.id).first()
    assert.isNull(reloaded)

    const fresh = await CuratedPlaylist.create({
      deezerPlaylistId: 3000,
      name: 'Recreated',
      genreLabel: 'Pop',
      coverUrl: null,
    })
    await service.getRandomTracks(fresh.id, 1)
    assert.isAbove(fetchCount, cachedFetchCount)
  })

  test('deletePlaylist throws PlaylistNotFoundError when missing', async ({ assert }) => {
    await assert.rejects(async () => {
      await service.deletePlaylist(987654)
    }, /Curated playlist with id .* not found/)
  })
})
