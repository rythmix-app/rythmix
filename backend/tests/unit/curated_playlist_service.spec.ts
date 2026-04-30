import { test } from '@japa/runner'
import CuratedPlaylist from '#models/curated_playlist'
import { CuratedPlaylistService } from '#services/curated_playlist_service'
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
})
