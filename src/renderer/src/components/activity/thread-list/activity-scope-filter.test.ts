import { describe, expect, it } from 'vitest'
import type { AgentPaneThread } from '../threads/activity-thread-types'
import { filterThreadsByActivityScope, type ActivityScopeFilter } from './activity-scope-filter'

function thread(paneKey: string, worktreeId: string): AgentPaneThread {
  return { paneKey, worktree: { id: worktreeId }, repo: null } as unknown as AgentPaneThread
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
