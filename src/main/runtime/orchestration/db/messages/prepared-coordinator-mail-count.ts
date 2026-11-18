import { setImmediate } from 'node:timers/promises'
import type { OrchestrationDb } from '../orchestration-db'
import {
  coordinatorMailContribution,
  installCoordinatorMailCountTriggers
} from './coordinator-mail-count-triggers'

type CountRow = { mail_count: number; cursor: number; ready: number; revision: number }
type Owner = { jobs: Map<string, Promise<void>>; dataVersion: unknown }
const owners = new WeakMap<OrchestrationDb, Owner>()
const PAGE_SIZE = 128

function row(db: OrchestrationDb, dispatchId: string): CountRow | undefined {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the connection-local table has this exact projection.
  return db.db
    .prepare(
      'SELECT mail_count, cursor, ready, revision FROM orca_coordinator_mail_counts WHERE dispatch_id = ?'
    )
    .get(dispatchId) as CountRow | undefined
}

function refreshExternalWrites(db: OrchestrationDb, owner: Owner): void {
  const version = db.db.pragma('data_version', { simple: true })
  if (version !== owner.dataVersion) {
    db.db.exec(
      'UPDATE orca_coordinator_mail_counts SET mail_count = 0, cursor = 0, ready = 0, revision = revision + 1'
    )
    owner.dataVersion = version
  }
}

export function preparedCoordinatorMailCount(
  db: OrchestrationDb,
  dispatchId: string
): number | undefined {
  const owner = owners.get(db)
  if (!owner) {
    return undefined
  }
  refreshExternalWrites(db, owner)
  const count = row(db, dispatchId)
  return count?.ready ? count.mail_count : undefined
}

/** Cold reconstruction yields between keyset pages; TEMP triggers maintain exact committed deltas. */
export async function prepareCoordinatorMailCount(
  db: OrchestrationDb,
  dispatchId: string,
  current: () => boolean
): Promise<number | undefined> {
  let owner = owners.get(db)
  if (!owner) {
    installCoordinatorMailCountTriggers(db)
    owner = { jobs: new Map(), dataVersion: db.db.pragma('data_version', { simple: true }) }
    owners.set(db, owner)
  }
  const countOwner = owner
  refreshExternalWrites(db, countOwner)
  db.db
    .prepare('INSERT OR IGNORE INTO orca_coordinator_mail_counts(dispatch_id) VALUES (?)')
    .run(dispatchId)
  while (current()) {
    const prepared = preparedCoordinatorMailCount(db, dispatchId)
    if (prepared !== undefined) {
      return prepared
    }
    let job = countOwner.jobs.get(dispatchId)
    if (!job) {
      job = recover(db, dispatchId, current).finally(() => countOwner.jobs.delete(dispatchId))
      countOwner.jobs.set(dispatchId, job)
    }
    await job
    if (!row(db, dispatchId)) {
      return undefined
    }
  }
  return undefined
}

async function recover(
  db: OrchestrationDb,
  dispatchId: string,
  current: () => boolean
): Promise<void> {
  while (current()) {
    await setImmediate()
    const before = row(db, dispatchId)
    if (!before || before.ready) {
      return
    }
    const page = db.db
      .prepare(`SELECT m.sequence,
      ${coordinatorMailContribution('m', '?')} AS counted FROM messages m
      WHERE m.to_handle = ? AND m.read = 1 AND m.sequence > ? ORDER BY m.sequence LIMIT ?`)
      .all(dispatchId, `dispatch:${dispatchId}`, before.cursor, PAGE_SIZE)
    const last = page.at(-1)?.sequence
    const count = page.reduce((sum, item) => sum + Number(item.counted), 0)
    db.db
      .prepare(`UPDATE orca_coordinator_mail_counts SET mail_count = mail_count + ?, cursor = ?, ready = ?
      WHERE dispatch_id = ? AND revision = ?`)
      .run(
        count,
        typeof last === 'number' ? last : before.cursor,
        page.length < PAGE_SIZE ? 1 : 0,
        dispatchId,
        before.revision
      )
  }
}
