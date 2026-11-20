import { useState } from 'react'
import { defineFixture } from '../../../component-fixtures/component-fixture'
import type { NewWorkspaceProjectOption } from '@/lib/workspace/creation/new-workspace-project-options'
import type { ProjectHostSetupOption } from '@/lib/workspace/creation/project-host-setup-options'
import type { SmartWorkspaceNameSelection } from '../name-field/smart-workspace-name-field-model'
import NewWorkspaceComposerCard from './NewWorkspaceComposerCard'

const repo = { id: 'orca-local', path: '/repo', displayName: 'orca', badgeColor: '', addedAt: 0 }
const projects: NewWorkspaceProjectOption[] = [
  {
    kind: 'project',
    id: 'orca',
    projectId: 'orca',
    displayName: 'orca',
    badgeColor: 'var(--muted-foreground)',
    detail: 'stablyai/orca'
  }
]
const hosts: ProjectHostSetupOption[] = [
  {
    kind: 'ready',
    id: 'local',
    projectId: 'orca',
    repoId: repo.id,
    hostId: 'local',
    label: 'Local Mac',
    detail: 'Local',
    path: repo.path
  }
]

function ComposerPreview({
  initialAdvancedOpen = false,
  source = null
}: {
  initialAdvancedOpen?: boolean
  source?: SmartWorkspaceNameSelection | null
}): React.JSX.Element {
  const [advancedOpen, setAdvancedOpen] = useState(initialAdvancedOpen)
  const [name, setName] = useState('')
  const [baseBranch, setBaseBranch] = useState<string | undefined>()
  const [note, setNote] = useState('')
  const [linked, setLinked] = useState(source)
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <h1 className="text-base font-semibold">Create worktree</h1>
      <NewWorkspaceComposerCard
        quickAgent={null}
        onQuickAgentChange={() => {}}
        eligibleRepos={[]}
        selectedRepo={repo}
        repoId={repo.id}
        projectOptions={projects}
        selectedProjectId="orca"
        selectedRepoIsGit
        onRepoChange={() => {}}
        onProjectChange={() => {}}
        projectHostSetupOptions={hosts}
        selectedProjectHostSetupId="local"
        selectedRepoExecutionHostId="local"
        primaryActionLabel="Create"
        name={name}
        onNameValueChange={setName}
        branchNameOverride={undefined}
        onBranchNameOverrideChange={() => {}}
        baseBranch={baseBranch}
        onBaseBranchChange={setBaseBranch}
        onSmartGitHubItemSelect={(item) =>
          setLinked({ kind: 'github-issue', label: `#${item.number} ${item.title}`, url: item.url })
        }
        onSmartGitLabItemSelect={() => {}}
        onSmartBranchSelect={() => {}}
        onSmartLinearIssueSelect={() => {}}
        smartNameSelection={linked}
        onClearSmartNameSelection={() => setLinked(null)}
        canReuseSelectedBranch={false}
        reuseSelectedBranch={false}
        onReuseSelectedBranchChange={() => {}}
        forkPushWarning={null}
        detectedAgentIds={null}
        onOpenAgentSettings={() => {}}
        advancedOpen={advancedOpen}
        setupChoiceRevealRequest={0}
        onSetupChoiceRevealed={() => {}}
        onToggleAdvanced={() => setAdvancedOpen((open) => !open)}
        createDisabled={false}
        projectError={null}
        creating={false}
        onCreate={() => {}}
        note={note}
        onNoteChange={setNote}
        setupConfig={null}
        requiresExplicitSetupChoice={false}
        setupDecision={null}
        onSetupDecisionChange={() => {}}
        setupAgentStartupPolicy="start-immediately"
        onSetupAgentStartupPolicyChange={() => {}}
        shouldWaitForSetupCheck={false}
        resolvedSetupDecision={null}
        createError={null}
        selectedRepoConnectionId={null}
        selectedRepoSshStatus={null}
        selectedRepoRequiresConnection={false}
        selectedRepoConnectInProgress={false}
        onConnectSelectedRepo={async () => {}}
        canUseSparseCheckout={false}
        sparsePresets={[]}
        sparseSelectedPresetId={null}
        onSparseSelectPreset={() => {}}
        sparseControlsEnabled={false}
      />
    </div>
  )
}

function openIssue(number: number, title: string) {
  return {
    id: `issue-${number}`,
    type: 'issue' as const,
    number,
    title,
    state: 'open' as const,
    url: `https://github.com/example/orca/issues/${number}`,
    labels: [],
    updatedAt: '2026-11-20T10:00:00Z',
    author: null,
    repoId: repo.id
  }
}
const openIssues = [
  openIssue(128, 'Sidebar tint is too strong in the light theme'),
  openIssue(131, 'Archived section loses its fold state after restart'),
  openIssue(137, 'Create worktree: remember the last base branch')
]

const base = {
  width: 520,
  store: { repos: [repo], fetchWorkItems: async () => openIssues },
  setup: () => {
    window.api.repos.getBaseRefDefault = async () => ({
      defaultBaseRef: 'origin/main',
      remoteCount: 1
    })
  }
}

export const simple = defineFixture({ ...base, render: () => <ComposerPreview /> })
export const advanced = defineFixture({
  ...base,
  render: () => <ComposerPreview initialAdvancedOpen />
})
export const openedFromPullRequest = defineFixture({
  ...base,
  render: () => (
    <ComposerPreview
      source={{ kind: 'github-pr', label: '#42 Simplify the create worktree dialog' }}
    />
  )
})
export const narrow = defineFixture({ ...base, width: 340, render: () => <ComposerPreview /> })

async function openIssueMenu(frame: HTMLElement): Promise<void> {
  frame.querySelector<HTMLButtonElement>('button[aria-label^="GitHub issue"]')?.click()
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Issue fixture did not load')), 5000)
    const check = (): void => {
      if (document.querySelectorAll('[cmdk-item]').length >= openIssues.length) {
        clearTimeout(timeout)
        resolve()
      } else {
        requestAnimationFrame(check)
      }
    }
    check()
  })
}

const withIssues = {
  ...base,
  render: () => <ComposerPreview initialAdvancedOpen />
}
export const agentIssueMenu = defineFixture({ ...withIssues, interact: openIssueMenu })
export const agentIssueChosen = defineFixture({
  ...withIssues,
  interact: async (frame) => {
    await openIssueMenu(frame)
    document.querySelector<HTMLElement>('[cmdk-item]')?.click()
  }
})
