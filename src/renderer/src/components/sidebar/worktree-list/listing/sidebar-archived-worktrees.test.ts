import { describe, expect, it } from 'vitest'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { Worktree } from '../../../../../../shared/worktree/types'
import { getWorktreeReviewCacheKeys } from '../../workspace-card/review/worktree-card-pr-derivation'
import { isArchivedByMergedReview, type MergedArchiveRuleState } from './sidebar-archived-worktrees'

const repo: Repo = { id: 'app', path: '/repos/app', displayName: 'app', badgeColor: '', addedAt: 0 }

function worktree(overrides: Partial<Worktree> = {}): Worktree {
  return {
    id: 'app::/repos/app/fix',
    repoId: repo.id,
    path: '/repos/app/fix',
    displayName: 'fix',
    branch: 'fix',
    head: 'abc123',
    isBare: false,
    isMainWorktree: false,
    comment: '',
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 0,
    ...overrides
  }
}

function mergedState(
  row: Worktree,
  overrides: Partial<MergedArchiveRuleState> = {}
): MergedArchiveRuleState {
  const { hostedReviewCacheKey } = getWorktreeReviewCacheKeys(row, repo, null)
  return {
    groupBy: 'repo',
    settings: null,
    prCache: {},
    hostedReviewCache: {
      [hostedReviewCacheKey]: {
        fetchedAt: 1,
        linkedReviewHintKey: '',
        data: {
          provider: 'github',
          number: 7,
          title: 'Fix',
          state: 'merged',
          url: 'https://github.com/example/app/pull/7',
          status: 'success',
          updatedAt: '2026-11-19T00:00:00.000Z',
          mergeable: 'UNKNOWN',
          headSha: 'abc123'
        }
      }
    },
    archiveRestoredWorkspaceKeys: new Set(),
    ...overrides
  }
}

describe('isArchivedByMergedReview', () => {
  it('files a workspace whose card shows a merged PR under Archived', () => {
    const row = worktree()
    expect(isArchivedByMergedReview(row, repo, mergedState(row))).toBe(true)
  })

  it('keeps the main checkout, pinned and restored workspaces active', () => {
    const main = worktree({ isMainWorktree: true })
    const pinned = worktree({ isPinned: true })
    const restored = worktree()
    expect(isArchivedByMergedReview(main, repo, mergedState(main))).toBe(false)
    expect(isArchivedByMergedReview(pinned, repo, mergedState(pinned))).toBe(false)
    expect(
      isArchivedByMergedReview(
        restored,
        repo,
        mergedState(restored, { archiveRestoredWorkspaceKeys: new Set(['|app::/repos/app/fix']) })
      )
    ).toBe(false)
  })

  it('applies only while the sidebar groups by project', () => {
    const row = worktree()
    expect(isArchivedByMergedReview(row, repo, mergedState(row, { groupBy: 'none' }))).toBe(false)
  })
})
