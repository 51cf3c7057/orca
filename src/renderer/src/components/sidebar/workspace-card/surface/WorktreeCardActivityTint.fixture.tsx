import React from 'react'
import { useAppStore } from '@/store'
import { defineFixture } from '../../../../component-fixtures/component-fixture'
import type { WorktreeCardProperty } from '../../../../../../shared/ui-chrome/ui-chrome-types'
import { composeWorktreeHostIdentity } from '../../../../../../shared/worktree/host-qualified-identity'
import * as rows from '../../worktree-list/rows/indentation'
import {
  FIXTURE_REPO,
  makeWorktree,
  seedWorkspaces,
  type WorkspaceSeed
} from '../../worktree-card-slot-fixture-seeds'
import WorktreeCard from './WorktreeCard'

// "Activity color": orange when an agent needs you, yellow while one works, purple otherwise.
const now = Date.now()
const SEEDS: WorkspaceSeed[] = [
  {
    id: 'at-needs',
    name: 'needs-an-answer',
    agents: [{ agentType: 'codex', state: 'blocked', minutesAgo: 2, prompt: 'Pick a plan' }],
    lastActivityMinutesAgo: 2
  },
  {
    id: 'at-working',
    name: 'refactor-in-progress',
    agents: [{ agentType: 'claude', state: 'working', minutesAgo: 1, prompt: 'Split the module' }],
    lastActivityMinutesAgo: 1
  },
  {
    id: 'at-done',
    name: 'finished-turn',
    agents: [{ agentType: 'claude', state: 'done', minutesAgo: 8, prompt: 'Fix the test' }],
    lastActivityMinutesAgo: 8
  },
  { id: 'at-empty', name: 'no-agents', agents: [], lastActivityMinutesAgo: 60 },
  {
    id: 'at-selected',
    name: 'selected-and-working',
    agents: [{ agentType: 'codex', state: 'working', minutesAgo: 3, prompt: 'Write the docs' }],
    lastActivityMinutesAgo: 3
  },
  { id: 'at-parent', name: 'collapsed-parent', agents: [], lastActivityMinutesAgo: 20 },
  {
    id: 'at-child',
    name: 'child-needs-you',
    agents: [{ agentType: 'claude', state: 'waiting', minutesAgo: 4, prompt: 'Approve the plan' }],
    lastActivityMinutesAgo: 4
  },
  {
    id: 'at-failed-working',
    name: 'one-failed-one-working',
    agents: [
      { agentType: 'codex', state: 'done', failed: true, minutesAgo: 6, prompt: 'Run the suite' },
      { agentType: 'claude', state: 'working', minutesAgo: 2, prompt: 'Fix the flaky test' }
    ],
    lastActivityMinutesAgo: 2
  },
  {
    id: 'at-open-parent',
    name: 'expanded-parent-working',
    agents: [{ agentType: 'claude', state: 'working', minutesAgo: 1, prompt: 'Plan the release' }],
    lastActivityMinutesAgo: 1
  },
  { id: 'at-open-child', name: 'quiet-child', agents: [], lastActivityMinutesAgo: 30 }
]

const worktrees = new Map(SEEDS.map((seed) => [seed.id, makeWorktree(seed, now)]))

function Card({
  id,
  isActive = false,
  descendantIds,
  expandedChildIds
}: {
  id: string
  isActive?: boolean
  descendantIds?: readonly string[]
  expandedChildIds?: readonly string[]
}): React.JSX.Element {
  const worktree = worktrees.get(id)!
  return (
    <WorktreeCard
      worktree={worktree}
      repo={FIXTURE_REPO}
      hideRepoBadge
      isActive={isActive}
      contentIndent={20}
      flushSurface
      nativeDragEnabled={false}
      lineageChildren={expandedChildIds?.map((childId) => (
        <Card key={childId} id={childId} />
      ))}
      lineageChildCount={(descendantIds ?? expandedChildIds)?.length ?? 0}
      lineageCollapsed={Boolean(descendantIds)}
      lineageDescendantIdentities={descendantIds?.map((d) =>
        composeWorktreeHostIdentity(worktrees.get(d)?.hostId, d)
      )}
      lineageChildWorktreeIds={descendantIds}
      lineageChildrenStyle={rows.getLineageChildrenInlineStyle(rows.LINEAGE_CHILDREN_INLINE_OFFSET)}
      onLineageToggle={descendantIds ? () => {} : undefined}
    />
  )
}

const TINT_ON: WorktreeCardProperty[] = ['status', 'unread', 'inline-agents', 'status-tint']

function setupFor(newCardStyle: boolean, cardProperties = TINT_ON): () => void {
  return () => {
    seedWorkspaces(SEEDS, now)
    useAppStore.setState((state) => ({
      settings: state.settings
        ? {
            ...state.settings,
            experimentalNewWorktreeCardStyle: newCardStyle,
            worktreeCardDetailsRow: true
          }
        : null,
      repos: [FIXTURE_REPO],
      worktreeCardProperties: cardProperties,
      worktreesByRepo: { [FIXTURE_REPO.id]: [...worktrees.values()] }
    }))
  }
}

const Frame = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <div className="flex flex-col gap-0.5 bg-worktree-sidebar py-1.5 text-worktree-sidebar-foreground">
    {children}
  </div>
)

const render = (): React.JSX.Element => (
  <Frame>
    <Card id="at-needs" />
    <Card id="at-working" />
    <Card id="at-done" />
    <Card id="at-empty" />
    <Card id="at-selected" isActive />
    <Card id="at-parent" descendantIds={['at-child']} />
    <Card id="at-failed-working" />
    <Card id="at-open-parent" expandedChildIds={['at-open-child']} />
  </Frame>
)

export const newCardStyle = defineFixture({ width: 320, setup: setupFor(true), render })

export const classicCardStyle = defineFixture({ width: 320, setup: setupFor(false), render })

// "Activity color" switched off in Show: today's untinted cards.
export const tintOff = defineFixture({
  width: 320,
  setup: setupFor(
    true,
    TINT_ON.filter((property) => property !== 'status-tint')
  ),
  render
})
