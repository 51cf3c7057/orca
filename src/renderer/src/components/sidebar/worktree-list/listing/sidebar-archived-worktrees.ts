import { shallow } from 'zustand/shallow'
import type { AppState } from '@/store/types'
import { getIndexedAllWorktrees } from '@/store/slices/worktrees/listing/worktree-catalog-index'
import { getIndexedRepoMap } from '@/store/repos/repository-catalog-index'
import { selectWorktreesByRepo } from '@/store/workspaces/catalog/workspace-record-fields'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { Worktree } from '../../../../../../shared/worktree/types'
import { getWorktreeHostIdentity } from '../../../../../../shared/worktree/host-qualified-identity'
import { createHostScopedRepoOf } from '../../../../../../shared/sidebar-list/feed/sidebar-feed-index'
import { selectWorktreeCardReviewState } from '../../workspace-card/review/worktree-card-review-resolution'

export type MergedArchiveRuleState = Pick<
  AppState,
  'groupBy' | 'hostedReviewCache' | 'prCache' | 'settings' | 'archiveRestoredWorkspaceKeys'
>

/** Project grouping files a merged-PR workspace under Archived, unless it is the main checkout, pinned or restored. */
export function isArchivedByMergedReview(
  worktree: Worktree,
  repo: Repo | undefined,
  state: MergedArchiveRuleState
): boolean {
  return (
    state.groupBy === 'repo' &&
    !worktree.isMainWorktree &&
    !worktree.isPinned &&
    !state.archiveRestoredWorkspaceKeys.has(getWorktreeHostIdentity(worktree)) &&
    // The card's own PR state, so the section agrees with the row's PR icon.
    selectWorktreeCardReviewState(state, worktree, repo) === 'merged'
  )
}

export function isSidebarArchived(
  worktree: Worktree,
  repo: Repo | undefined,
  state: MergedArchiveRuleState
): boolean {
  return worktree.isArchived || isArchivedByMergedReview(worktree, repo, state)
}

const NO_IDENTITIES: ReadonlySet<string> = new Set()

/** Host identities the merged rule archives; keeps its identity while the members are unchanged. */
export function createMergedArchiveIdentitiesSelector(): (state: AppState) => ReadonlySet<string> {
  let inputs: readonly unknown[] = []
  let result = NO_IDENTITIES
  return (state) => {
    const worktreesByRepo = selectWorktreesByRepo(state)
    const nextInputs = [
      state.groupBy,
      worktreesByRepo,
      state.repos,
      state.hostedReviewCache,
      state.prCache,
      state.settings,
      state.archiveRestoredWorkspaceKeys
    ]
    if (shallow(inputs, nextInputs)) {
      return result
    }
    inputs = nextInputs
    if (state.groupBy !== 'repo') {
      result = NO_IDENTITIES
      return result
    }
    const repoOf = createHostScopedRepoOf(state.repos, getIndexedRepoMap(state.repos))
    const next = new Set<string>()
    for (const worktree of getIndexedAllWorktrees(worktreesByRepo)) {
      if (!worktree.isArchived && isArchivedByMergedReview(worktree, repoOf(worktree), state)) {
        next.add(getWorktreeHostIdentity(worktree))
      }
    }
    if (next.size !== result.size || [...next].some((identity) => !result.has(identity))) {
      result = next.size === 0 ? NO_IDENTITIES : next
    }
    return result
  }
}

/** Each project's archived rows, most recently active first. */
export function groupArchivedWorktreesByRepo(
  worktrees: readonly Worktree[]
): ReadonlyMap<string, readonly Worktree[]> {
  const byRepo = new Map<string, Worktree[]>()
  for (const worktree of [...worktrees].sort((a, b) => b.lastActivityAt - a.lastActivityAt)) {
    const list = byRepo.get(worktree.repoId)
    if (list) {
      list.push(worktree)
    } else {
      byRepo.set(worktree.repoId, [worktree])
    }
  }
  return byRepo
}
