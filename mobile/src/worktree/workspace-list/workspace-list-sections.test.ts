import { NO_WORKSPACE_ROW_FILTERS } from '../../../../src/shared/workspace-view/workspace-row-filters'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Worktree } from './workspace-list-types'
import { NO_PROJECT_SECTION_CATALOG, buildSections } from './workspace-list-sections'
import { withoutProjectsListedElsewhere } from '../project-sections/projects-listed-elsewhere'

function worktree(overrides: Partial<Worktree> = {}): Worktree {
  const worktreePath = join('/tmp', 'orca', 'worktrees', 'feature')
  return {
    workspaceKind: 'git',
    worktreeId: `repo-1::${worktreePath}`,
    repoId: 'repo-1',
    repo: 'orca',
    branch: 'feature/mobile-parity',
    displayName: 'feature',
    path: worktreePath,
    liveTerminalCount: 0,
    hasAttachedPty: false,
    unread: false,
    isPinned: false,
    linkedPR: null,
    status: 'inactive',
    agents: [],
    ...overrides
  }
}

// A catalog of [displayName, id] repos with no project rows, as an old desktop answers.
function catalogOf(repos: readonly (readonly [string, string])[]) {
  return {
    ...NO_PROJECT_SECTION_CATALOG,
    repos: repos.map(([displayName, id]) => ({ id, displayName, path: `/repos/${id}` }))
  }
}

describe('buildSections', () => {
  it('draws no placeholder for a project whose rows another section lists', () => {
    const listedElsewhere = worktree({ repoId: 'repo-2', repo: 'lone', worktreeId: 'lone-worker' })
    const shown = [worktree({ repoId: 'repo-1', repo: 'orca' })]
    const catalog = catalogOf([
      ['orca', 'repo-1'],
      ['lone', 'repo-2']
    ])
    const sections = buildSections(
      shown,
      'manual',
      { ...NO_WORKSPACE_ROW_FILTERS },
      '',
      'repo',
      new Set(),
      withoutProjectsListedElsewhere(catalog, shown, [...shown, listedElsewhere])
    )

    expect(sections.map((section) => section.key)).toEqual(['repo:repo-1'])
  })

  it('files a merged workspace under Archived and lists a hand-archived one there too', () => {
    const main = worktree({
      isMainWorktree: true,
      displayName: 'main',
      branch: 'main',
      worktreeId: 'repo-1::main'
    })
    const merged = worktree({
      displayName: 'landed',
      worktreeId: 'repo-1::landed',
      linkedPR: { number: 4, state: 'merged' }
    })
    const archived = worktree({
      displayName: 'old',
      worktreeId: 'repo-1::old',
      isArchived: true
    })
    const sections = buildSections(
      [main, merged, archived],
      'manual',
      { ...NO_WORKSPACE_ROW_FILTERS },
      '',
      'repo',
      new Set(),
      catalogOf([['orca', 'repo-1']])
    )
    expect(sections.map((section) => section.key)).toEqual([
      'repo:repo-1',
      'archived-open:repo:repo-1'
    ])
    expect(sections[0]?.data.map((item) => item.row.displayName)).toEqual(['main'])
    expect(sections[1]?.data.map((item) => item.row.displayName)).toEqual(['landed', 'old'])
  })
})
