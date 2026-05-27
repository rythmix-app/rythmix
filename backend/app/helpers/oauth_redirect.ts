import { DateTime } from 'luxon'
import encryption from '@adonisjs/core/services/encryption'
import env from '#start/env'
import { OauthProvider } from '#enums/oauth_provider'

const ALLOWED_RETURN_URL_SCHEMES = ['frontmobile', 'exp', 'exp+frontmobile'] as const
const MAX_RETURN_URL_LENGTH = 500
const DEFAULT_OAUTH_DEEP_LINK_PATH = 'auth/oauth-callback'
const STATE_TTL_MINUTES = 10

interface OauthState {
  provider: OauthProvider
  returnUrl: string
  expiresAt: string
}

export function isAllowedReturnUrl(url: string | undefined | null): url is string {
  if (!url) return false
  if (url.length > MAX_RETURN_URL_LENGTH) return false
  const schemeMatch = url.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//)
  if (!schemeMatch) return false
  return ALLOWED_RETURN_URL_SCHEMES.includes(
    schemeMatch[1] as (typeof ALLOWED_RETURN_URL_SCHEMES)[number]
  )
}

export function defaultOauthReturnUrl(): string {
  const scheme = env.get('OAUTH_DEEP_LINK_SCHEME', 'frontmobile')
  return `${scheme}://${DEFAULT_OAUTH_DEEP_LINK_PATH}`
}

export function buildOauthRedirectUrl(
  returnUrl: string | undefined | null,
  params: Record<string, string | undefined>
): string {
  const base = isAllowedReturnUrl(returnUrl) ? returnUrl : defaultOauthReturnUrl()
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value)
    }
  }
  const separator = base.includes('?') ? '&' : '?'
  const qs = search.toString()
  return qs ? `${base}${separator}${qs}` : base
}

export function encodeOauthState(provider: OauthProvider, returnUrl: string): string {
  const payload: OauthState = {
    provider,
    returnUrl,
    expiresAt: DateTime.now().plus({ minutes: STATE_TTL_MINUTES }).toISO()!,
  }
  return encryption.encrypt(payload)
}

export function decodeOauthState(
  state: string | undefined,
  expectedProvider: OauthProvider
): { returnUrl: string } | null {
  if (!state) return null
  const payload = encryption.decrypt<OauthState>(state)
  if (!payload) return null
  if (payload.provider !== expectedProvider) return null
  const expiresAt = DateTime.fromISO(payload.expiresAt)
  if (!expiresAt.isValid || expiresAt <= DateTime.now()) return null
  if (!isAllowedReturnUrl(payload.returnUrl)) return null
  return { returnUrl: payload.returnUrl }
}
