import type { OrchestrationDb } from '../orchestration-db'
import { workerSentMail } from './dispatch-mail-sender'
import { exposeUtcTimestamp } from '../utc-timestamp'

const text = (value: unknown) => (typeof value === 'string' ? value : null)
const suffix = (column: string) => `substr(${column}, instr(${column}, ':') + 1)`

/** Identity branches use historical indexes; the existing classifier decides exact membership. */
export function coordinatorMailContribution(message: string, dispatch: string): string {
  return `(${message}.read = 1 AND NOT EXISTS (
    SELECT 1 FROM dispatch_contexts worker JOIN dispatch_contexts own ON own.id = ${dispatch}
    WHERE worker.run_id = own.run_id AND worker.id IS NOT own.creator_dispatch_id
      AND worker.assignee_handle IS NOT NULL
      AND worker.rowid IN (
        SELECT rowid FROM dispatch_contexts WHERE id = substr(${message}.from_handle, 10)
        UNION SELECT rowid FROM dispatch_contexts WHERE assignee_handle = ${message}.from_handle
        UNION SELECT rowid FROM dispatch_contexts
          WHERE ${suffix('assignee_pane_key')} = ${suffix(`${message}.sender_pane_key`)}
      ) AND orca_mail_worker_matches(worker.id, worker.assignee_handle, worker.assignee_pane_key,
        worker.created_at, worker.completed_at, ${message}.from_handle,
        ${message}.sender_pane_key, ${message}.created_at) = 1
  ))`
}

function adjust(message: 'OLD' | 'NEW', sign: '-' | '+'): string {
  return `UPDATE orca_coordinator_mail_counts
    SET mail_count = mail_count ${sign} ${coordinatorMailContribution(message, 'dispatch_id')}
    WHERE dispatch_id = substr(${message}.to_handle, 10) AND ${message}.to_handle GLOB 'dispatch:*' AND ${message}.read = 1
      AND (ready = 1 OR ${message}.sequence <= cursor);`
}

function invalidate(worker: 'OLD' | 'NEW'): string {
  return `UPDATE orca_coordinator_mail_counts
    SET mail_count = 0, cursor = 0, ready = 0, revision = revision + 1
    WHERE dispatch_id = ${worker}.id OR dispatch_id IN (
      SELECT substr(to_handle, 10) FROM messages WHERE read = 1 AND from_handle IN (
        ${worker}.assignee_handle, 'dispatch:' || ${worker}.id)
      UNION SELECT substr(to_handle, 10) FROM messages WHERE read = 1
        AND ${suffix('sender_pane_key')} = ${suffix(`${worker}.assignee_pane_key`)}
    );`
}

export function installCoordinatorMailCountTriggers(db: OrchestrationDb): void {
  db.db.function(
    'orca_mail_worker_matches',
    (id, handle, pane, created, completed, from, senderPane, sent) => {
      const workerId = text(id)
      const workerHandle = text(handle)
      return workerId &&
        workerHandle &&
        workerSentMail(
          {
            id: workerId,
            assignee_handle: workerHandle,
            assignee_pane_key: text(pane),
            createdAt: Date.parse(exposeUtcTimestamp(text(created)) ?? ''),
            completedAt: Date.parse(text(completed) ?? '')
          },
          { from_handle: from, sender_pane_key: senderPane, created_at: sent }
        )
        ? 1
        : 0
    }
  )
  db.db.exec(`
    CREATE TEMP TABLE orca_coordinator_mail_counts (
      dispatch_id TEXT PRIMARY KEY, mail_count INTEGER NOT NULL DEFAULT 0,
      cursor INTEGER NOT NULL DEFAULT 0, ready INTEGER NOT NULL DEFAULT 0,
      revision INTEGER NOT NULL DEFAULT 0
    );
    CREATE TEMP TRIGGER orca_mail_count_insert AFTER INSERT ON main.messages BEGIN ${adjust('NEW', '+')} END;
    CREATE TEMP TRIGGER orca_mail_count_delete BEFORE DELETE ON main.messages BEGIN ${adjust('OLD', '-')} END;
    CREATE TEMP TRIGGER orca_mail_count_update AFTER UPDATE OF read, to_handle, from_handle, sender_pane_key, created_at ON main.messages
    BEGIN ${adjust('OLD', '-')} ${adjust('NEW', '+')} END;
    CREATE TEMP TRIGGER orca_mail_count_worker_insert AFTER INSERT ON main.dispatch_contexts BEGIN ${invalidate('NEW')} END;
    CREATE TEMP TRIGGER orca_mail_count_worker_delete BEFORE DELETE ON main.dispatch_contexts
    BEGIN ${invalidate('OLD')} DELETE FROM orca_coordinator_mail_counts WHERE dispatch_id = OLD.id; END;
    CREATE TEMP TRIGGER orca_mail_count_worker_update AFTER UPDATE OF
      run_id, creator_dispatch_id, assignee_handle, assignee_pane_key, created_at, completed_at ON main.dispatch_contexts
    BEGIN ${invalidate('OLD')} ${invalidate('NEW')}
      DELETE FROM orca_coordinator_mail_counts WHERE dispatch_id = NEW.id AND NEW.status NOT IN ('pending', 'dispatched');
    END;
    CREATE TEMP TRIGGER orca_mail_count_worker_settled AFTER UPDATE OF status ON main.dispatch_contexts
    BEGIN DELETE FROM orca_coordinator_mail_counts WHERE dispatch_id = NEW.id AND NEW.status NOT IN ('pending', 'dispatched'); END;
  `)
}
