import { describe, expect, it } from 'vitest'
import type { PendingWorktreeCreation } from '@/lib/workspace/creation/pending-worktree-creation'
import { EMPTY_SIDEBAR_FEED_DOMAINS } from '../../../../../../shared/sidebar-feed-client/sidebar-feed-snapshot'
import { selectPendingWorktreeCreationKeys } from './pending-worktree-creation-keys'
import { withWindowCreations } from './window-worktree-creations'

const handingOff: PendingWorktreeCreation = {
  creationId: 'creation-1',
  worktreeId: 'repo 1::/work/my repo/fix',
  phase: 'creating',
  status: 'creating',
  startedAt: 1,
  indeterminate: false,
  loaderVisible: true,
  request: {
    repoId: 'repo 1',
    name: 'fix',
    setupDecision: 'inherit',
    agent: null,
    pendingFirstAgentMessageRename: false,
    note: '',
    startupPlan: null,
    quickPrompt: '',
    quickTelemetry: null
  }
}

function windowCreation(entry: PendingWorktreeCreation): unknown {
  const keys = selectPendingWorktreeCreationKeys({ [entry.creationId]: entry })
  return withWindowCreations(EMPTY_SIDEBAR_FEED_DOMAINS, keys, new Set()).creations.get(
    entry.creationId
  )
}

describe('withWindowCreations', () => {
  it('names the created worktree once main no longer lists the creation', () => {
    expect(windowCreation(handingOff)).toEqual({
      repoId: 'repo 1',
      worktreeId: 'repo 1::/work/my repo/fix'
    })
  })

  it('keeps a failed handoff as its own row', () => {
    expect(windowCreation({ ...handingOff, status: 'error' })).toEqual({ repoId: 'repo 1' })
  })
})
