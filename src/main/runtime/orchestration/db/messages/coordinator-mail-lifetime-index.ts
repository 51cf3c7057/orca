import { parsePaneKey } from '../../../../../shared/workspace-layout/stable-pane-id'
import type { OrchestrationDb } from '../orchestration-db'
import { exposeUtcTimestamp } from '../utc-timestamp'

const MIN_DATE = -8640000000000000n
const MAX_DATE = 8640000000000000n
const text = (value: unknown) => (typeof value === 'string' ? value : null)
const timestamp = (value: unknown) => Date.parse(exposeUtcTimestamp(text(value)) ?? '')

function paneIdentity(value: unknown): string | null {
  const pane = text(value)
  if (!pane) {
    return null
  }
  const leaf = parsePaneKey(pane)?.leafId
  return leaf ? `leaf:${leaf}` : `raw:${pane}`
}

function intervalNode(start: number, end: number): string {
  let lo = MIN_DATE
  let hi = MAX_DATE
  let node = 'r'
  while (true) {
    const mid = (lo + hi) / 2n
    if (BigInt(end) < mid) {
      hi = mid - 1n
      node += 'l'
    } else if (BigInt(start) > mid) {
      lo = mid + 1n
      node += 'r'
    } else {
      return node
    }
  }
}

function pointNodes(value: unknown, left: unknown): string {
  const at = timestamp(value)
  if (!Number.isFinite(at)) {
    return '[]'
  }
  const point = BigInt(at)
  let lo = MIN_DATE
  let hi = MAX_DATE
  let node = 'r'
  const nodes: string[] = []
  while (lo <= hi) {
    const mid = (lo + hi) / 2n
    if (point <= mid === Boolean(left)) {
      nodes.push(node)
    }
    if (point === mid) {
      break
    }
    if (point < mid) {
      hi = mid - 1n
      node += 'l'
    } else {
      lo = mid + 1n
      node += 'r'
    }
  }
  return JSON.stringify(nodes)
}

const project = (source: string) => `INSERT OR REPLACE INTO orca_mail_worker_lifetimes
  (run_id, worker_id, kind, identity, node, start_ms, end_ms)
  SELECT ${source}.run_id, ${source}.id, json_extract(cell.value, '$.kind'),
    json_extract(cell.value, '$.identity'), json_extract(cell.value, '$.node'),
    json_extract(cell.value, '$.start'), json_extract(cell.value, '$.end')
  FROM orca_mail_lifetime_runs run CROSS JOIN json_each(orca_mail_worker_cells(${source}.id, ${source}.assignee_handle,
    ${source}.assignee_pane_key, ${source}.created_at, ${source}.completed_at)) cell
  WHERE run.run_id = ${source}.run_id;`

export function installMailWorkerLifetimes(db: OrchestrationDb): void {
  db.db.function('orca_mail_pane_identity', paneIdentity)
  db.db.function('orca_mail_point_nodes', pointNodes)
  db.db.function('orca_mail_worker_cells', (id, handle, pane, created, completed) => {
    const start = timestamp(created)
    const parsedEnd = Date.parse(text(completed) ?? '')
    const end = Number.isNaN(parsedEnd) ? Number(MAX_DATE) : parsedEnd
    if (!text(id) || !text(handle) || !Number.isFinite(start) || end < start) {
      return '[]'
    }
    const identity = paneIdentity(pane)
    const keys = [
      { kind: 'bare', identity: handle },
      identity ? { kind: 'pane', identity } : { kind: 'withoutPane', identity: handle }
    ]
    const node = intervalNode(start, end)
    return JSON.stringify(keys.map((key) => ({ ...key, node, start, end })))
  })
  db.db.exec(`
    CREATE TEMP TABLE orca_mail_lifetime_runs (run_id TEXT PRIMARY KEY, cursor INTEGER NOT NULL DEFAULT 0, ready INTEGER NOT NULL DEFAULT 0);
    CREATE TEMP TABLE orca_mail_worker_lifetimes (
      run_id TEXT NOT NULL, worker_id TEXT NOT NULL, kind TEXT NOT NULL, identity TEXT NOT NULL,
      node TEXT NOT NULL, start_ms INTEGER NOT NULL, end_ms INTEGER NOT NULL,
      PRIMARY KEY(run_id, worker_id, kind)
    ) WITHOUT ROWID;
    CREATE INDEX orca_mail_lifetime_start ON orca_mail_worker_lifetimes(run_id, kind, identity, node, start_ms, worker_id);
    CREATE INDEX orca_mail_lifetime_end ON orca_mail_worker_lifetimes(run_id, kind, identity, node, end_ms, worker_id);
    CREATE TEMP TRIGGER orca_mail_lifetime_retired AFTER DELETE ON orca_mail_lifetime_runs
      BEGIN DELETE FROM orca_mail_worker_lifetimes WHERE run_id = OLD.run_id; END;
    CREATE TEMP TRIGGER orca_mail_lifetime_insert AFTER INSERT ON main.dispatch_contexts BEGIN ${project('NEW')} END;
    CREATE TEMP TRIGGER orca_mail_lifetime_delete BEFORE DELETE ON main.dispatch_contexts
      BEGIN DELETE FROM orca_mail_worker_lifetimes WHERE run_id = OLD.run_id AND worker_id = OLD.id; END;
    CREATE TEMP TRIGGER orca_mail_lifetime_update AFTER UPDATE OF run_id, assignee_handle, assignee_pane_key, created_at, completed_at ON main.dispatch_contexts
      WHEN OLD.run_id IS NOT NEW.run_id OR OLD.assignee_handle IS NOT NEW.assignee_handle
        OR OLD.assignee_pane_key IS NOT NEW.assignee_pane_key OR OLD.created_at IS NOT NEW.created_at OR OLD.completed_at IS NOT NEW.completed_at
      BEGIN DELETE FROM orca_mail_worker_lifetimes WHERE run_id = OLD.run_id AND worker_id = OLD.id; ${project('NEW')} END;
  `)
}

