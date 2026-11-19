import type { AppState } from '@/store/types'
import { getIndexedRepoMap } from '@/store/repos/repository-catalog-index'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { Worktree } from '../../../../../../shared/worktree/types'
import { getWorktreeHostIdentity } from '../../../../../../shared/worktree/host-qualified-identity'
import { createHostScopedRepoOf } from '../../../../../../shared/sidebar-list/feed/sidebar-feed-index'
import { selectWorktreeCardReviewState } from '../../workspace-card/review/worktree-card-review-resolution'
import { isSidebarArchived } from '../../worktree-list/listing/sidebar-archived-worktrees'

type ArchiveState = Pick<
  AppState,
  | 'repos'
  | 'groupBy'
  | 'hostedReviewCache'
  | 'prCache'
  | 'settings'
  | 'archiveRestoredWorkspaceKeys'
  | 'setArchiveRestoredWorkspace'
  | 'updateWorktreeMeta'
>

function repoOfRow(state: Pick<AppState, 'repos'>, worktree: Worktree): Repo | undefined {
  return createHostScopedRepoOf(state.repos, getIndexedRepoMap(state.repos))(worktree)
}

export function isWorkspaceSidebarArchived(state: ArchiveState, worktree: Worktree): boolean {
  return isSidebarArchived(worktree, repoOfRow(state, worktree), state)
}

/** Moves a row into or out of its project's Archived section. Flags only: no checkout, branch or chat is removed and no archive script runs. */
export function setWorkspaceSidebarArchived(
  state: ArchiveState,
  worktree: Worktree,
  archived: boolean
): void {
  const identity = getWorktreeHostIdentity(worktree)
  const executionHostId = worktree.hostId ?? 'local'
  if (archived) {
    state.setArchiveRestoredWorkspace(identity, false)
    if (!worktree.isArchived) {
      void state.updateWorktreeMeta(worktree.id, { isArchived: true }, { executionHostId })
    }
    return
  }
  // Restore outranks the merged rule, so a merged row stays active.
  if (selectWorktreeCardReviewState(state, worktree, repoOfRow(state, worktree)) === 'merged') {
    state.setArchiveRestoredWorkspace(identity, true)
  }
  if (worktree.isArchived) {
    void state.updateWorktreeMeta(worktree.id, { isArchived: false }, { executionHostId })
  }
}
