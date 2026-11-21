import { acceptedAgentStatuses } from '@/store/slices/agent-status/status-ownership/accepted-agent-statuses'
import { defineFixture } from '../../component-fixtures/component-fixture'
import { makeFolderWorkspace } from '@/store/folder-workspaces/folder-workspace.test-fixture'
import { makeTabGroup, makeUnifiedTab } from '@/store/slices/tabs/tab-group.test-fixture'
import type { AppState } from '@/store/types'
import { structuredAgentSessionStatusPaneKey } from '../../../../shared/agent-session/view/structured-agent-session-tab'
import type { AgentStatusEntry } from '../../../../shared/agent-status/contracts/agent-status-types'
import type { Bot } from '../../../../shared/bot-types'
import type { BotGroup } from '../../../../shared/bots/bot-group'
import { mascotAvatar, type BotMascotId } from '../../../../shared/bot-avatar'
import { getLineageGroupKey } from '../../../../shared/sidebar-list/sections/group-keys'
import { folderWorkspaceKey } from '../../../../shared/workspace/identity/workspace-scope'
import { BotAvatar } from './BotAvatar'
import { BotGroupRow } from './BotGroupRow'
import { BotSidebarRow } from './BotSidebarRow'

const MASCOTS: BotMascotId[] = ['F1', 'A1']

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

const members = BOTS.map((bot) => ({ botId: bot.id, sessionId: `s-${bot.id}` }))

// Listed newest first, so the lines show they sort by when each thread opened.
const THREADS: NonNullable<BotGroup['threads']> = [
  { id: 'thread-2', createdAt: 20, members, title: 'Fix the flaky sidebar test' },
  { id: 'thread-1', createdAt: 10, members, title: 'Plan the Q1 release' }
]

function team(threads: BotGroup['threads']): BotGroup {
  return {
    id: 'group-1',
    name: 'Team 0',
    hostId: 'local',
    revision: 1,
    folder: 'group-1',
    folderWorkspaceId: 'fw-group-1',
    createdAt: 1,
    members,
    threads,
    replyMode: { kind: 'all' }
  }
}

const home = makeFolderWorkspace({ id: 'fw-group-1', name: 'Team 0', folderPath: '/bots/group-1' })
const memberHomes = new Map(
  BOTS.map((bot) => [
    bot.id,
    makeFolderWorkspace({
      id: bot.folderWorkspaceId,
      name: bot.name,
      folderPath: `/bots/${bot.folder}`
    })
  ])
)
const workspace = folderWorkspaceKey(home.id)

/** The second thread's tab in front, as after opening it from its line. */
const SECOND_THREAD_IN_FRONT: Partial<AppState> = {
  activeView: 'terminal',
  activeWorkspaceKey: workspace,
  activeGroupIdByWorktree: { [workspace]: 'tabs' },
  groupsByWorktree: {
    [workspace]: [makeTabGroup({ id: 'tabs', worktreeId: workspace, activeTabId: 'room-2' })]
  },
  unifiedTabsByWorktree: {
    [workspace]: [
      makeUnifiedTab({
        id: 'room-2',
        worktreeId: workspace,
        groupId: 'tabs',
        contentType: 'room',
        entityId: 'thread-2'
      })
    ]
  }
}

function frame(group: BotGroup, isActive: boolean): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1 bg-worktree-sidebar py-1 pr-1.5 text-worktree-sidebar-foreground">
      <BotGroupRow
        group={group}
        home={home}
        members={BOTS}
        memberHomes={memberHomes}
        isActive={isActive}
        onOpen={() => {}}
        onManageMembers={() => {}}
        onDelete={() => {}}
      />
    </div>
  )
}

/** Two members on their line under the team's row, then two threads, the second one's tab in front. */
export const unfolded = defineFixture({
  width: 320,
  store: SECOND_THREAD_IN_FRONT,
  render: () => frame(team(THREADS), true)
})

/** Folded by its chevron: the members hide, the threads stay and the strip shows how many members it has. */
export const folded = defineFixture({
  width: 320,
  store: { ...SECOND_THREAD_IN_FRONT, collapsedGroups: new Set([getLineageGroupKey(workspace)]) },
  render: () => frame(team(THREADS), true)
})

/** A team with only its original room: its two members and no threads. */
export const membersOnly = defineFixture({
  width: 320,
  render: () => frame(team(undefined), false)
})

/** A bot that is in no team, with the same quiet, sleeping home as the members: it shows the moon. */
const SOLO: Bot = { ...BOTS[0], id: 'solo', name: 'Solo bot', folderWorkspaceId: 'fw-solo' }

function SoloRow(): React.JSX.Element {
  return (
    <BotSidebarRow
      avatar={<BotAvatar bot={SOLO} className="size-7 rounded-md text-xs" />}
      name={SOLO.name}
      workspaceId={folderWorkspaceKey(SOLO.folderWorkspaceId)}
      hostId="local"
      status="active"
      isUnread={false}
      isActive={false}
      onOpen={() => {}}
      onRename={async () => {}}
      age={null}
      idle
      line={null}
      hoverDetails={() => null}
      menuItems={null}
      menuFooter={null}
    />
  )
}

/** QA, A1 and A2: every member is idle, so only the team row shows "zzz"; the members' homes
 *  sleep, yet their pictures show no moon. The bot under the line is in no team and shows both. */
export const asleep = defineFixture({
  width: 320,
  render: () => (
    <div className="flex flex-col gap-1 bg-worktree-sidebar py-1 pr-1.5 text-worktree-sidebar-foreground">
      {frame(team(undefined), false)}
      <div className="border-t border-worktree-sidebar-border pt-1">
        <SoloRow />
      </div>
    </div>
  )
})

function memberTurn(bot: Bot, state: AgentStatusEntry['state']): AgentStatusEntry {
  const at = Date.now()
  return {
    paneKey: structuredAgentSessionStatusPaneKey(`home-${bot.id}`),
    worktreeId: folderWorkspaceKey(bot.folderWorkspaceId),
    agentType: 'claude',
    prompt: '',
    state,
    updatedAt: at,
    stateStartedAt: at,
    stateHistory: []
  }
}

/** QA, A1 and A2: one member works in its own home and the other waits on you, so the team row
 *  has no "zzz", and each member keeps its working or needs-you badge. */
export const awake = defineFixture({
  width: 320,
  store: {
    agentStatusByPaneKey: acceptedAgentStatuses(
      [memberTurn(BOTS[0], 'working'), memberTurn(BOTS[1], 'waiting')].map((entry) => [
        entry.paneKey,
        entry
      ])
    )
  },
  render: () => frame(team(undefined), false)
})

/** QA, A2: a member's right-click menu holds only Bot settings… and Detach from team. */
export const memberMenu = defineFixture({
  width: 320,
  render: () => frame(team(undefined), false),
  interact: async (root) => {
    // The team row's line names every member too, so match the member's own title.
    const row = [...root.querySelectorAll<HTMLElement>('[data-worktree-card-surface]')].find(
      (entry) => entry.textContent?.trim() === 'Architect#2'
    )
    const box = row?.getBoundingClientRect()
    row?.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: (box?.left ?? 0) + 60,
        clientY: (box?.top ?? 0) + 12
      })
    )
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
})
