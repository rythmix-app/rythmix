import { test } from '@japa/runner'
import LickedTrack from '#models/licked_track'
import { LickedTrackService } from '#services/licked_track_service'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'

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

test.group('LickedTrackService - Unit CRUD', (group) => {
  let service: LickedTrackService

  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    service = new LickedTrackService()
    await testUtils.db().truncate()
  })

  test('createLickedTrack should create a record successfully', async ({ assert }) => {
    const user = await createTestUser('create')
    const created = await service.createLickedTrack({
      userId: user.id,
      spotifyId: 'sp_1',
      title: 'Song',
      artist: 'Artist',
      type: 'like',
    })
    assert.instanceOf(created, LickedTrack)
    if (created instanceof LickedTrack) {
      assert.equal(created.userId, user.id)
    }
  })

  test('createLickedTrack maps 23505 -> 409', async ({ assert }) => {
    const user = await createTestUser('dup')
    const originalCreate = (LickedTrack as any).create
    ;(LickedTrack as any).create = async () => {
      const err: any = new Error('duplicate')
      err.code = '23505'
      throw err
    }
    const result = await service.createLickedTrack({ userId: user.id, spotifyId: 'dup' })
    assert.notInstanceOf(result, LickedTrack)
    if (isServiceError(result)) assert.equal(result.status, 409)
    ;(LickedTrack as any).create = originalCreate
  })

  test('createLickedTrack maps 22001 -> 400', async ({ assert }) => {
    const user = await createTestUser('too_long')
    const originalCreate = (LickedTrack as any).create
    ;(LickedTrack as any).create = async () => {
      const err: any = new Error('value too long')
      err.code = '22001'
      throw err
    }
    const result = await service.createLickedTrack({ userId: user.id, spotifyId: 'x' })
    assert.notInstanceOf(result, LickedTrack)
    if (isServiceError(result)) assert.equal(result.status, 400)
    ;(LickedTrack as any).create = originalCreate
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

  test('updateLickedTrack updates successfully', async ({ assert }) => {
    const user = await createTestUser('update')
    const rec = await user.related('likedTracks').create({ spotifyId: 'spA', title: 'A' })
    const updated = await service.updateLickedTrack(rec.id, { title: 'A2' })
    assert.instanceOf(updated, LickedTrack)
    if (updated instanceof LickedTrack) assert.equal(updated.title, 'A2')
  })

  test('updateLickedTrack returns 404 when not found', async ({ assert }) => {
    const result = await service.updateLickedTrack(999_999, { title: 'X' } as any)
    assert.notInstanceOf(result, LickedTrack)
    if (isServiceError(result)) {
      assert.equal(result.status, 404)
      assert.match(result.error, /not found/i)
    }
  })

  test('updateLickedTrack maps 23505 -> 409', async ({ assert }) => {
    const user = await createTestUser('conflict')
    const rec = await user.related('likedTracks').create({ spotifyId: 'spB' })
    const originalQuery = (LickedTrack as any).query
    ;(LickedTrack as any).query = () => ({
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
    const result = await service.updateLickedTrack(rec.id, { spotifyId: 'dup' } as any)
    assert.notInstanceOf(result, LickedTrack)
    if (isServiceError(result)) assert.equal(result.status, 409)
    ;(LickedTrack as any).query = originalQuery
  })

  test('updateLickedTrack maps 22001 -> 400', async ({ assert }) => {
    const user = await createTestUser('too_long_upd')
    const rec = await user.related('likedTracks').create({ spotifyId: 'spC' })
    const originalQuery = (LickedTrack as any).query
    ;(LickedTrack as any).query = () => ({
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
    const result = await service.updateLickedTrack(rec.id, { title: 'Y' } as any)
    assert.notInstanceOf(result, LickedTrack)
    if (isServiceError(result)) assert.equal(result.status, 400)
    ;(LickedTrack as any).query = originalQuery
  })

  test('deleteLickedTrack deletes successfully', async ({ assert }) => {
    const user = await createTestUser('delete')
    const rec = await user.related('likedTracks').create({ spotifyId: 'spDel' })
    const res = await service.deleteLickedTrack(rec.id)
    if (isServiceError(res)) {
      assert.fail(`Expected success, got ${res.status}`)
    } else {
      assert.equal(res.message, `LickedTrack with ID: ${rec.id} deleted successfully`)
    }
  })

  test('deleteLickedTrack returns 404 when not found', async ({ assert }) => {
    const res = await service.deleteLickedTrack(888_888)
    assert.notInstanceOf(res as any, LickedTrack)
    if (isServiceError(res)) {
      assert.equal(res.status, 404)
      assert.match(res.error, /not found/i)
    }
  })

  test('createLickedTrack rethrows on unknown DB error', async ({ assert }) => {
    const user = await createTestUser('unknown_create')
    const originalCreate = (LickedTrack as any).create

    ;(LickedTrack as any).create = async () => {
      const err: any = new Error('weird db failure')
      err.code = '99999' // code non géré -> doit être relancé par le service
      throw err
    }

    try {
      await service.createLickedTrack({ userId: user.id, spotifyId: 'oops' })
      assert.fail('Expected service.createLickedTrack to throw, but it resolved')
    } catch (e: any) {
      assert.instanceOf(e, Error)
      assert.match(String(e.message), /weird db failure/i)
    } finally {
      ;(LickedTrack as any).create = originalCreate
    }
  })

  test('updateLickedTrack rethrows on unknown DB error', async ({ assert }) => {
    const user = await createTestUser('unknown_update')
    const rec = await user.related('likedTracks').create({ spotifyId: 'spU' })

    const originalQuery = (LickedTrack as any).query
    ;(LickedTrack as any).query = () => ({
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
      await service.updateLickedTrack(rec.id, { title: 'X' } as any)
      assert.fail('Expected service.updateLickedTrack to throw, but it resolved')
    } catch (e: any) {
      assert.instanceOf(e, Error)
      assert.match(String(e.message), /unknown update error/i)
    } finally {
      ;(LickedTrack as any).query = originalQuery
    }
  })
})
