import { expect, it, vi } from 'vitest'
import { prepareCoordinatorMailCount } from './prepared-coordinator-mail-count'
import { readCoordinatorMailCount } from './dispatch-read-mail'
import { coordinatorMailContribution } from './coordinator-mail-count-triggers'
import { createRootDispatch } from '../root-dispatch-test-fixture'
import {
  COORDINATOR,
  coordinatorRunAndTask,
  openChat,
  db
} from '../../terminal-authority/structured-sessions/structured-chat-coordinator-mail-rig.test-fixture'

it.each([
  [100, 100],
  [1_000, 100],
  [100, 1_000]
])(
  'bounds %i expired/future reused assignments with %i consumed messages',
  async (assignments, messages) => {
    await openChat(COORDINATOR)
    const { taskId, runId } = await coordinatorRunAndTask()
    const worker = createRootDispatch(db, taskId, 'term_target', 'tab:target')
    const creatorTask = db.createTask({ spec: 'Creator', runId })
    const creator = createRootDispatch(db, creatorTask.id, 'term_parent', 'tab:parent')
    db.db
      .prepare("UPDATE dispatch_contexts SET created_at = '2000-01-01T00:00:00Z' WHERE id = ?")
      .run(creator.id)
    db.db
      .prepare('UPDATE dispatch_contexts SET creator_dispatch_id = ? WHERE id = ?')
      .run(creator.id, worker.id)
    for (let i = 0; i < assignments; i++) {
      for (const [start, end] of [
        ['2000-01-01T00:00:00Z', '2001-01-01T00:00:00Z'],
        ['2090-01-01T00:00:00Z', '2091-01-01T00:00:00Z']
      ]) {
        const task = db.createTask({ spec: 'Historical assignment', runId })
        const old = createRootDispatch(db, task.id, `term_history_${i}`, `tab:history${i}`)
        db.db
          .prepare(
            "UPDATE dispatch_contexts SET assignee_handle = 'term_parent', assignee_pane_key = 'tab:parent', created_at = ?, completed_at = ?, status = 'completed' WHERE id = ?"
          )
          .run(start, end, old.id)
      }
    }
    for (let i = 0; i < messages; i++) {
      const mail = db.insertMessage({
        from: 'term_parent',
        senderPaneKey: 'tab:parent',
        to: `dispatch:${worker.id}`,
        subject: 'Follow-up',
        runId
      })
      db.markAsRead([mail.id])
    }
    let classifierCalls = 0
    const register = db.db.function.bind(db.db)
    vi.spyOn(db.db, 'function').mockImplementation((name, callback) => {
      if (name !== 'orca_mail_worker_matches') {
        return register(name, callback)
      }
      register(name, (id, handle, pane, created, completed, from, senderPane, sent) => {
        classifierCalls++
        return callback(id, handle, pane, created, completed, from, senderPane, sent)
      })
    })
    expect(await prepareCoordinatorMailCount(db, worker.id, () => true)).toBe(messages)
    expect(classifierCalls).toBe(0)
    const next = db.insertMessage({
      from: 'term_parent',
      senderPaneKey: 'tab:parent',
      to: `dispatch:${worker.id}`,
      subject: 'Next round',
      runId
    })
    db.markAsRead([next.id])
    expect(readCoordinatorMailCount(db, worker.id)).toBe(messages + 1)
    expect(classifierCalls).toBe(0)
    // Every returned temporal candidate already covers the point; only the single creator can be skipped.
    const plan = db.db
      .prepare(
        `EXPLAIN QUERY PLAN SELECT ${coordinatorMailContribution('m', '?')} FROM messages m WHERE m.id = ?`
      )
      .all(worker.id, next.id)
      .map((row) => String(row.detail))
    expect(
      plan.some((detail) =>
        detail.includes('run_id=? AND kind=? AND identity=? AND node=? AND start_ms<?')
      )
    ).toBe(true)
    expect(
      plan.some((detail) =>
        detail.includes('run_id=? AND kind=? AND identity=? AND node=? AND end_ms>?')
      )
    ).toBe(true)
    const overlapping = db.createTask({ spec: 'Live overlapping sender', runId })
    const live = createRootDispatch(db, overlapping.id, 'term_live', 'tab:live')
    db.db
      .prepare(
        "UPDATE dispatch_contexts SET assignee_handle = 'term_parent', assignee_pane_key = 'tab:parent', created_at = '2000-01-01T00:00:00Z' WHERE id = ?"
      )
      .run(live.id)
    expect(await prepareCoordinatorMailCount(db, worker.id, () => true)).toBe(0)
    db.db.exec('SAVEPOINT lifetime_test')
    db.db
      .prepare("UPDATE dispatch_contexts SET completed_at = '2001-01-01T00:00:00Z' WHERE id = ?")
      .run(live.id)
    expect(await prepareCoordinatorMailCount(db, worker.id, () => true)).toBe(messages + 1)
    db.db.exec('ROLLBACK TO lifetime_test; RELEASE lifetime_test')
    expect(readCoordinatorMailCount(db, worker.id)).toBe(0)
  }
)

it('preserves exact pane classes, handle fallback, canonical senders and inclusive lifetime endpoints', async () => {
  await openChat(COORDINATOR)
  const { taskId, runId } = await coordinatorRunAndTask()
  const worker = createRootDispatch(db, taskId, 'term_target', 'tab:target')
  const siblingTask = db.createTask({ spec: 'Sibling', runId })
  const sibling = createRootDispatch(
    db,
    siblingTask.id,
    'term_sender',
    'old:11111111-1111-4111-8111-111111111111'
  )
  db.db
    .prepare(
      "UPDATE dispatch_contexts SET created_at = '2020-01-01T00:00:00Z', completed_at = '2020-01-02T00:00:00Z' WHERE id = ?"
    )
    .run(sibling.id)
  const cases = [
    ['term_sender', undefined, '2020-01-01T00:00:00Z'],
    ['reminted', 'new:11111111-1111-4111-8111-111111111111', '2020-01-02T00:00:00Z'],
    [`dispatch:${sibling.id}`, 'different:pane', '2020-01-01T12:00:00Z'],
    ['term_sender', 'different:pane', '2020-01-01T12:00:00Z'],
    ['term_sender', undefined, '2019-12-31T23:59:59Z'],
    ['term_sender', undefined, '2020-01-02T00:00:01Z']
  ] as const
  for (const [from, senderPaneKey, sent] of cases) {
    const mail = db.insertMessage({
      from,
      senderPaneKey,
      to: `dispatch:${worker.id}`,
      subject: 'Sample',
      runId
    })
    db.db.prepare('UPDATE messages SET read = 1, created_at = ? WHERE id = ?').run(sent, mail.id)
  }
  expect(await prepareCoordinatorMailCount(db, worker.id, () => true)).toBe(3)
  db.db
    .prepare("UPDATE dispatch_contexts SET assignee_pane_key = 'legacy:same' WHERE id = ?")
    .run(sibling.id)
  const unequal = db.insertMessage({
    from: 'term_sender',
    senderPaneKey: 'other:same',
    to: `dispatch:${worker.id}`,
    subject: 'Malformed panes differ',
    runId
  })
  db.db
    .prepare("UPDATE messages SET read = 1, created_at = '2020-01-01T12:00:00Z' WHERE id = ?")
    .run(unequal.id)
  expect(await prepareCoordinatorMailCount(db, worker.id, () => true)).toBe(5)
})
