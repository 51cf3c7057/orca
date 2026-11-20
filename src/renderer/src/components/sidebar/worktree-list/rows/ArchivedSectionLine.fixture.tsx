import React, { useState } from 'react'
import { useAppStore } from '@/store'
import { defineFixture } from '../../../../component-fixtures/component-fixture'
import {
  FIXTURE_REPO,
  makeWorktree,
  seedWorkspaces,
  type WorkspaceSeed
} from '../../worktree-card-slot-fixture-seeds'
import WorktreeCard from '../../workspace-card/surface/WorktreeCard'
import { ArchivedSectionLine } from './ArchivedSectionLine'

// A project's active card, then its Archived line folded or open over two archived cards.
const now = Date.now()
const ACTIVE: WorkspaceSeed = {
  id: 'ar-active',
  name: 'sidebar-archive-section',
  agents: [{ agentType: 'claude', state: 'working', minutesAgo: 1, prompt: 'Build it' }],
  pr: { number: 412, state: 'open' },
  lastActivityMinutesAgo: 1
}
const ARCHIVED: WorkspaceSeed[] = [
  {
    id: 'ar-merged',
    name: 'fix-chat-picker-rows',
    agents: [],
    pr: { number: 398, state: 'merged' },
    lastActivityMinutesAgo: 3 * 60
  },
  {
    id: 'ar-closed',
    name: 'try-plugin-icons',
    agents: [],
    pr: { number: 377, state: 'closed' },
    lastActivityMinutesAgo: 2 * 24 * 60
  }
]

function setup(): void {
  seedWorkspaces([ACTIVE, ...ARCHIVED], now)
  useAppStore.setState({ worktreeCardProperties: ['status', 'pr', 'inline-agents'] })
}

function Card({ seed }: { seed: WorkspaceSeed }): React.JSX.Element {
  return (
    <WorktreeCard
      worktree={makeWorktree(seed, now)}
      repo={FIXTURE_REPO}
      hideRepoBadge
      isActive={false}
      contentIndent={20}
      flushSurface
      nativeDragEnabled={false}
    />
  )
}

function Preview({ initiallyOpen }: { initiallyOpen: boolean }): React.JSX.Element {
  const [open, setOpen] = useState(initiallyOpen)
  return (
    <div className="flex flex-col gap-0.5 bg-worktree-sidebar py-1.5 text-worktree-sidebar-foreground">
      <Card seed={ACTIVE} />
      <ArchivedSectionLine
        count={ARCHIVED.length}
        open={open}
        repoDisplayName={FIXTURE_REPO.displayName}
        onToggle={() => setOpen(!open)}
      />
      {open ? ARCHIVED.map((seed) => <Card key={seed.id} seed={seed} />) : null}
    </div>
  )
}

export const folded = defineFixture({
  width: 300,
  setup,
  render: () => <Preview initiallyOpen={false} />
})
export const open = defineFixture({
  width: 300,
  setup,
  render: () => <Preview initiallyOpen />
})
export const narrowSidebar = defineFixture({ ...folded, width: 200 })
