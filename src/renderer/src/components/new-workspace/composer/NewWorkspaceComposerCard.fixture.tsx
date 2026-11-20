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
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <h1 className="text-base font-semibold">Create worktree</h1>
      <NewWorkspaceComposerCard
        quickAgent={null}
        onQuickAgentChange={() => {}}
        // No eligible repos: the name field then skips source searches that need a paired server.
        eligibleRepos={[]}
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
        onSmartGitHubItemSelect={() => {}}
        onSmartGitLabItemSelect={() => {}}
        onSmartBranchSelect={() => {}}
        onSmartLinearIssueSelect={() => {}}
        smartNameSelection={source}
        onClearSmartNameSelection={() => {}}
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

const base = {
  width: 520,
  store: { repos: [repo] },
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
