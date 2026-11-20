import { defineFixture } from '../../component-fixtures/component-fixture'
import { stubBots } from '../../component-fixtures/fixture-bots'
import type { Bot } from '../../../../shared/bot-types'
import type { BotCreateOffer } from '../../../../shared/bots/bot-proposal'
import { NewBotDialog } from '../bots/NewBotDialog'
import { NativeChatBotCreateOfferCard } from './NativeChatBotCreateOfferCard'

function makeBot(id: string, name: string, createdAt: number, avatar: string | null = null): Bot {
  return {
    id,
    name,
    hostId: 'local',
    folder: id,
    folderWorkspaceId: `fw-${id}`,
    agent: 'claude',
    avatar,
    paused: false,
    notifications: { needsPermission: true, taskComplete: true, couldNotFinish: true },
    members: [],
    slack: null,
    linear: null,
    github: null,
    chatSessionId: null,
    createdAt,
    updatedAt: createdAt
  }
}

const atlas = makeBot('atlas', 'Atlas', 1)

const cutter: BotCreateOffer = {
  botId: atlas.id,
  offerId: 'offer-cutter',
  offeredAt: 1000,
  proposal: {
    name: 'Cutter',
    purpose: 'Tracks what’s blocking the 1.5 release.',
    watches: 'PRs and checks for milestone 1.5',
    does: 'Keep a short readiness list: failing checks, PRs waiting for review, open blockers.',
    reports: 'Here, weekday mornings',
    templateId: 'release',
    mascot: 'P3',
    worktrees: [
      { id: 'w1', name: 'release-checklist' },
      { id: 'w2', name: 'mobile-keyboard-fix' },
      { id: 'w3', name: 'changelog-1-5' }
    ]
  }
}

const ledger: BotCreateOffer = {
  botId: atlas.id,
  offerId: 'offer-ledger',
  offeredAt: 1000,
  proposal: { name: 'Ledger', purpose: 'Keeps the monthly spend sheet up to date.', mascot: 'D1' }
}

const scout: BotCreateOffer = {
  botId: atlas.id,
  offerId: 'offer-scout',
  offeredAt: 1000,
  proposal: { name: 'Scout', purpose: 'Reads new papers on retrieval.', mascot: 'H1' }
}

function stub(bots: Bot[]): () => void {
  return () => stubBots(bots)
}

function Cards({ offers }: { offers: BotCreateOffer[] }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 p-4">
      {offers.map((offer, index) => (
        <NativeChatBotCreateOfferCard
          key={offer.proposal.name}
          offer={offer}
          messageId={`offer-${index}`}
          fallback=""
        />
      ))}
    </div>
  )
}

const expand = async (frame: HTMLElement): Promise<void> => {
  frame.querySelector<HTMLButtonElement>('button[aria-expanded]')?.click()
  await new Promise((resolve) => setTimeout(resolve, 400))
}

export const offer = defineFixture({
  width: 640,
  setup: stub([atlas]),
  render: () => <Cards offers={[cutter, ledger]} />
})

export const offerOpen = defineFixture({
  width: 640,
  setup: stub([atlas]),
  render: () => <Cards offers={[cutter]} />,
  interact: expand
})

const accepted = { ...atlas, acceptedOffers: [{ offerId: 'offer-cutter', botId: 'cutter' }] }
const cutterBot = makeBot('cutter', 'Cutter', 2000, 'mascot:P3')

// Just created: its first turn hasn't taken the workspaces over yet.
export const created = defineFixture({
  width: 640,
  setup: stub([accepted, cutterBot]),
  render: () => <Cards offers={[cutter]} />
})

// Two of the three are under it now.
export const createdTakingOver = defineFixture({
  width: 640,
  setup: stub([accepted, cutterBot]),
  store: {
    workspaceLineageByChildKey: Object.fromEntries(
      ['w1', 'w2'].map((id) => [
        `worktree:${id}`,
        {
          childWorkspaceKey: `worktree:${id}`,
          childInstanceId: null,
          parentWorkspaceKey: `folder:${cutterBot.folderWorkspaceId}`,
          parentInstanceId: null,
          origin: 'orchestration' as const,
          capture: { source: 'orchestration-context' as const, confidence: 'explicit' as const },
          createdAt: 3000
        }
      ])
    )
  },
  render: () => <Cards offers={[cutter]} />
})

