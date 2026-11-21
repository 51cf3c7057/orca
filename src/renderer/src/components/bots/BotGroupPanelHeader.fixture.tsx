import { defineFixture } from '../../component-fixtures/component-fixture'
import { makeFolderWorkspace } from '@/store/folder-workspaces/folder-workspace.test-fixture'
import type { Bot } from '../../../../shared/bot-types'
import type { BotGroup } from '../../../../shared/bots/bot-group'
import { mascotAvatar, type BotMascotId } from '../../../../shared/bot-avatar'
import { stubBots } from '../../component-fixtures/fixture-bots'
import { ConfirmationDialogProvider } from '../dismiss/confirmation/confirmation-dialog'
import { BotGroupPanelHeader } from './BotGroupPanelHeader'

// A fixed clock, so render stays pure.
const NOW = 1_763_700_000_000

const MASCOTS: BotMascotId[] = ['F1', 'A1', 'B1']

const BOTS: Bot[] = MASCOTS.map((mascot, index) => ({
  id: `bot-${index}`,
  name: ['Architect', 'Reviewer', 'Release manager'][index],
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

function team(members: readonly Bot[]): BotGroup {
  return {
    id: 'group-1',
    name: 'Team 0',
    hostId: 'local',
    revision: 1,
    folder: 'group-1',
    folderWorkspaceId: 'fw-group-1',
    createdAt: 1,
    members: members.map((bot) => ({ botId: bot.id, sessionId: `s-${bot.id}` })),
    replyMode: { kind: 'all' }
  }
}

const store = {
  folderWorkspaces: BOTS.map((bot) =>
    makeFolderWorkspace({
      id: bot.folderWorkspaceId,
      name: bot.name,
      folderPath: `/bots/${bot.folder}`
    })
  )
}

function Header({ members }: { members: readonly Bot[] }): React.JSX.Element {
  return (
    <ConfirmationDialogProvider>
      <div className="@container bg-background text-foreground">
        <BotGroupPanelHeader
          group={team(members)}
          members={members}
          needsYou={0}
          working={0}
          next={null}
          now={NOW}
          filter={null}
        />
      </div>
    </ConfirmationDialogProvider>
  )
}

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function openMembers(root: HTMLElement): Promise<void> {
  root.querySelector('button[aria-label^="Members:"]')?.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerType: 'mouse'
    })
  )
  await settle(150)
}

async function openMemberSubmenu(root: HTMLElement, name: string): Promise<void> {
  await openMembers(root)
  const trigger = [
    ...document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-sub-trigger"]')
  ].find((entry) => entry.textContent?.includes(name))
  trigger?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }))
  trigger?.click()
  await settle(200)
}

/** QA, S4: each member keeps its picture, name and line and opens no Home; its submenu offers only Bot settings… and Detach from team. */
export const memberSubmenu = defineFixture({
  width: 520,
  store,
  setup: () => stubBots(BOTS),
  render: () => <Header members={BOTS} />,
  interact: (root) => openMemberSubmenu(root, 'Reviewer')
})

/** QA, A3: a team's only member can't be detached, and the item says why. */
export const onlyMemberSubmenu = defineFixture({
  width: 520,
  store,
  setup: () => stubBots(BOTS),
  render: () => <Header members={BOTS.slice(0, 1)} />,
  interact: (root) => openMemberSubmenu(root, 'Architect')
})
