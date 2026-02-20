import { test } from '@japa/runner'
import LikedTrack from '#models/liked_track'
import { LikedTrackService } from '#services/liked_track_service'
import User from '#models/user'
import { deleteLikedTrack } from '#tests/utils/liked_track_helpers'

type ServiceError = { error: string; status: number }
const isServiceError = (v: any): v is ServiceError =>
  v && typeof v === 'object' && 'status' in v && 'error' in v

async function createTestUser(tag: string) {
  return await User.create({
    username: `test_${tag}_${Date.now()}`,
    email: `test_${tag}_${Date.now()}@example.com`,
    password: 'password123',
  })
}

test.group('LikedTrackService - Unit CRUD', (group) => {
  let service: LikedTrackService

  deleteLikedTrack(group)

  group.each.setup(async () => {
    service = new LikedTrackService()
  })

  test('createLikedTrack should create a record successfully', async ({ assert }) => {
    const user = await createTestUser('create')
    const created = await service.createLikedTrack({
      userId: user.id,
      spotifyId: 'sp_1',
      title: 'Song',
      artist: 'Artist',
      type: 'like',
    })
    assert.instanceOf(created, LikedTrack)
    if (created instanceof LikedTrack) {
      assert.equal(created.userId, user.id)
    }
  })

  test('createLikedTrack maps 23505 -> 409', async ({ assert }) => {
    const user = await createTestUser('dup')
    const originalCreate = (LikedTrack as any).create
    ;(LikedTrack as any).create = async () => {
      const err: any = new Error('duplicate')
      err.code = '23505'
      throw err
    }
    const result = await service.createLikedTrack({ userId: user.id, spotifyId: 'dup' })
    assert.notInstanceOf(result, LikedTrack)
    if (isServiceError(result)) assert.equal(result.status, 409)
    ;(LikedTrack as any).create = originalCreate
  })

  test('createLikedTrack maps 22001 -> 400', async ({ assert }) => {
    const user = await createTestUser('too_long')
    const originalCreate = (LikedTrack as any).create
    ;(LikedTrack as any).create = async () => {
      const err: any = new Error('value too long')
      err.code = '22001'
      throw err
    }
    const result = await service.createLikedTrack({ userId: user.id, spotifyId: 'x' })
    assert.notInstanceOf(result, LikedTrack)
    if (isServiceError(result)) assert.equal(result.status, 400)
    ;(LikedTrack as any).create = originalCreate
  })

  test('getAll increases after insertion', async ({ assert }) => {
    // Mesure l’état initial (peut être > 0 si autre test a déjà inséré)
    const before = await service.getAll()
    const len0 = before.length

    const user = await createTestUser('list')
    await user.related('likedTracks').create({ spotifyId: 's1' })

    const after = await service.getAll()
    const len1 = after.length

    assert.isArray(before)
    assert.isArray(after)
    assert.isAbove(len1, len0) // Vérifie l'augmentation, pas la valeur exacte
  })

  test('getById returns model when exists, null otherwise', async ({ assert }) => {
    const user = await createTestUser('getbyid')
    const rec = await user.related('likedTracks').create({ spotifyId: 'spX' })
    const found = await service.getById(rec.id)
    assert.isNotNull(found)
    assert.equal(found?.id, rec.id)
    const notFound = await service.getById(999_999)
    assert.isNull(notFound)
  })

  test('updateLikedTrack updates successfully', async ({ assert }) => {
    const user = await createTestUser('update')
    const rec = await user.related('likedTracks').create({ spotifyId: 'spA', title: 'A' })
    const updated = await service.updateLikedTrack(rec.id, { title: 'A2' })
    assert.instanceOf(updated, LikedTrack)
    if (updated instanceof LikedTrack) assert.equal(updated.title, 'A2')
  })

  test('updateLikedTrack returns 404 when not found', async ({ assert }) => {
    const result = await service.updateLikedTrack(999_999, { title: 'X' } as any)
    assert.notInstanceOf(result, LikedTrack)
    if (isServiceError(result)) {
      assert.equal(result.status, 404)
      assert.match(result.error, /not found/i)
    }
  })

  test('updateLikedTrack maps 23505 -> 409', async ({ assert }) => {
    const user = await createTestUser('conflict')
    const rec = await user.related('likedTracks').create({ spotifyId: 'spB' })
    const originalQuery = (LikedTrack as any).query
    ;(LikedTrack as any).query = () => ({
      where: () => ({
        first: async () => {
          ;(rec as any).save = async () => {
            const err: any = new Error('duplicate')
            err.code = '23505'
            throw err
          }
          return rec
        },
      }),
    })
    const result = await service.updateLikedTrack(rec.id, { spotifyId: 'dup' } as any)
    assert.notInstanceOf(result, LikedTrack)
    if (isServiceError(result)) assert.equal(result.status, 409)
    ;(LikedTrack as any).query = originalQuery
  })

  test('updateLikedTrack maps 22001 -> 400', async ({ assert }) => {
    const user = await createTestUser('too_long_upd')
    const rec = await user.related('likedTracks').create({ spotifyId: 'spC' })
    const originalQuery = (LikedTrack as any).query
    ;(LikedTrack as any).query = () => ({
      where: () => ({
        first: async () => {
          ;(rec as any).save = async () => {
            const err: any = new Error('value too long')
            err.code = '22001'
            throw err
          }
          return rec
        },
      }),
    })
    const result = await service.updateLikedTrack(rec.id, { title: 'Y' } as any)
    assert.notInstanceOf(result, LikedTrack)
    if (isServiceError(result)) assert.equal(result.status, 400)
    ;(LikedTrack as any).query = originalQuery
  })

  test('deleteLikedTrack deletes successfully', async ({ assert }) => {
    const user = await createTestUser('delete')
    const rec = await user.related('likedTracks').create({ spotifyId: 'spDel' })
    const res = await service.deleteLikedTrack(rec.id)
    if (isServiceError(res)) {
      assert.fail(`Expected success, got ${res.status}`)
    } else {
      assert.equal(res.message, `LikedTrack with ID: ${rec.id} deleted successfully`)
    }
  })

  test('deleteLikedTrack returns 404 when not found', async ({ assert }) => {
    const res = await service.deleteLikedTrack(888_888)
    assert.notInstanceOf(res as any, LikedTrack)
    if (isServiceError(res)) {
      assert.equal(res.status, 404)
      assert.match(res.error, /not found/i)
    }
  })

  test('createLikedTrack rethrows on unknown DB error', async ({ assert }) => {
    const user = await createTestUser('unknown_create')
    const originalCreate = (LikedTrack as any).create

    ;(LikedTrack as any).create = async () => {
      const err: any = new Error('weird db failure')
      err.code = '99999' // code non géré -> doit être relancé par le service
      throw err
    }

    try {
      await service.createLikedTrack({ userId: user.id, spotifyId: 'oops' })
      assert.fail('Expected service.createLikedTrack to throw, but it resolved')
    } catch (e: any) {
      assert.instanceOf(e, Error)
      assert.match(String(e.message), /weird db failure/i)
    } finally {
      ;(LikedTrack as any).create = originalCreate
    }
  })

  test('updateLikedTrack rethrows on unknown DB error', async ({ assert }) => {
    const user = await createTestUser('unknown_update')
    const rec = await user.related('likedTracks').create({ spotifyId: 'spU' })

    const originalQuery = (LikedTrack as any).query
    ;(LikedTrack as any).query = () => ({
      where: () => ({
        first: async () => {
          ;(rec as any).save = async () => {
            const err: any = new Error('unknown update error')
            err.code = '99999' // code non géré -> doit être relancé
            throw err
          }
          return rec
        },
      }),
    })

    try {
      await service.updateLikedTrack(rec.id, { title: 'X' } as any)
      assert.fail('Expected service.updateLikedTrack to throw, but it resolved')
    } catch (e: any) {
      assert.instanceOf(e, Error)
      assert.match(String(e.message), /unknown update error/i)
    } finally {
      ;(LikedTrack as any).query = originalQuery
    }
  })
})