export const nameTaken = defineFixture({
  width: 640,
  setup: stub([atlas, makeBot('scout', 'Scout', 10, 'mascot:H1')]),
  render: () => <Cards offers={[scout]} />
})

export const offerPhone = defineFixture({
  width: 380,
  setup: stub([atlas]),
  render: () => <Cards offers={[cutter]} />
})

export const offerOpenPhone = defineFixture({
  width: 380,
  setup: stub([atlas]),
  render: () => <Cards offers={[cutter]} />,
  interact: expand
})

// Edit: New bot, prefilled from the card.
export const edit = defineFixture({
  width: 720,
  setup: stub([atlas]),
  render: () => (
    <div className="h-[760px] bg-background">
      <NewBotDialog
        open
        onOpenChange={() => {}}
        proposal={cutter.proposal}
        origin="From Release coordinator, proposed by Atlas"
      />
    </div>
  )
})

export const editPhone = defineFixture({
  width: 390,
  setup: stub([atlas]),
  render: () => (
    <div className="h-[820px] bg-background">
      <NewBotDialog
        open
        onOpenChange={() => {}}
        proposal={cutter.proposal}
        origin="From Release coordinator, proposed by Atlas"
      />
    </div>
  )
})

export const notNow = defineFixture({
  width: 640,
  setup: stub([{ ...atlas, offerAnswers: [{ cardId: 'offer-0', dismissed: true }] }]),
  render: () => <Cards offers={[cutter]} />
})

const harbor = makeBot('harbor', 'Harbor', 1)
const scoutSource = { ...makeBot('scout', 'Scout', 5, 'mascot:H1'), launch: { model: 'opus' } }

// orca bot clone --offer: a clone of Scout, proposed by Harbor.
const scoutClone: BotCreateOffer = {
  botId: harbor.id,
  offerId: 'offer-scout-clone',
  offeredAt: 1000,
  proposal: {
    name: 'Scout 2',
    purpose: 'A clone of Scout: its traits, none of its work.',
    mascot: 'D1',
    cloneFrom: { botId: scoutSource.id, name: scoutSource.name }
  }
}

// orca bot create --offer --soul-file: no clone, a soul text of 3 lines.
const harborDocs: BotCreateOffer = {
  botId: harbor.id,
  offerId: 'offer-harbor-docs',
  offeredAt: 1000,
  proposal: {
    name: 'Harbor Docs',
    purpose: 'Keeps the user guide in step with each release.',
    watches: 'Merged pull requests that change a setting or a command',
    mascot: 'B1',
    soul: '# Harbor Docs\n\nKeeps the user guide in step with each release.\n'
  }
}

export const cloneOpen = defineFixture({
  width: 640,
  setup: stub([harbor, scoutSource]),
  render: () => <Cards offers={[scoutClone]} />,
  interact: expand
})

export const cloneOpenPhone = defineFixture({
  width: 380,
  setup: stub([harbor, scoutSource]),
  render: () => <Cards offers={[scoutClone]} />,
  interact: expand
})

export const soulOpen = defineFixture({
  width: 640,
  setup: stub([harbor]),
  render: () => <Cards offers={[harborDocs]} />,
  interact: expand
})

// Edit on the clone card: the dialog in clone mode, with the card's name.
export const cloneEdit = defineFixture({
  width: 720,
  setup: stub([harbor, scoutSource]),
  render: () => (
    <div className="h-[720px] bg-background">
      <NewBotDialog
        open
        onOpenChange={() => {}}
        proposal={scoutClone.proposal}
        origin="Proposed by Harbor"
        cloneFrom={{ ...scoutSource, hostId: 'local' }}
      />
    </div>
  )
})
