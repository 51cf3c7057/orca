import { defineFixture } from '../../component-fixtures/component-fixture'
import type { Bot } from '../../../../shared/bot-types'
import { mascotAvatar, type BotMascotId } from '../../../../shared/bot-avatar'
import { botGroupFaces } from '../../../../shared/bots/bot-group-face-layout'
import { BotAvatar } from './BotAvatar'
import { BotGroupFaceCluster } from './BotGroupFaceCluster'
import { BotGroupFaces } from './BotGroupFaces'

const MASCOTS: BotMascotId[] = ['F1', 'A1', 'M1', 'T1', 'Q1']

const BOTS: Bot[] = MASCOTS.map((mascot, index) => ({
  id: `bot-${index}`,
  name: `Architect#${index + 1}`,
  hostId: 'local',
  folder: `bot-${index}`,
  folderWorkspaceId: `fw-bot-${index}`,
  agent: 'claude',
  avatar: mascotAvatar(mascot),
  paused: false,
  notifications: { needsPermission: true, taskComplete: true, couldNotFinish: true },
  members: [],
  slack: null,
  linear: null,
  github: null,
  chatSessionId: 'home',
  sidebarOrder: index,
  createdAt: 1,
  updatedAt: 1
}))

const COUNTS = [1, 2, 3, 5]

/** Group rows as the sidebar draws them, under a bot row so the names can be compared. */
export const sidebarRows = defineFixture({
  width: 320,
  render: () => (
    <div className="flex flex-col gap-3 bg-worktree-sidebar p-3 text-worktree-sidebar-foreground">
      <div className="flex items-center">
        <span className="mr-2 flex shrink-0">
          <BotAvatar bot={BOTS[0]!} className="size-9 rounded-md text-sm" />
        </span>
        <span className="text-[13px]">Architect#1 (bot row)</span>
      </div>
      {COUNTS.map((count) => (
        <div key={count} className="flex items-center">
          <span className="mr-2 flex shrink-0">
            <BotGroupFaces faces={botGroupFaces(BOTS.slice(0, count), (bot) => bot.id)} slot={36} />
          </span>
          <span className="text-[13px]">Group of {count}</span>
        </div>
      ))}
    </div>
  )
})

/** The group panel's header picture, as in the owner's screenshot; the pair's button has keyboard focus. */
export const panelHeader = defineFixture({
  width: 320,
  interact: (frame) => frame.querySelectorAll('button')[1]?.focus(),
  render: () => (
    <div className="flex flex-col gap-3 bg-background p-3 text-foreground">
      {COUNTS.map((count) => (
        <div key={count} className="flex items-center gap-2.5">
          <button
            type="button"
            className="relative h-9 shrink-0 rounded-[9px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:ring-1 data-[state=open]:ring-ring"
          >
            <BotGroupFaces faces={botGroupFaces(BOTS.slice(0, count), (bot) => bot.id)} slot={36} />
          </button>
          <span className="text-sm font-semibold">Team 0, {count} members</span>
        </div>
      ))}
    </div>
  )
})

/** Manage members' live picture with two and three bots picked, after its pop-in settles. */
export const membersDialog = defineFixture({
  width: 480,
  interact: () => new Promise((resolve) => setTimeout(resolve, 700)),
  render: () => (
    <div className="flex flex-col gap-4 bg-dialog-surface p-4">
      {[2, 3].map((count) => (
        <div key={count} className="flex h-32 items-center justify-center">
          <BotGroupFaceCluster members={BOTS.slice(0, count)} />
        </div>
      ))}
    </div>
  )
})
