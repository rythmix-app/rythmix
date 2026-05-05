import * as cheerio from 'cheerio'

/**
 * Lyrics aggregator inspired by https://github.com/NTag/lyrics.ovh.
 * Queries multiple sources in parallel and returns the first valid result.
 * No database cache — only an in-memory LRU so a fresh process pays the cold
 * cost once per (artist, title) pair.
 */

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const FETCH_TIMEOUT_MS = 5000

export interface LyricsFetchInput {
  artist: string
  title: string
}

export interface LyricsResult {
  lines: string[]
  source: string
}

type SourceFn = (title: string, artist: string) => Promise<string>

const REJECT_PATTERNS = [
  /no lyrics found/i,
  /lyrics not available/i,
  /we do not have the lyrics/i,
  /submit lyrics/i,
  /paroles introuvables/i,
  /n[ãa]o possui letra/i,
]

export class LyricsService {
  static cacheMax = 10_000
  private static cache = new Map<string, LyricsResult>()

  static clearCache() {
    LyricsService.cache.clear()
  }

  /**
   * Returns parsed lyric lines for a track, or null when no source has them.
   * Public surface kept track-shaped (id is unused but tolerated) for callers
   * that already pass Deezer track records.
   */
  async getLyricsForTrack(track: LyricsFetchInput & { id?: number }): Promise<LyricsResult | null> {
    return this.findLyrics(track.title, track.artist)
  }

  protected sources(): Record<string, SourceFn> {
    return {
      genius: (t, a) => this.fromGenius(t, a),
      azlyrics: (t, a) => this.fromAZLyrics(t, a),
      paroles_net: (t, a) => this.fromParolesNet(t, a),
      lyrics_mania: (t, a) => this.fromLyricsMania(t, a),
      letras: (t, a) => this.fromLetras(t, a),
      lyrics_com: (t, a) => this.fromLyricsCom(t, a),
    }
  }

  protected async findLyrics(
    title: string,
    artist: string,
    allowFallbacks = true
  ): Promise<LyricsResult | null> {
    const key = `${artist.toLowerCase()}\n${title.toLowerCase()}`
    const cached = LyricsService.cacheGet(key)
    if (cached) return cached

    const sources = this.sources()
    const attempts: Promise<LyricsResult>[] = Object.entries(sources).map(([name, fn]) =>
      fn(title, artist).then((raw) => ({ lines: this.parseLyrics(raw), source: name }))
    )

    // Fallbacks (cleaned title / primary artist) recurse once at most: each
    // variant calls findLyrics with allowFallbacks=false so we cap outbound
    // calls at 3× the base 6-source fanout instead of multiplying combinatorially.
    if (allowFallbacks) {
      if (/[(\[].*[)\]]/.test(title)) {
        const cleanTitle = title
          .replace(/\([^)]*\)/g, '')
          .replace(/\[[^\]]*\]/g, '')
          .trim()
        if (cleanTitle && cleanTitle !== title) {
          attempts.push(
            this.findLyrics(cleanTitle, artist, false).then((r) => r ?? Promise.reject())
          )
        }
      }

