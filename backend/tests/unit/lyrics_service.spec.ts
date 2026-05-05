import { test } from '@japa/runner'
import type * as cheerio from 'cheerio'
import { LyricsService } from '#services/lyrics_service'

const FAKE_LYRICS = [
  'Première ligne du couplet',
  'Deuxième ligne du couplet',
  '',
  'Troisième ligne, plus longue, pour valider la longueur minimum',
].join('\n')

const GENIUS_PAGE_HTML = `
  <html><body>
    <div data-lyrics-container="true">${FAKE_LYRICS.replace(/\n/g, '<br>')}</div>
  </body></html>
`

const AZ_HTML = `
  <html><body>
    <div class="col-xs-12 col-lg-8 text-center">
      <div class="ringtone"></div>
      <div>${FAKE_LYRICS.replace(/\n/g, '<br>') + '<br>extra padding to pass length filter'.repeat(5)}</div>
    </div>
  </body></html>
`

const PAROLES_HTML = `
  <html><body>
    <div class="song-text">
      <h2>Title</h2>
      <div id="ad"></div>
      ${FAKE_LYRICS.replace(/\n/g, '<br>')}
    </div>
  </body></html>
`

const LETRAS_HTML = `
  <html><body>
    <div class="lyric-original">
      <p>${FAKE_LYRICS.split('\n').slice(0, 2).join('<br>')}</p>
      <p>${FAKE_LYRICS.split('\n').slice(2).join('<br>')}</p>
    </div>
  </body></html>
`

const LYRICSCOM_SEARCH_HTML = `
  <html><body>
    <div class="sec-lyric clearfix">
      <a class="lyric-meta-title" href="/lyric/123/Some+Track">Some Track</a>
      <div class="lyric-meta-album-artist"><a>Some Artist</a></div>
    </div>
  </body></html>
`

const LYRICSCOM_SONG_HTML = `
  <html><body>
    <pre id="lyric-body-text">${FAKE_LYRICS.replace(/\n/g, '<br>')}</pre>
  </body></html>
`

const MANIA_HTML = `
  <html><body>
    <div class="lyrics-body">${FAKE_LYRICS.replace(/\n/g, '<br>')}</div>
  </body></html>
`

const GENIUS_SEARCH_JSON = {
  response: {
    sections: [
      {
        type: 'song',
        hits: [
          {
            result: {
              title: 'Some Track',
              primary_artist: { name: 'Some Artist' },
              url: 'https://genius.com/some-track-lyrics',
            },
          },
        ],
      },
    ],
  },
}

function htmlResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
    ...init,
  })
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

type Routes = Array<{ match: RegExp; respond: () => Response | Promise<Response> }>

function fetchRouter(routes: Routes) {
  return async (input: any) => {
    const url = typeof input === 'string' ? input : (input as URL | Request).toString()
    for (const r of routes) {
      if (r.match.test(url)) return r.respond()
    }
    throw new Error(`Unrouted URL: ${url}`)
  }
}

