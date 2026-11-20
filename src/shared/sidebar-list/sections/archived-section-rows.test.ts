import { describe, expect, it } from 'vitest'
import type { Repo } from '../../repository/repo-types'
import type { Worktree } from '../../worktree/types'
import type { GroupHeaderRow, Row } from '../row-types'
import {
  collapsedGroupKeysToRevealArchivedCard,
  withArchivedSectionRows
} from './archived-section-rows'

function repo(id: string): Repo {
  return { id, path: `/repos/${id}`, displayName: id, badgeColor: '', addedAt: 0 }
}

function worktree(repoId: string, name: string): Worktree {
  return {
    id: `${repoId}::/repos/${repoId}/${name}`,
    repoId,
    path: `/repos/${repoId}/${name}`,
    displayName: name,
    branch: name,
    head: 'abc',
    isBare: false,
    isMainWorktree: false,
    comment: '',
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    isArchived: true,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 0
  }
}

function header(project: Repo): GroupHeaderRow {
  return {
    type: 'header',
    key: `repo:${project.id}`,
    count: 1,
    icon: { kind: 'project' },
    repo: project
  }
}

function item(project: Repo, name: string): Row {
  return {
    type: 'item',
    rowKey: `repo:${project.id}:${name}`,
    sectionKey: `repo:${project.id}`,
    worktree: worktree(project.id, name),
    repo: project,
    depth: 0,
    groupDepth: 0,
    isLastLineageChild: false,
    lineageChildCount: 0
  }
}

function keys(rows: readonly Row[]): string[] {
  return rows.map((row) =>
    row.type === 'item'
      ? row.rowKey
      : row.type === 'archived-section'
        ? `${row.key}(${row.count})`
        : row.type === 'header'
          ? row.key
          : row.type
  )
}

const app = repo('app')
const docs = repo('docs')
const rows = [header(app), item(app, 'live'), header(docs), item(docs, 'notes')]
const archivedWorktreesByRepo = new Map([
  [app.id, [worktree(app.id, 'old'), worktree(app.id, 'older')]]
])
const repoOf = (row: Worktree) => (row.repoId === app.id ? app : docs)

describe('withArchivedSectionRows', () => {
  it('ends the project with a folded Archived line by default', () => {
    const result = withArchivedSectionRows(rows, {
      archivedWorktreesByRepo,
      collapsedGroups: new Set(),
      repoOf
    })
    expect(keys(result)).toEqual([
      'repo:app',
      'repo:app:live',
      'archived-open:repo:app(2)',
      'repo:docs',
      'repo:docs:notes'
    ])
  })

  it('lists the archived cards once the line is opened', () => {
    const result = withArchivedSectionRows(rows, {
      archivedWorktreesByRepo,
      collapsedGroups: new Set(['archived-open:repo:app']),
      repoOf
    })
    expect(keys(result)).toEqual([
      'repo:app',
      'repo:app:live',
      'archived-open:repo:app(2)',
      'archived-open:repo:app:|app::/repos/app/old',
      'archived-open:repo:app:|app::/repos/app/older',
      'repo:docs',
      'repo:docs:notes'
    ])
  })

  it('opens a folded Archived section and expands its project for reveal', () => {
    expect(
      collapsedGroupKeysToRevealArchivedCard({
        collapsedGroups: new Set(['repo:app']),
        projectKey: 'repo:app'
      })
    ).toEqual(['repo:app', 'archived-open:repo:app'])
    expect(
      collapsedGroupKeysToRevealArchivedCard({
        collapsedGroups: new Set(['archived-open:repo:app']),
        projectKey: 'repo:app'
      })
    ).toEqual([])
  })

  it('draws nothing under a collapsed project', () => {
    const result = withArchivedSectionRows([header(app), header(docs)], {
      archivedWorktreesByRepo,
      collapsedGroups: new Set(['repo:app', 'archived-open:repo:app']),
      repoOf
    })
    expect(keys(result)).toEqual(['repo:app', 'repo:docs'])
  })
})
