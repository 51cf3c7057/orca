import { describe, expect, it } from 'vitest'
import type { AgentPaneThread } from '../threads/activity-thread-types'
import { filterThreadsByActivityScope, type ActivityScopeFilter } from './activity-scope-filter'

function thread(paneKey: string, worktreeId: string): AgentPaneThread {
  return {
    paneKey,
    paneTitle: 'Chat',
    worktree: {
      id: worktreeId,
      repoId: 'repo',
      path: '/projects/home',
      head: 'abc123',
      branch: 'main',
      isBare: false,
      isMainWorktree: false,
      displayName: 'Home',
      comment: '',
      linkedIssue: null,
      linkedPR: null,
      linkedLinearIssue: null,
      isArchived: false,
      isUnread: false,
      isPinned: false,
      sortOrder: 0,
      lastActivityAt: 0
    },
    repo: null,
    tab: {
      id: `${paneKey}-tab`,
      ptyId: null,
      worktreeId,
      title: 'Codex',
      customTitle: null,
      color: null,
      sortOrder: 0,
      createdAt: 0
    },
    agentType: 'codex',
    currentAgentState: null,
    currentAgentEntry: null,
    responsePreview: '',
    latestTimestamp: 0,
    latestEvent: null,
    events: [],
    unread: false
  }
}

const scope: ActivityScopeFilter = {
  visibleHostIds: null,
  filterRepoIds: [],
  defaultHostId: 'local',
  hideWorkspacesFromOtherDevices: false,
  pairedDeviceIdsByEnvironment: new Map(),
  hideAutomationGeneratedWorkspaces: false,
  hideCliCreatedWorkspaces: false,
  hiddenWorkspaceIds: new Set(['folder:member-home'])
}

describe('filterThreadsByActivityScope with hidden workspaces', () => {
  const own = thread('pane-own', 'folder:solo-home')
  const member = thread('pane-member', 'folder:member-home')

  it("hides a team member's home threads", () => {
    const result = filterThreadsByActivityScope({
      threads: [own, member],
      scope,
      exemptPaneKey: null
    })
    expect(result.threads).toEqual([own])
    expect(result.hiddenCount).toBe(1)
  })

  it("keeps the selected pane, so a member's chat opened by a link stays listed", () => {
    const result = filterThreadsByActivityScope({
      threads: [own, member],
      scope,
      exemptPaneKey: 'pane-member'
    })
    expect(result.threads).toEqual([own, member])
    expect(result.matchingThreads).toEqual([own])
  })
})
