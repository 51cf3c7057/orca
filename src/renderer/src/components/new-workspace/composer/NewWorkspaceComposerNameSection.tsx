import React from 'react'
import { AlertTriangle } from 'lucide-react'
import SmartWorkspaceNameField from '@/components/new-workspace/SmartWorkspaceNameField'
import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import { ComposerBranchChoice } from '../branch-selection/ComposerBranchChoice'
import type { NewWorkspaceComposerCardProps } from './new-workspace-composer-card-props'

type NewWorkspaceComposerNameSectionProps = Pick<
  NewWorkspaceComposerCardProps,
  | 'nameInputRef'
  | 'eligibleRepos'
  | 'selectedRepo'
  | 'repoId'
  | 'onRepoChange'
  | 'name'
  | 'onNameValueChange'
  | 'onSmartGitHubItemSelect'
  | 'onSmartGitLabItemSelect'
  | 'onSmartBranchSelect'
  | 'onSmartLinearIssueSelect'
  | 'onSmartJiraIssueSelect'
  | 'onOpenJiraSettings'
  | 'smartNameSelection'
  | 'onClearSmartNameSelection'
  | 'smartNameGitHubSourceContext'
  | 'smartNameJiraSourceContext'
  | 'selectedRepoRequiresConnection'
  | 'selectedRepoIsGit'
  | 'branchesEnabled'
  | 'repoBackedSourcesDisabled'
  | 'repoBackedSearchRepos'
  | 'allowSmartNameAddProject'
  | 'smartNameRepoSwitchTarget'
  | 'onSmartNameModeChange'
  | 'forkPushWarning'
  | 'canReuseSelectedBranch'
  | 'reuseSelectedBranch'
  | 'reuseEligibleBranch'
  | 'branchNameOverride'
  | 'onBranchNameOverrideChange'
  | 'onReuseSelectedBranchChange'
  | 'onOpenSelectedBranchWorkspace'
> & {
  onNamePlainEnter: () => void
}

export function NewWorkspaceComposerNameSection({
  nameInputRef,
  eligibleRepos,
  selectedRepo,
  repoId,
  onRepoChange,
  name,
  onNameValueChange,
  onSmartGitHubItemSelect,
  onSmartGitLabItemSelect,
  onSmartBranchSelect,
  onSmartLinearIssueSelect,
  onSmartJiraIssueSelect,
  onOpenJiraSettings,
  smartNameSelection,
  onClearSmartNameSelection,
  smartNameGitHubSourceContext,
  smartNameJiraSourceContext,
  selectedRepoRequiresConnection,
  selectedRepoIsGit,
  branchesEnabled = true,
  repoBackedSourcesDisabled = false,
  repoBackedSearchRepos,
  allowSmartNameAddProject = true,
  smartNameRepoSwitchTarget = 'project',
  onSmartNameModeChange,
  onNamePlainEnter,
  forkPushWarning,
  canReuseSelectedBranch,
  reuseSelectedBranch,
  reuseEligibleBranch,
  branchNameOverride,
  onBranchNameOverrideChange,
  onReuseSelectedBranchChange,
  onOpenSelectedBranchWorkspace
}: NewWorkspaceComposerNameSectionProps): React.JSX.Element {
  const t = useTranslate()
  return (
    <div className="min-w-0 space-y-1" data-contextual-tour-target="workspace-creation-name">
      <label className="block min-w-0 truncate text-xs font-medium text-muted-foreground">
        {selectedRepoIsGit
          ? t(
              'auto.components.NewWorkspaceComposerCard.nameOrExistingWork',
              'Name or existing work'
            )
          : t('auto.components.NewWorkspaceComposerCard.0ee17638fe', 'Workspace name')}{' '}
        <span className="text-muted-foreground/70">
          {t('auto.components.NewWorkspaceComposerCard.0c5d6a479c', '[Optional]')}
        </span>
      </label>
      <SmartWorkspaceNameField
        inputRef={nameInputRef}
        repos={eligibleRepos}
        selectedRepo={selectedRepo}
        repoId={repoId}
        onRepoChange={onRepoChange}
        value={name}
        onValueChange={onNameValueChange}
        onGitHubItemSelect={onSmartGitHubItemSelect}
        onGitLabItemSelect={onSmartGitLabItemSelect}
        onBranchSelect={onSmartBranchSelect}
        onLinearIssueSelect={onSmartLinearIssueSelect}
        onJiraIssueSelect={onSmartJiraIssueSelect}
        onOpenJiraSettings={onOpenJiraSettings}
        selectedSource={smartNameSelection}
        onClearSelectedSource={onClearSmartNameSelection}
        githubSourceContext={smartNameGitHubSourceContext}
        jiraSourceContext={smartNameJiraSourceContext}
        disabled={selectedRepoRequiresConnection}
        disabledPlaceholder={t(
          'auto.components.NewWorkspaceComposerCard.connectProjectFirst',
          'Connect this project first'
        )}
        textOnly={!selectedRepoIsGit}
        branchesEnabled={branchesEnabled}
        repoBackedSourcesDisabled={repoBackedSourcesDisabled}
        repoBackedSearchRepos={repoBackedSearchRepos}
        allowCrossRepoProjectAdd={allowSmartNameAddProject}
        crossRepoSwitchTarget={smartNameRepoSwitchTarget}
        onActiveSourceModeChange={onSmartNameModeChange}
        onPlainEnter={onNamePlainEnter}
      />
      {forkPushWarning ? (
        <p className="flex items-start gap-1.5 text-[11px] text-yellow-600 dark:text-yellow-500">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          <span>{forkPushWarning}</span>
        </p>
      ) : null}
      <div
        className={cn(
          'grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
          canReuseSelectedBranch ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
        aria-hidden={!canReuseSelectedBranch}
        inert={!canReuseSelectedBranch}
      >
        <div className="min-h-0">
          <div className="pt-3">
            <ComposerBranchChoice
              existingBranchName={reuseEligibleBranch ?? smartNameSelection?.label}
              reuseSelectedBranch={reuseSelectedBranch}
              onReuseSelectedBranchChange={onReuseSelectedBranchChange}
              branchNameOverride={branchNameOverride}
              onBranchNameOverrideChange={onBranchNameOverrideChange}
              onOpenSelectedBranchWorkspace={onOpenSelectedBranchWorkspace}
              disabled={!canReuseSelectedBranch}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