      const primaryArtist = artist.split(/\s*(?:feat\.?|ft\.?|featuring|&|\/|,|;)\s*/i)[0].trim()
      if (primaryArtist && primaryArtist.length > 1 && primaryArtist !== artist) {
        attempts.push(
          this.findLyrics(title, primaryArtist, false).then((r) => r ?? Promise.reject())
        )
      }
    }

    try {
      const result = await Promise.any(attempts)
      LyricsService.cacheSet(key, result)
      return result
    } catch {
      return null
    }
  }

  protected parseLyrics(raw: string): string[] {
    return raw
      .normalize('NFC')
      .replace(/[\u0080-\u009F]/g, '')
      .split(/\r?\n/)
      .map((line) =>
        line
          .replace(/^\s*\d+\s*Contributors?.*?Lyrics/i, '')
          .replace(/\[[^\]]*\]/g, '')
          .trim()
      )
      .filter((line) => line.length > 0)
  }

  // ── HTTP plumbing ──────────────────────────────────────────────────────

  protected async fetchHtml(
    url: string,
    options: { rejectRedirects?: boolean } = {}
  ): Promise<cheerio.CheerioAPI> {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (options.rejectRedirects && res.redirected) {
      throw new Error('Redirected (likely no match)')
    }
    return cheerio.load(await res.text())
  }

  protected cleanLyrics(text: string): string {
    text = text
      .trim()
      .replace(/\n{3,}/g, '\n\n')
      .replace(/ +\n/g, '\n')
    if (text.length < 20) throw new Error('No lyrics found')
    if (text.length < 80 && REJECT_PATTERNS.some((re) => re.test(text))) {
      throw new Error('Scraped error message, not lyrics')
    }
    return text
  }

  protected textln(el: cheerio.Cheerio<any>): string {
    el.find('script').remove()
    let html = el.html() ?? ''
    html = html.replace(/\s*<br\s*\/?>\s*/gi, '\n')
    html = html.replace(/<[^>]+>/g, '')
    html = html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&nbsp;/g, ' ')
    html = html.replace(/\r\n/g, '\n').replace(/\t/g, '').replace(/ +/g, ' ')
    html = html.replace(/\n /g, '\n').replace(/ \n/g, '\n')
    return html.trim()
  }

  // ── Sources ────────────────────────────────────────────────────────────

  protected async fromGenius(title: string, artist: string): Promise<string> {
    const searchUrl =
      'https://genius.com/api/search/multi?q=' + encodeURIComponent(`${artist} ${title}`)
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!searchRes.ok) throw new Error(`HTTP ${searchRes.status}`)
    const data = (await searchRes.json()) as any
    const songSection = (data?.response?.sections || []).find((s: any) => s.type === 'song')
    const hits = songSection?.hits || []
    const matching = hits.filter((h: any) => titleMatches(title, h.result?.title || ''))
    if (matching.length === 0) throw new Error('No matching title')

    let best = matching[0]
    let bestScore = Number.POSITIVE_INFINITY
    for (const hit of matching) {
      const score = levenshtein(
        artist.toLowerCase(),
        (hit.result?.primary_artist?.name || '').toLowerCase()
      )
      if (score < bestScore) {
        bestScore = score
        best = hit
      }
    }

    const $ = await this.fetchHtml(best.result.url)
    const containers = $('[data-lyrics-container="true"]')
    if (containers.length === 0) throw new Error('No lyrics container')
    let lyrics = ''
    containers.each((_, el) => {
      const $el = $(el)
      $el.find('br').replaceWith('\n')
      lyrics += $el.text() + '\n'
    })
    return this.cleanLyrics(lyrics.trim())
  }

  protected async fromAZLyrics(title: string, artist: string): Promise<string> {
    const a = stripToAlphaNum(deburr(artist)).replace(/^the/, '')
    const s = stripToAlphaNum(deburr(title))
    const $ = await this.fetchHtml(`https://www.azlyrics.com/lyrics/${a}/${s}.html`)
    const divs = $('.col-xs-12.col-lg-8.text-center div')
    let lyrics = ''
    divs.each((_, el) => {
      const $el = $(el)
      if (!$el.attr('class') && !$el.attr('id') && $el.text().trim().length > 100) {
        $el.find('br').replaceWith('\n')
        lyrics = $el.text().trim()
        return false
      }
    })
    return this.cleanLyrics(lyrics)
  }

  protected async fromLetras(title: string, artist: string): Promise<string> {
    const a = kebabCase(deburr(artist.trim()))
    const s = kebabCase(deburr(title.trim()))
    const $ = await this.fetchHtml(`https://www.letras.mus.br/${a}/${s}/`, {
      rejectRedirects: true,
    })
    const els = $('.lyric-original p, .lyric-tra p')
    if (els.length === 0) throw new Error('Not found')
    let lyrics = ''
    els.each((_, p) => {
      const $p = $(p)
      $p.find('br').replaceWith('\n')
      lyrics += $p.text().trim() + '\n\n'
    })
    return this.cleanLyrics(lyrics.trim())
  }

  protected async fromLyricsCom(title: string, artist: string): Promise<string> {
    const $search = await this.fetchHtml(
      'https://www.lyrics.com/serp.php?st=' + encodeURIComponent(`${title} ${artist}`) + '&stype=1'
    )
    const results = $search('.sec-lyric.clearfix')
    if (results.length === 0) throw new Error('No results')

    let bestLink: string | null = null
    let bestScore = Number.POSITIVE_INFINITY
    results.each((_, el) => {
      const $el = $search(el)
      const resultArtist = $el.find('.lyric-meta-album-artist a').first().text()
      const resultTitle = $el.find('a.lyric-meta-title').text()
      const link = $el.find('a.lyric-meta-title').attr('href')
      if (link && titleMatches(title, resultTitle)) {
        const score = levenshtein(artist.toLowerCase(), resultArtist.toLowerCase())
        if (score < bestScore) {
          bestScore = score
          bestLink = link
        }
      }
    })
    if (!bestLink) throw new Error('No matching result')
    const url = (bestLink as string).startsWith('http')
      ? (bestLink as string)
      : 'https://www.lyrics.com' + (bestLink as string)
    const $ = await this.fetchHtml(url)
    const el = $('#lyric-body-text')
    if (el.length === 0) throw new Error('Not found')
    el.find('br').replaceWith('\n')
    return this.cleanLyrics(el.text().trim())
  }

  protected async fromParolesNet(title: string, artist: string): Promise<string> {
    const slug = (s: string) => kebabCase(deburr(s.trim().toLowerCase()))
    const $ = await this.fetchHtml(
      `https://www.paroles.net/${slug(artist)}/paroles-${slug(title)}`,
      { rejectRedirects: true }
    )
    const el = $('.song-text')
    if (el.length === 0) throw new Error('Not found')
    el.find('h2').remove()
    el.find('div[id], div[class]').remove()
    return this.cleanLyrics(this.textln(el))
  }

  protected async fromLyricsMania(title: string, artist: string): Promise<string> {
    const slug = (s: string) => snakeCase(deburr(s.trim().toLowerCase()))
    const urls = [
      `https://www.lyricsmania.com/${slug(title)}_lyrics_${slug(artist)}.html`,
      `https://www.lyricsmania.com/${slug(title)}_${slug(artist)}.html`,
    ]
    return Promise.any(
      urls.map(async (url) => {
        const $ = await this.fetchHtml(url, { rejectRedirects: true })
        if ($('.lyrics-body').length === 0) throw new Error('Not found')
        return this.cleanLyrics(this.textln($('.lyrics-body')))
      })
    )
  }

  // ── LRU helpers ────────────────────────────────────────────────────────

  private static cacheGet(key: string): LyricsResult | undefined {
    const val = LyricsService.cache.get(key)
    if (val === undefined) return undefined
    LyricsService.cache.delete(key)
    LyricsService.cache.set(key, val)
    return val
  }

  private static cacheSet(key: string, val: LyricsResult): void {
    LyricsService.cache.set(key, val)
    while (LyricsService.cache.size > LyricsService.cacheMax) {
      LyricsService.cache.delete(LyricsService.cache.keys().next().value!)
    }
  }
}

// ── String helpers (module-private) ──────────────────────────────────────

function deburr(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function kebabCase(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function snakeCase(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
}

function stripToAlphaNum(s: string): string {
  return s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function titleMatches(requested: string, found: string): boolean {
  const normalize = (s: string) =>
    deburr(s)
      .toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/[^a-z0-9]/g, '')
  const a = normalize(requested)
  const b = normalize(found)
  if (!a || !b) return false
  if (a === b) return true
  if (a.includes(b) || b.includes(a)) return true
  const dist = levenshtein(a, b)
  return dist / Math.max(a.length, b.length) <= 0.3
}