test.group('LyricsService — multi-source aggregator', (group) => {
  let service: LyricsService
  let originalFetch: typeof fetch

  group.each.setup(() => {
    service = new LyricsService()
    LyricsService.clearCache()
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('returns lines from Genius when it responds first', async ({ assert }) => {
    globalThis.fetch = fetchRouter([
      { match: /genius\.com\/api\/search/, respond: () => jsonResponse(GENIUS_SEARCH_JSON) },
      { match: /genius\.com\/some-track/, respond: () => htmlResponse(GENIUS_PAGE_HTML) },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])

    const result = await service.getLyricsForTrack({ artist: 'Some Artist', title: 'Some Track' })
    assert.isNotNull(result)
    assert.equal(result!.source, 'genius')
    assert.isAtLeast(result!.lines.length, 3)
  })

  test('falls through to AZLyrics when Genius fails', async ({ assert }) => {
    globalThis.fetch = fetchRouter([
      { match: /genius\.com/, respond: () => new Response('boom', { status: 500 }) },
      { match: /azlyrics\.com/, respond: () => htmlResponse(AZ_HTML) },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])

    const result = await service.getLyricsForTrack({ artist: 'Some Artist', title: 'Some Track' })
    assert.isNotNull(result)
    assert.equal(result!.source, 'azlyrics')
  })

  test('parses Paroles.net successfully', async ({ assert }) => {
    globalThis.fetch = fetchRouter([
      { match: /paroles\.net/, respond: () => htmlResponse(PAROLES_HTML) },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])

    const result = await service.getLyricsForTrack({ artist: 'Artiste', title: 'Titre' })
    assert.isNotNull(result)
    assert.equal(result!.source, 'paroles_net')
  })

  test('parses Letras.mus.br successfully', async ({ assert }) => {
    globalThis.fetch = fetchRouter([
      { match: /letras\.mus\.br/, respond: () => htmlResponse(LETRAS_HTML) },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])

    const result = await service.getLyricsForTrack({ artist: 'Artista', title: 'Cancao' })
    assert.isNotNull(result)
    assert.equal(result!.source, 'letras')
  })

  test('parses Lyrics.com via search + song page', async ({ assert }) => {
    globalThis.fetch = fetchRouter([
      { match: /lyrics\.com\/serp\.php/, respond: () => htmlResponse(LYRICSCOM_SEARCH_HTML) },
      { match: /lyrics\.com\/lyric/, respond: () => htmlResponse(LYRICSCOM_SONG_HTML) },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])

    const result = await service.getLyricsForTrack({ artist: 'Some Artist', title: 'Some Track' })
    assert.isNotNull(result)
    assert.equal(result!.source, 'lyrics_com')
  })

  test('parses LyricsMania successfully', async ({ assert }) => {
    globalThis.fetch = fetchRouter([
      { match: /lyricsmania\.com/, respond: () => htmlResponse(MANIA_HTML) },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])

    const result = await service.getLyricsForTrack({ artist: 'Some Artist', title: 'Some Track' })
    assert.isNotNull(result)
    assert.equal(result!.source, 'lyrics_mania')
  })

  test('returns null when every source fails', async ({ assert }) => {
    globalThis.fetch = fetchRouter([
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])

    const result = await service.getLyricsForTrack({ artist: 'Nope', title: 'Never' })
    assert.isNull(result)
  })

  test('uses in-memory LRU cache on subsequent calls', async ({ assert }) => {
    let calls = 0
    globalThis.fetch = fetchRouter([
      {
        match: /azlyrics\.com/,
        respond: () => {
          calls += 1
          return htmlResponse(AZ_HTML)
        },
      },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])

    await service.getLyricsForTrack({ artist: 'Cached', title: 'Track' })
    const after1 = calls
    const second = await service.getLyricsForTrack({ artist: 'Cached', title: 'Track' })
    assert.equal(calls, after1)
    assert.isNotNull(second)
  })

  test('falls back to a cleaned title when the original has parentheses', async ({ assert }) => {
    globalThis.fetch = fetchRouter([
      // Original title (with parens) → all sources 404; cleaned title → Paroles works.
      {
        match: /paroles\.net\/some-artist\/paroles-some-track-radio-edit/,
        respond: () => new Response('not found', { status: 404 }),
      },
      {
        match: /paroles\.net\/some-artist\/paroles-some-track/,
        respond: () => htmlResponse(PAROLES_HTML),
      },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])

    const result = await service.getLyricsForTrack({
      artist: 'Some Artist',
      title: 'Some Track (Radio Edit)',
    })
    assert.isNotNull(result)
    assert.equal(result!.source, 'paroles_net')
  })

  test('falls back to the primary artist when the artist contains a feat.', async ({ assert }) => {
    globalThis.fetch = fetchRouter([
      // Full artist string fails on every source...
      {
        match: /paroles\.net\/some-artist-feat-other\/paroles-track/,
        respond: () => new Response('not found', { status: 404 }),
      },
      // ...but the primary artist alone works on Paroles.
      {
        match: /paroles\.net\/some-artist\/paroles-track/,
        respond: () => htmlResponse(PAROLES_HTML),
      },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])

    const result = await service.getLyricsForTrack({
      artist: 'Some Artist feat. Other',
      title: 'Track',
    })
    assert.isNotNull(result)
    assert.equal(result!.source, 'paroles_net')
  })

  test('handles absolute href URLs returned by Lyrics.com search', async ({ assert }) => {
    const searchHtmlAbsoluteHref = `
      <html><body>
        <div class="sec-lyric clearfix">
          <a class="lyric-meta-title" href="https://www.lyrics.com/lyric/999/Track">Some Track</a>
          <div class="lyric-meta-album-artist"><a>Some Artist</a></div>
        </div>
      </body></html>
    `
    globalThis.fetch = fetchRouter([
      { match: /lyrics\.com\/serp\.php/, respond: () => htmlResponse(searchHtmlAbsoluteHref) },
      { match: /lyrics\.com\/lyric\/999/, respond: () => htmlResponse(LYRICSCOM_SONG_HTML) },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])

    const result = await service.getLyricsForTrack({ artist: 'Some Artist', title: 'Some Track' })
    assert.isNotNull(result)
    assert.equal(result!.source, 'lyrics_com')
  })

  test('matches titles via Levenshtein when neither is a substring of the other', async ({
    assert,
  }) => {
    // Genius response titled "Some Trakk" (1-letter typo) — Levenshtein covers it.
    const fuzzyGeniusJson = {
      response: {
        sections: [
          {
            type: 'song',
            hits: [
              {
                result: {
                  title: 'Some Trakk',
                  primary_artist: { name: 'Some Artist' },
                  url: 'https://genius.com/some-track-lyrics',
                },
              },
            ],
          },
        ],
      },
    }
    globalThis.fetch = fetchRouter([
      { match: /genius\.com\/api\/search/, respond: () => jsonResponse(fuzzyGeniusJson) },
      { match: /genius\.com\/some-track/, respond: () => htmlResponse(GENIUS_PAGE_HTML) },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])

    const result = await service.getLyricsForTrack({ artist: 'Some Artist', title: 'Some Track' })
    assert.isNotNull(result)
    assert.equal(result!.source, 'genius')
  })

  test('evicts oldest cache entry when cacheMax is exceeded', async ({ assert }) => {
    const previousMax = LyricsService.cacheMax
    LyricsService.cacheMax = 2
    try {
      globalThis.fetch = fetchRouter([
        { match: /azlyrics\.com/, respond: () => htmlResponse(AZ_HTML) },
        { match: /./, respond: () => new Response('boom', { status: 500 }) },
      ])
      await service.getLyricsForTrack({ artist: 'A', title: 'T1' })
      await service.getLyricsForTrack({ artist: 'A', title: 'T2' })
      await service.getLyricsForTrack({ artist: 'A', title: 'T3' })

      // T1 should have been evicted (oldest), so it'll be re-fetched. Mock now refuses
      // to serve AZLyrics: the call should still re-trigger sources (and fail).
      globalThis.fetch = fetchRouter([
        { match: /./, respond: () => new Response('boom', { status: 500 }) },
      ])
      const result = await service.getLyricsForTrack({ artist: 'A', title: 'T1' })
      assert.isNull(result)
    } finally {
      LyricsService.cacheMax = previousMax
    }
  })

  test('rejects scraped pages whose body is too short to be lyrics', async ({ assert }) => {
    globalThis.fetch = fetchRouter([
      {
        match: /paroles\.net/,
        respond: () =>
          htmlResponse('<html><body><div class="song-text">no lyrics found</div></body></html>'),
      },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])

    const result = await service.getLyricsForTrack({ artist: 'X', title: 'Y' })
    assert.isNull(result)
  })

  test('rejects medium-length placeholder messages matching REJECT_PATTERNS', async ({
    assert,
  }) => {
    // Body is long enough to skip the < 20 guard but still short and obviously a placeholder.
    globalThis.fetch = fetchRouter([
      {
        match: /paroles\.net/,
        respond: () =>
          htmlResponse(
            '<html><body><div class="song-text">no lyrics found in our database for this song</div></body></html>'
          ),
      },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])
    const result = await service.getLyricsForTrack({ artist: 'X', title: 'Y' })
    assert.isNull(result)
  })

  test('returns null when Genius search returns malformed JSON without a song section', async ({
    assert,
  }) => {
    globalThis.fetch = fetchRouter([
      // Empty response object → data?.response?.sections is undefined → || [] kicks in.
      { match: /genius\.com\/api\/search/, respond: () => jsonResponse({}) },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])
    const result = await service.getLyricsForTrack({ artist: 'Nope', title: 'Never' })
    assert.isNull(result)
  })

  test('skips LyricsMania pages without a .lyrics-body container', async ({ assert }) => {
    globalThis.fetch = fetchRouter([
      // Both URLs return valid HTML but no .lyrics-body — should fall through.
      { match: /lyricsmania\.com/, respond: () => htmlResponse('<html><body></body></html>') },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])
    const result = await service.getLyricsForTrack({ artist: 'A', title: 'B' })
    assert.isNull(result)
  })

  test('treats one-string-contains-the-other as a title match', async ({ assert }) => {
    // Found title "Some Track Remix" includes "Some Track" → covers the substring branch.
    const containsJson = {
      response: {
        sections: [
          {
            type: 'song',
            hits: [
              {
                result: {
                  title: 'Some Track Remix',
                  primary_artist: { name: 'Some Artist' },
                  url: 'https://genius.com/some-track-lyrics',
                },
              },
            ],
          },
        ],
      },
    }
    globalThis.fetch = fetchRouter([
      { match: /genius\.com\/api\/search/, respond: () => jsonResponse(containsJson) },
      { match: /genius\.com\/some-track/, respond: () => htmlResponse(GENIUS_PAGE_HTML) },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])
    const result = await service.getLyricsForTrack({ artist: 'Some Artist', title: 'Some Track' })
    assert.isNotNull(result)
    assert.equal(result!.source, 'genius')
  })

  test('rejects matches when the requested title normalises to an empty string', async ({
    assert,
  }) => {
    // "(...)" has only parenthetical content → normalize() returns "" → titleMatches false.
    const punctOnlyJson = {
      response: {
        sections: [
          {
            type: 'song',
            hits: [
              {
                result: {
                  title: 'Real Title',
                  primary_artist: { name: 'Some Artist' },
                  url: 'https://genius.com/real-title',
                },
              },
            ],
          },
        ],
      },
    }
    globalThis.fetch = fetchRouter([
      { match: /genius\.com\/api\/search/, respond: () => jsonResponse(punctOnlyJson) },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])
    const result = await service.getLyricsForTrack({ artist: 'Some Artist', title: '(...)' })
    assert.isNull(result)
  })

  test('skips Letras pages without lyric paragraphs', async ({ assert }) => {
    globalThis.fetch = fetchRouter([
      { match: /letras\.mus\.br/, respond: () => htmlResponse('<html><body></body></html>') },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])
    const result = await service.getLyricsForTrack({ artist: 'X', title: 'Y' })
    assert.isNull(result)
  })

  test('skips Lyrics.com when the search has no results', async ({ assert }) => {
    globalThis.fetch = fetchRouter([
      {
        match: /lyrics\.com\/serp\.php/,
        respond: () => htmlResponse('<html><body></body></html>'),
      },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])
    const result = await service.getLyricsForTrack({ artist: 'X', title: 'Y' })
    assert.isNull(result)
  })

  test('skips Lyrics.com when search results all have non-matching titles', async ({ assert }) => {
    const noMatchHtml = `
      <html><body>
        <div class="sec-lyric clearfix">
          <a class="lyric-meta-title" href="/lyric/1/Other">Totally Different Title</a>
          <div class="lyric-meta-album-artist"><a>Some Artist</a></div>
        </div>
      </body></html>
    `
    globalThis.fetch = fetchRouter([
      { match: /lyrics\.com\/serp\.php/, respond: () => htmlResponse(noMatchHtml) },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])
    const result = await service.getLyricsForTrack({ artist: 'Some Artist', title: 'Some Track' })
    assert.isNull(result)
  })

  test('skips Lyrics.com when the song page has no #lyric-body-text', async ({ assert }) => {
    globalThis.fetch = fetchRouter([
      { match: /lyrics\.com\/serp\.php/, respond: () => htmlResponse(LYRICSCOM_SEARCH_HTML) },
      { match: /lyrics\.com\/lyric/, respond: () => htmlResponse('<html><body></body></html>') },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])
    const result = await service.getLyricsForTrack({ artist: 'Some Artist', title: 'Some Track' })
    assert.isNull(result)
  })

  test('skips Paroles.net when the .song-text container is missing', async ({ assert }) => {
    globalThis.fetch = fetchRouter([
      { match: /paroles\.net/, respond: () => htmlResponse('<html><body></body></html>') },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])
    const result = await service.getLyricsForTrack({ artist: 'X', title: 'Y' })
    assert.isNull(result)
  })

  test('falls back recursively even when both fallbacks return null', async ({ assert }) => {
    // Title with parens + feat artist forces both fallback branches; every source fails so
    // each recursive findLyrics call also resolves to null (covering the `r ?? Promise.reject()`
    // null branch on both fallbacks).
    globalThis.fetch = fetchRouter([
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])
    const result = await service.getLyricsForTrack({
      artist: 'Main Artist feat. Other',
      title: 'Track (Edit)',
    })
    assert.isNull(result)
  })

  test('falls back to empty primary_artist name when missing on Genius hit', async ({ assert }) => {
    // Hit has matching title but no primary_artist — covers `(... || '').toLowerCase()`.
    const noArtistJson = {
      response: {
        sections: [
          {
            type: 'song',
            hits: [{ result: { title: 'Track', url: 'https://genius.com/track' } }],
          },
        ],
      },
    }
    globalThis.fetch = fetchRouter([
      { match: /genius\.com\/api\/search/, respond: () => jsonResponse(noArtistJson) },
      { match: /genius\.com\/track/, respond: () => htmlResponse(GENIUS_PAGE_HTML) },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])
    const result = await service.getLyricsForTrack({ artist: 'A', title: 'Track' })
    assert.isNotNull(result)
    assert.equal(result!.source, 'genius')
  })

  test('rejects Genius pages with no lyrics container', async ({ assert }) => {
    globalThis.fetch = fetchRouter([
      { match: /genius\.com\/api\/search/, respond: () => jsonResponse(GENIUS_SEARCH_JSON) },
      {
        match: /genius\.com\/some-track/,
        respond: () => htmlResponse('<html><body></body></html>'),
      },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])
    const result = await service.getLyricsForTrack({ artist: 'Some Artist', title: 'Some Track' })
    assert.isNull(result)
  })

  test('drops Genius hits whose result has no title field', async ({ assert }) => {
    // Hit with an empty result object → titleMatches gets '' → filtered out → no matches.
    const noTitleJson = {
      response: {
        sections: [{ type: 'song', hits: [{ result: { primary_artist: { name: 'A' } } }] }],
      },
    }
    globalThis.fetch = fetchRouter([
      { match: /genius\.com\/api\/search/, respond: () => jsonResponse(noTitleJson) },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])
    const result = await service.getLyricsForTrack({ artist: 'A', title: 'B' })
    assert.isNull(result)
  })

  test('picks the closest artist among multiple matching Genius hits', async ({ assert }) => {
    // Two hits with matching titles but different artist closeness — we should land on the
    // closer one (covers both branches of the score-comparison loop).
    const multiHitJson = {
      response: {
        sections: [
          {
            type: 'song',
            hits: [
              {
                result: {
                  title: 'Some Track',
                  primary_artist: { name: 'Wrong Person Entirely' },
                  url: 'https://genius.com/wrong',
                },
              },
              {
                result: {
                  title: 'Some Track',
                  primary_artist: { name: 'Some Artist' },
                  url: 'https://genius.com/right',
                },
              },
            ],
          },
        ],
      },
    }
    globalThis.fetch = fetchRouter([
      { match: /genius\.com\/api\/search/, respond: () => jsonResponse(multiHitJson) },
      { match: /genius\.com\/right/, respond: () => htmlResponse(GENIUS_PAGE_HTML) },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])
    const result = await service.getLyricsForTrack({ artist: 'Some Artist', title: 'Some Track' })
    assert.isNotNull(result)
    assert.equal(result!.source, 'genius')
  })

  test('parseLyrics strips section markers, Genius header, and C1 control chars', ({ assert }) => {
    class ExposedLyricsService extends LyricsService {
      public parseLyricsPublic(raw: string) {
        return this.parseLyrics(raw)
      }
    }
    const exposed = new ExposedLyricsService()
    const raw = [
      '21 ContributorsTranslationsEnglishMiroirs Lyrics[Paroles de "Miroirs"]',
      '[Couplet 1]',
      'Première ligne avec un caractère de contrôle',
      '[Refrain]',
      'Deuxième ligne valide',
      'Yeah [hook] suite',
      '   ',
    ].join('\n')

    const lines = exposed.parseLyricsPublic(raw)
    assert.deepEqual(lines, [
      'Première ligne avec un caractère de contrôle',
      'Deuxième ligne valide',
      'Yeah  suite',
    ])
  })

  test('textln returns an empty string when the selection has no matched elements', async ({
    assert,
  }) => {
    const cheerioMod = await import('cheerio')
    class ExposedLyricsService extends LyricsService {
      public textlnPublic(el: cheerio.Cheerio<any>) {
        return this.textln(el)
      }
    }
    const $ = cheerioMod.load('<html><body></body></html>')
    const exposed = new ExposedLyricsService()
    assert.equal(exposed.textlnPublic($('does-not-exist')), '')
  })

  test('rejects redirected responses when rejectRedirects is set', async ({ assert }) => {
    // Letras passes rejectRedirects: true. We craft a Response with redirected=true
    // (Response constructor doesn't expose that flag, so we override it).
    const redirectedRes = () => {
      const r = new Response('<html></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
      Object.defineProperty(r, 'redirected', { value: true, configurable: true })
      return r
    }
    globalThis.fetch = fetchRouter([
      { match: /letras\.mus\.br/, respond: () => redirectedRes() },
      { match: /./, respond: () => new Response('boom', { status: 500 }) },
    ])
    const result = await service.getLyricsForTrack({ artist: 'X', title: 'Y' })
    assert.isNull(result)
  })
})