/** Each interval lives at its first contained midpoint; one endpoint seek per ancestor proves membership. */
export function mailLifetimeCovers(message: string, kind: string, identity: string): string {
  const side = (left: boolean) => `EXISTS (
    SELECT 1 FROM json_each(orca_mail_point_nodes(${message}.created_at, ${left ? 1 : 0})) point
    CROSS JOIN orca_mail_worker_lifetimes worker INDEXED BY orca_mail_lifetime_${left ? 'start' : 'end'}
    WHERE worker.run_id = own.run_id AND worker.kind = '${kind}' AND worker.identity = ${identity}
      AND worker.node = point.value AND worker.${left ? 'start_ms <=' : 'end_ms >='} orca_mail_timestamp(${message}.created_at)
      AND worker.worker_id IS NOT own.creator_dispatch_id LIMIT 1
  )`
  return `(EXISTS (SELECT 1 FROM orca_mail_worker_lifetimes WHERE run_id = own.run_id AND kind = '${kind}' AND identity = ${identity} LIMIT 1)
    AND (${side(true)} OR ${side(false)}))`
}

/** One synchronous page per call; callers yield and retain progress until the whole Run is indexed. */
export function advanceMailWorkerLifetimes(db: OrchestrationDb, runId: string): boolean {
  db.db.prepare('INSERT OR IGNORE INTO orca_mail_lifetime_runs(run_id) VALUES (?)').run(runId)
  const state = db.db
    .prepare('SELECT cursor, ready FROM orca_mail_lifetime_runs WHERE run_id = ?')
    .get(runId)!
  if (state.ready) {
    return true
  }
  const page = db.db
    .prepare(
      'SELECT rowid AS cursor FROM dispatch_contexts WHERE run_id = ? AND rowid > ? ORDER BY rowid LIMIT 128'
    )
    .all(runId, state.cursor)
  const last = page.at(-1)?.cursor ?? state.cursor
  db.db.exec('SAVEPOINT mail_lifetime_page')
  try {
    db.db
      .prepare(`INSERT OR REPLACE INTO orca_mail_worker_lifetimes(run_id, worker_id, kind, identity, node, start_ms, end_ms)
      SELECT worker.run_id, worker.id, json_extract(cell.value, '$.kind'), json_extract(cell.value, '$.identity'),
        json_extract(cell.value, '$.node'), json_extract(cell.value, '$.start'), json_extract(cell.value, '$.end')
      FROM dispatch_contexts worker CROSS JOIN json_each(orca_mail_worker_cells(worker.id, worker.assignee_handle, worker.assignee_pane_key, worker.created_at, worker.completed_at)) cell
      WHERE worker.run_id = ? AND worker.rowid > ? AND worker.rowid <= ?`)
      .run(runId, state.cursor, last)
    db.db
      .prepare('UPDATE orca_mail_lifetime_runs SET cursor = ?, ready = ? WHERE run_id = ?')
      .run(last, page.length < 128 ? 1 : 0, runId)
    db.db.exec('RELEASE mail_lifetime_page')
  } catch (error) {
    db.db.exec('ROLLBACK TO mail_lifetime_page; RELEASE mail_lifetime_page')
    throw error
  }
  return page.length < 128
}
