import { test } from '@japa/runner'
import UserTrackInteraction from '#models/user_track_interaction'
import { TrackInteractionsService } from '#services/track_interactions_service'
import { InteractionAction } from '#enums/interaction_action'
import { deleteTrackInteractions } from '#tests/utils/track_interaction_helpers'
import { createAuthenticatedUser } from '#tests/utils/auth_helpers'

test.group('TrackInteractionsService', (group) => {
  let service: TrackInteractionsService

  deleteTrackInteractions(group)

  group.each.setup(() => {
    service = new TrackInteractionsService()
  })

  test('upsertInteraction creates a new row when none exists', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('svc_create')

    const result = await service.upsertInteraction({
      userId: user.id,
      deezerTrackId: '1',
      action: InteractionAction.Liked,
    })

    assert.instanceOf(result, UserTrackInteraction)
    if (result instanceof UserTrackInteraction) {
      assert.equal(result.action, InteractionAction.Liked)
    }
  })

  test('upsertInteraction flips the action on the existing row (rollback)', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('svc_flip')

    const first = await service.upsertInteraction({
      userId: user.id,
      deezerTrackId: '1',
      action: InteractionAction.Liked,
    })
    const second = await service.upsertInteraction({
      userId: user.id,
      deezerTrackId: '1',
      action: InteractionAction.Disliked,
    })

    assert.instanceOf(first, UserTrackInteraction)
    assert.instanceOf(second, UserTrackInteraction)
    if (first instanceof UserTrackInteraction && second instanceof UserTrackInteraction) {
      assert.equal(first.id, second.id)
      assert.equal(second.action, InteractionAction.Disliked)
    }

    const rows = await UserTrackInteraction.query()
      .where('userId', user.id)
      .where('deezerTrackId', '1')
    assert.equal(rows.length, 1)
  })

  test('getByUserId filters by action when provided', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('svc_filter')

    await service.upsertInteraction({
      userId: user.id,
      deezerTrackId: '10',
      action: InteractionAction.Liked,
    })
    await service.upsertInteraction({
      userId: user.id,
      deezerTrackId: '20',
      action: InteractionAction.Disliked,
    })

    const liked = await service.getByUserId(user.id, InteractionAction.Liked)
    const all = await service.getByUserId(user.id)

    assert.equal(liked.length, 1)
    assert.equal(liked[0].deezerTrackId, '10')
    assert.equal(all.length, 2)
  })

  test('deleteInteraction returns 404 when missing', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('svc_del_missing')

    const result = await service.deleteInteraction(user.id, 'missing')
    assert.containsSubset(result, { status: 404 })
  })

  test('deleteInteraction removes the row', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('svc_del_ok')

    await service.upsertInteraction({
      userId: user.id,
      deezerTrackId: '99',
      action: InteractionAction.Liked,
    })

    const result = await service.deleteInteraction(user.id, '99')
    assert.notProperty(result, 'error')

    const exists = await UserTrackInteraction.query()
      .where('userId', user.id)
      .where('deezerTrackId', '99')
      .first()
    assert.isNull(exists)
  })

  test('upsertInteraction maps Postgres 22001 (string too long) to 400', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('svc_22001')

    const originalUpdateOrCreate = UserTrackInteraction.updateOrCreate
    UserTrackInteraction.updateOrCreate = (async () => {
      const error: any = new Error('value too long for type character varying')
      error.code = '22001'
      throw error
    }) as typeof UserTrackInteraction.updateOrCreate

    try {
      const result = await service.upsertInteraction({
        userId: user.id,
        deezerTrackId: '1',
        action: InteractionAction.Liked,
      })

      assert.notInstanceOf(result, UserTrackInteraction)
      if (!(result instanceof UserTrackInteraction)) {
        assert.equal(result.error, 'One or more fields exceed maximum length')
        assert.equal(result.status, 400)
      }
    } finally {
      UserTrackInteraction.updateOrCreate = originalUpdateOrCreate
    }
  })

  test('upsertInteraction rethrows unknown database errors', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('svc_rethrow')

    const originalUpdateOrCreate = UserTrackInteraction.updateOrCreate
    UserTrackInteraction.updateOrCreate = (async () => {
      const error: any = new Error('unexpected db failure')
      error.code = '42P01'
      throw error
    }) as typeof UserTrackInteraction.updateOrCreate

    try {
      await service.upsertInteraction({
        userId: user.id,
        deezerTrackId: '1',
        action: InteractionAction.Liked,
      })
      assert.fail('Should have thrown')
    } catch (error: any) {
      assert.equal(error.message, 'unexpected db failure')
    } finally {
      UserTrackInteraction.updateOrCreate = originalUpdateOrCreate
    }
  })

  test('deleteInteraction handles array-shaped delete count (driver quirk)', async ({ assert }) => {
    const originalQuery = UserTrackInteraction.query
    UserTrackInteraction.query = (() =>
      ({
        where() {
          return this
        },
        async delete() {
          return [1] as unknown as number
        },
      }) as any) as typeof UserTrackInteraction.query

    try {
      const result = await service.deleteInteraction('user-id', '42')
      assert.notProperty(result, 'error')
    } finally {
      UserTrackInteraction.query = originalQuery
    }
  })

  test('deleteInteraction returns 404 when array-shaped delete count is empty', async ({
    assert,
  }) => {
    const originalQuery = UserTrackInteraction.query
    UserTrackInteraction.query = (() =>
      ({
        where() {
          return this
        },
        async delete() {
          return [] as unknown as number
        },
      }) as any) as typeof UserTrackInteraction.query

    try {
      const result = await service.deleteInteraction('user-id', '42')
      assert.containsSubset(result, { status: 404 })
    } finally {
      UserTrackInteraction.query = originalQuery
    }
  })

  test('deleteInteraction handles number-shaped delete count (driver quirk)', async ({
    assert,
  }) => {
    const originalQuery = UserTrackInteraction.query
    UserTrackInteraction.query = (() =>
      ({
        where() {
          return this
        },
        async delete() {
          return 1
        },
      }) as any) as typeof UserTrackInteraction.query

    try {
      const result = await service.deleteInteraction('user-id', '42')
      assert.notProperty(result, 'error')
    } finally {
      UserTrackInteraction.query = originalQuery
    }
  })
})
