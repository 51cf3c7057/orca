import { expect, it, vi } from 'vitest'
import { prepareCoordinatorMailCount } from './prepared-coordinator-mail-count'
import { readCoordinatorMailCount } from './dispatch-read-mail'
import { createRootDispatch } from '../root-dispatch-test-fixture'
import {
  COORDINATOR,
  coordinatorRunAndTask,
  openChat,
  db
} from '../../terminal-authority/structured-sessions/structured-chat-coordinator-mail-rig.test-fixture'

it('keeps exact finish identities through out-of-order reads, rollback, sender changes and retirement', async () => {
  await openChat(COORDINATOR)
  const { taskId, runId } = await coordinatorRunAndTask()
  const worker = createRootDispatch(db, taskId, 'term_worker', 'tab:w')
  const first = db.insertMessage({
    from: 'term_parent',
    to: `dispatch:${worker.id}`,
    subject: 'First',
    runId
  })
  const second = db.insertMessage({
    from: 'term_parent',
    to: `dispatch:${worker.id}`,
    subject: 'Second',
    runId
  })
  db.markAsRead([second.id])
  expect(await prepareCoordinatorMailCount(db, worker.id, () => true)).toBe(1)
  db.markAsRead([first.id, second.id])
  expect(readCoordinatorMailCount(db, worker.id)).toBe(2)
  db.db.exec('SAVEPOINT count_test')
  const third = db.insertMessage({
    from: 'term_parent',
    to: `dispatch:${worker.id}`,
    subject: 'Third',
    runId
  })
  db.markAsRead([third.id])
  expect(readCoordinatorMailCount(db, worker.id)).toBe(3)
  db.db.exec('ROLLBACK TO count_test; RELEASE count_test')
  expect(readCoordinatorMailCount(db, worker.id)).toBe(2)
  // Historical sender identity can change classification, even after its Dispatch settles.
  const siblingTask = db.createTask({ spec: 'Sibling', runId })
  const sibling = createRootDispatch(db, siblingTask.id, 'term_other', 'tab:s')
  db.db
    .prepare('UPDATE dispatch_contexts SET assignee_handle = ?, created_at = ? WHERE id = ?')
    .run('term_parent', '2000-01-01 00:00:00', sibling.id)
  expect(await prepareCoordinatorMailCount(db, worker.id, () => true)).toBe(0)
  db.db
    .prepare('UPDATE dispatch_contexts SET assignee_handle = ? WHERE id = ?')
    .run('term_other', sibling.id)
  expect(await prepareCoordinatorMailCount(db, worker.id, () => true)).toBe(2)
  db.db.prepare('DELETE FROM messages WHERE id = ?').run(first.id)
  expect(readCoordinatorMailCount(db, worker.id)).toBe(1)
  db.db.prepare("UPDATE dispatch_contexts SET status = 'completed' WHERE id = ?").run(worker.id)
  expect(
    db.db.prepare('SELECT 1 FROM orca_coordinator_mail_counts WHERE dispatch_id = ?').get(worker.id)
  ).toBeUndefined()
})

it.each([
  [100, 100, 101],
  [1_000, 1_000, 1_001]
])(
  'does not re-enumerate %i historical rows on repeated stops or new mail',
  async (history, expected, afterNewMail) => {
    await openChat(COORDINATOR)
    const { taskId, runId } = await coordinatorRunAndTask()
    const worker = createRootDispatch(db, taskId, 'term_target', 'tab:t')
    for (let i = 0; i < history; i++) {
      const task = db.createTask({ spec: `Noise ${i}`, runId })
      createRootDispatch(db, task.id, `term_noise_${i}`, `tab:n${i}`)
      const mail = db.insertMessage({
        from: 'term_parent',
        to: `dispatch:${worker.id}`,
        subject: 'Old',
        runId
      })
      db.markAsRead([mail.id])
    }
    expect(await prepareCoordinatorMailCount(db, worker.id, () => true)).toBe(expected)
    let historyRows = 0
    const prepare = db.db.prepare.bind(db.db)
    vi.spyOn(db.db, 'prepare').mockImplementation((sql) => {
      const statement = prepare(sql)
      return new Proxy(statement, {
        get(target, key) {
          if (key === 'all') {
            return (...args: Parameters<typeof target.all>) => {
              const rows = target.all(...args)
              historyRows += rows.length
              return rows
            }
          }
          const value = Reflect.get(target, key)
          return typeof value === 'function' ? value.bind(target) : value
        }
      })
    })
    expect(await prepareCoordinatorMailCount(db, worker.id, () => true)).toBe(expected)
    expect(await prepareCoordinatorMailCount(db, worker.id, () => true)).toBe(expected)
    const task = db.createTask({ spec: 'Unrelated new worker', runId })
    createRootDispatch(db, task.id, 'term_unrelated_new', 'tab:new')
    expect(await prepareCoordinatorMailCount(db, worker.id, () => true)).toBe(expected)
    const mail = db.insertMessage({
      from: 'term_parent',
      to: `dispatch:${worker.id}`,
      subject: 'New',
      runId
    })
    db.markAsRead([mail.id])
    expect(await prepareCoordinatorMailCount(db, worker.id, () => true)).toBe(afterNewMail)
    expect(historyRows).toBe(0)
  }
)
