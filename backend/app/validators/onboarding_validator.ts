import vine from '@vinejs/vine'

export const MIN_ONBOARDING_ARTISTS = 3
export const MAX_ONBOARDING_ARTISTS = 5

export const setOnboardingArtistsValidator = vine.compile(
  vine.object({
    deezerArtistIds: vine
      .array(vine.number().positive())
      .minLength(MIN_ONBOARDING_ARTISTS)
      .maxLength(MAX_ONBOARDING_ARTISTS)
      .distinct(),
  })
)

export const onboardingSuggestionsValidator = vine.compile(
  vine.object({
    country: vine.string().trim().fixedLength(2).optional(),
    limit: vine.number().min(1).max(50).optional(),
  })
)
