import { test } from '@japa/runner'
import OnAuthSessionCreated from '#listeners/on_auth_session_created'
import AuthSessionCreated from '#events/auth_session_created'
import Achievement from '#models/achievement'
import UserAchievement from '#models/user_achievement'
import { AchievementType } from '#enums/achievement_type'
import { DateTime } from 'luxon'
import { createAuthenticatedUser } from '#tests/utils/auth_helpers'
import { deleteAchievementProgress } from '#tests/utils/achievement_progress_helpers'

test.group('OnAuthSessionCreated listener', (group) => {
  deleteAchievementProgress(group)

  test('first login after >30 days inactivity unlocks Comeback', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('oas_comeback')
    await Achievement.create({
      type: AchievementType.Comeback,
      name: 'Le Retour',
      description: 'd',
    })

    const listener = new OnAuthSessionCreated()
    await listener.handle(
      new AuthSessionCreated({
        userId: user.id,
        lastLoginAt: DateTime.now().minus({ days: 31 }),
        isFirstLogin: false,
      })
    )

    const comeback = await UserAchievement.query()
      .where('user_id', user.id)
      .whereHas('achievement', (q) => q.where('type', AchievementType.Comeback))
      .first()
    assert.isNotNull(comeback?.unlockedAt ?? null)
  })

  test('login under 30 days does not unlock Comeback', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('oas_recent')
    await Achievement.create({
      type: AchievementType.Comeback,
      name: 'Le Retour',
      description: 'd',
    })

    const listener = new OnAuthSessionCreated()
    await listener.handle(
      new AuthSessionCreated({
        userId: user.id,
        lastLoginAt: DateTime.now().minus({ days: 5 }),
        isFirstLogin: false,
      })
    )

    const comeback = await UserAchievement.query()
      .where('user_id', user.id)
      .whereHas('achievement', (q) => q.where('type', AchievementType.Comeback))
      .first()
    assert.isNull(comeback ?? null)
  })

  test('first login on launch day unlocks LaunchDaySignup', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('oas_launch')
    user.createdAt = DateTime.fromISO('2026-05-20T12:00:00')
    await user.save()

    await Achievement.create({
      type: AchievementType.LaunchDaySignup,
      name: 'Fan du premier jour',
      description: 'd',
    })

    const listener = new OnAuthSessionCreated()
    await listener.handle(
      new AuthSessionCreated({
        userId: user.id,
        lastLoginAt: null,
        isFirstLogin: true,
      })
    )

    const launchDay = await UserAchievement.query()
      .where('user_id', user.id)
      .whereHas('achievement', (q) => q.where('type', AchievementType.LaunchDaySignup))
      .first()
    assert.isNotNull(launchDay?.unlockedAt ?? null)
  })

  test('first login on a different day does not unlock LaunchDaySignup', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('oas_other')
    user.createdAt = DateTime.fromISO('2026-06-01T12:00:00')
    await user.save()

    await Achievement.create({
      type: AchievementType.LaunchDaySignup,
      name: 'Fan du premier jour',
      description: 'd',
    })

    const listener = new OnAuthSessionCreated()
    await listener.handle(
      new AuthSessionCreated({
        userId: user.id,
        lastLoginAt: null,
        isFirstLogin: true,
      })
    )

    const launchDay = await UserAchievement.query()
      .where('user_id', user.id)
      .whereHas('achievement', (q) => q.where('type', AchievementType.LaunchDaySignup))
      .first()
    assert.isNull(launchDay ?? null)
  })

  test('null lastLoginAt and isFirstLogin=false does nothing', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('oas_noop')
    await Achievement.createMany([
      { type: AchievementType.Comeback, name: 'Le Retour', description: 'd' },
      { type: AchievementType.LaunchDaySignup, name: 'Fan', description: 'd' },
    ])

    const listener = new OnAuthSessionCreated()
    await listener.handle(
      new AuthSessionCreated({
        userId: user.id,
        lastLoginAt: null,
        isFirstLogin: false,
      })
    )

    const rows = await UserAchievement.query().where('user_id', user.id)
    assert.lengthOf(rows, 0)
  })

  test('isFirstLogin=true with missing user record is a no-op', async ({ assert }) => {
    await Achievement.create({
      type: AchievementType.LaunchDaySignup,
      name: 'Fan du premier jour',
      description: 'd',
    })

    const listener = new OnAuthSessionCreated()
    await listener.handle(
      new AuthSessionCreated({
        userId: 'non-existent-user-id',
        lastLoginAt: null,
        isFirstLogin: true,
      })
    )

    const rows = await UserAchievement.query().where('user_id', 'non-existent-user-id')
    assert.lengthOf(rows, 0)
  })
})
