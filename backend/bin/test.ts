/*
|--------------------------------------------------------------------------
| Test runner entrypoint
|--------------------------------------------------------------------------
|
| The "test.ts" file is the entrypoint for running tests using Japa.
|
| Either you can run this file directly or use the "test"
| command to run this file and monitor file changes.
|
*/

process.env.NODE_ENV = 'test'

/**
 * Force the test database name before AdonisJS' env loader runs.
 *
 * docker-compose.override.yml mounts backend/.env as env_file, which pre-populates
 * the container's process.env with DB_DATABASE=rythmix. AdonisJS uses dotenv to
 * read .env.test and dotenv NEVER overrides existing process.env values — so the
 * test runner would otherwise connect to (and wipe) the dev database.
 *
 * We only override DB_DATABASE: DB_HOST/PORT/USER/PASSWORD must keep whatever the
 * environment already set (Docker uses host=database, GitHub Actions uses localhost).
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const envTestPath = fileURLToPath(new URL('../.env.test', import.meta.url))
if (existsSync(envTestPath)) {
  for (const line of readFileSync(envTestPath, 'utf-8').split(/\r?\n/)) {
    const match = line.match(/^\s*DB_DATABASE\s*=\s*(.*)$/)
    if (!match) continue
    let value = match[1].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env.DB_DATABASE = value
    break
  }
}

import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'
import { configure, processCLIArgs, run } from '@japa/runner'

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('../', import.meta.url)

/**
 * The importer is used to import files in context of the
 * application.
 */
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env')
    })
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .testRunner()
  .configure(async (app) => {
    const { runnerHooks, ...config } = await import('../tests/bootstrap.js')

    processCLIArgs(process.argv.splice(2))
    configure({
      ...app.rcFile.tests,
      ...config,
      ...{
        setup: runnerHooks.setup,
        teardown: runnerHooks.teardown.concat([() => app.terminate()]),
      },
    })
  })
  .run(() => run())
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })
